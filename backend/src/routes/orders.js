import { Router } from 'express';
import crypto from 'node:crypto';
import { Prisma } from '../generated/prisma/client.ts';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { HttpError, asyncHandler, serializeOrder } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { notifyAdmins, notifyUsers } from '../lib/notifications.js';
import { sendDiscordNotification } from '../lib/discord.js';

const router = Router();
router.use(requireAuth);

const orderInclude = {
  items: true,
  user: { select: { id: true, username: true, email: true } },
  statusHistory: { include: { changedBy: { select: { username: true, role: true } } }, orderBy: { createdAt: 'asc' } },
};

const orderListInclude = {
  items: true,
  user: { select: { username: true } },
};

const createOrderSchema = z.object({
  items: z.array(z.object({ resourceId: z.string().min(1), quantity: z.coerce.number().int().min(1).max(100_000) })).min(1).max(50),
  notes: z.string().trim().max(500).optional().default(''),
}).refine((data) => new Set(data.items.map((item) => item.resourceId)).size === data.items.length, {
  message: 'Resource yang sama tidak boleh dimasukkan dua kali.', path: ['items'],
});

function makeOrderNumber() {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  return `FR-${ymd}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

// Reserve stock in the same transaction that creates the pending order.
// Conditional updates prevent two concurrent requests from overselling inventory.
async function reserveOrderItems(tx, items, orderId, userId, orderNumber) {
  const movements = [];
  for (const item of items) {
    const changed = await tx.resource.updateMany({
      where: { id: item.resourceId, isActive: true, stockAvailable: { gte: item.quantity } },
      data: { stockAvailable: { decrement: item.quantity }, stockReserved: { increment: item.quantity } },
    });
    if (changed.count !== 1) {
      const current = await tx.resource.findUnique({ where: { id: item.resourceId }, select: { stockAvailable: true } });
      throw new HttpError(409, 'Stok ' + item.resourceName + ' tidak mencukupi. Tersedia saat ini: ' + (current?.stockAvailable ?? 0) + '. Pesanan tidak dibuat.');
    }
    movements.push({
      resourceId: item.resourceId, userId, orderId, type: 'RESERVED', quantity: item.quantity,
      note: 'Cadangan otomatis saat pesanan ' + orderNumber + ' dibuat.',
    });
  }
  if (movements.length) await tx.stockMovement.createMany({ data: movements });
}

// Legacy Pending orders created before this change have no RESERVED movement.
// They remain compatible and are skipped when cancelled/rejected.
async function releaseOrderReservation(tx, order, userId, note) {
  const movements = await tx.stockMovement.findMany({
    where: { orderId: order.id, type: 'RESERVED' },
    select: { resourceId: true, quantity: true },
  });
  if (!movements.length) {
    if (order.status === 'PENDING') return;
    throw new HttpError(409, 'Cadangan stok ' + order.orderNumber + ' tidak ditemukan. Periksa riwayat stok sebelum melanjutkan.');
  }
  const reservedByResource = new Map();
  for (const movement of movements) reservedByResource.set(movement.resourceId, (reservedByResource.get(movement.resourceId) || 0) + movement.quantity);
  for (const item of order.items) {
    if ((reservedByResource.get(item.resourceId) || 0) !== item.quantity) {
      throw new HttpError(409, 'Cadangan stok ' + item.resourceName + ' untuk ' + order.orderNumber + ' tidak sesuai. Tidak ada perubahan yang disimpan.');
    }
    const changed = await tx.resource.updateMany({
      where: { id: item.resourceId, stockReserved: { gte: item.quantity } },
      data: { stockReserved: { decrement: item.quantity }, stockAvailable: { increment: item.quantity } },
    });
    if (changed.count !== 1) throw new HttpError(409, 'Cadangan stok ' + item.resourceName + ' tidak konsisten.');
    await tx.stockMovement.create({ data: {
      resourceId: item.resourceId, userId, orderId: order.id, type: 'RELEASED', quantity: item.quantity, note,
    } });
  }
}

router.post('/', asyncHandler(async (req, res) => {
  const data = createOrderSchema.parse(req.body);
  const order = await prisma.$transaction(async (tx) => {
    const ids = data.items.map((item) => item.resourceId);
    const resources = await tx.resource.findMany({ where: { id: { in: ids }, isActive: true } });
    if (resources.length !== ids.length) throw new HttpError(400, 'Ada resource yang tidak ditemukan atau sedang tidak aktif.');
    if (resources.some((resource) => resource.category === 'OTHER')) {
      throw new HttpError(400, 'Item kategori Other hanya tersedia di Stash dan tidak dapat dipesan.');
    }
    const byId = new Map(resources.map((resource) => [resource.id, resource]));
    let totalAmount = new Prisma.Decimal(0);
    let totalQuantity = 0;
    const items = data.items.map((item) => {
      const resource = byId.get(item.resourceId);
      if (item.quantity > resource.stockAvailable) {
        throw new HttpError(409, `Jumlah ${resource.name} melebihi stok tersedia saat ini (${resource.stockAvailable}).`);
      }
      const unitPrice = new Prisma.Decimal(resource.unitPrice);
      const lineTotal = unitPrice.mul(item.quantity);
      totalAmount = totalAmount.add(lineTotal);
      totalQuantity += item.quantity;
      return {
        resourceId: resource.id,
        resourceName: resource.name,
        category: resource.category,
        unit: resource.unit,
        unitPrice,
        quantity: item.quantity,
        lineTotal,
      };
    });
    const orderNumber = makeOrderNumber();
    const created = await tx.order.create({
      data: {
        orderNumber, userId: req.user.id, notes: data.notes,
        totalQuantity, totalAmount,
        items: { create: items },
        statusHistory: { create: {
          changedById: req.user.id, fromStatus: null, toStatus: 'PENDING',
          note: 'Pesanan dibuat dan stok langsung dicadangkan sambil menunggu persetujuan admin.',
        } },
      },
      include: orderInclude,
    });
    await reserveOrderItems(tx, items, created.id, req.user.id, orderNumber);
    return created;
  }, { maxWait: 10000, timeout: 15000 });

  // In-app notifications are secondary to the order and stock reservation.
  // Persist them after the core transaction so notification latency cannot
  // cause a valid order to roll back or exceed the transaction timeout.
  try {
    await notifyAdmins(prisma, {
      type: 'ORDER_CREATED', title: 'Pesanan baru masuk',
      message: `${req.user.username} membuat pesanan ${order.orderNumber}. Stok sudah dicadangkan; periksa dan tinjau permintaan ini.`,
      orderId: order.id,
    });
  } catch (error) {
    console.error('Notifikasi admin untuk pesanan gagal disimpan:', error);
  }
  try {
    await notifyUsers(prisma, [req.user.id], {
      type: 'ORDER_STATUS', title: 'Pesanan berhasil diterima',
      message: `Pesanan ${order.orderNumber} sudah diterima dan stok telah dicadangkan sambil menunggu persetujuan admin.`,
      orderId: order.id,
    });
  } catch (error) {
    console.error('Notifikasi pemesan gagal disimpan:', error);
  }

  void sendDiscordNotification({ title: 'Pesanan baru 30sFams', description: `Anggota **${req.user.username}** mengirim pesanan **${order.orderNumber}** berisi ${order.totalQuantity} unit dan menunggu persetujuan admin.` });
  res.status(201).json({ order: serializeOrder(order), message: 'Pesanan terkirim. Stok berhasil diamankan dan menunggu persetujuan admin.' });
}));

router.get('/mine', asyncHandler(async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.user.id }, include: orderListInclude, orderBy: { createdAt: 'desc' }, take: 200,
  });
  res.json({ orders: orders.map(serializeOrder) });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const order = await prisma.order.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    include: orderInclude,
  });
  if (!order) throw new HttpError(404, 'Pesanan tidak ditemukan.');
  res.json({ order: serializeOrder(order) });
}));

router.post('/:id/reorder', asyncHandler(async (req, res) => {
  const previous = await prisma.order.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    include: { items: true },
  });
  if (!previous) throw new HttpError(404, 'Pesanan tidak ditemukan.');
  if (previous.status !== 'COMPLETED') throw new HttpError(409, 'Pesan ulang hanya tersedia untuk pesanan yang sudah Completed.');
  const newOrder = await prisma.$transaction(async (tx) => {
    const ids = previous.items.map((item) => item.resourceId);
    const resources = await tx.resource.findMany({ where: { id: { in: ids }, isActive: true } });
    if (resources.length !== ids.length) throw new HttpError(409, 'Sebagian resource pada pesanan lama sudah tidak aktif. Hubungi admin.');
    if (resources.some((resource) => resource.category === 'OTHER')) {
      throw new HttpError(409, 'Item kategori Other hanya tersedia di Stash dan tidak dapat dipesan ulang.');
    }
    const byId = new Map(resources.map((resource) => [resource.id, resource]));
    let totalAmount = new Prisma.Decimal(0);
    let totalQuantity = 0;
    const items = previous.items.map((oldItem) => {
      const resource = byId.get(oldItem.resourceId);
      if (oldItem.quantity > resource.stockAvailable) {
        throw new HttpError(409, `Stok ${resource.name} tidak cukup untuk pesan ulang. Tersedia: ${resource.stockAvailable}.`);
      }
      const unitPrice = new Prisma.Decimal(resource.unitPrice);
      const lineTotal = unitPrice.mul(oldItem.quantity);
      totalAmount = totalAmount.add(lineTotal);
      totalQuantity += oldItem.quantity;
      return {
        resourceId: resource.id, resourceName: resource.name, category: resource.category,
        unit: resource.unit, unitPrice, quantity: oldItem.quantity, lineTotal,
      };
    });
    const orderNumber = makeOrderNumber();
    const created = await tx.order.create({
      data: {
        orderNumber, userId: req.user.id,
        notes: `Pesanan ulang dari ${previous.orderNumber}. Harga mengikuti harga resource saat ini.`,
        totalQuantity, totalAmount, items: { create: items },
      },
    });
    await reserveOrderItems(tx, items, created.id, req.user.id, orderNumber);
    await tx.orderStatusHistory.create({ data: {
      orderId: created.id, changedById: req.user.id, fromStatus: null, toStatus: 'PENDING',
      note: `Pesanan ulang dibuat berdasarkan ${previous.orderNumber}. Stok langsung dicadangkan.`,
    } });
    await notifyAdmins(tx, {
      type: 'ORDER_CREATED', title: 'Pesanan ulang masuk',
      message: `${req.user.username} membuat pesanan ulang ${created.orderNumber} berdasarkan ${previous.orderNumber}. Stok sudah dicadangkan.`, orderId: created.id,
    });
    await notifyUsers(tx, [req.user.id], {
      type: 'ORDER_STATUS', title: 'Pesanan ulang berhasil dikirim',
      message: `Pesanan ${created.orderNumber} dibuat berdasarkan ${previous.orderNumber}. Stok sudah dicadangkan dan menunggu persetujuan admin.`, orderId: created.id,
    });
    await tx.activityLog.create({ data: {
      userId: req.user.id, action: 'ORDER_REORDERED',
      detail: `Membuat pesanan ulang ${created.orderNumber} berdasarkan ${previous.orderNumber}.`,
    } });
    return tx.order.findUnique({ where: { id: created.id }, include: orderInclude });
  }, { isolationLevel: 'Serializable' });
  void sendDiscordNotification({ title: 'Pesanan ulang 30sFams', description: `Anggota **${req.user.username}** mengirim pesanan ulang **${newOrder.orderNumber}** berdasarkan **${previous.orderNumber}**.` });
  res.status(201).json({ order: serializeOrder(newOrder), message: `Pesanan ulang ${newOrder.orderNumber} berhasil dikirim dan stok diamankan. Harga menggunakan harga saat ini.` });
}));

router.post('/:id/cancel', asyncHandler(async (req, res) => {
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id: req.params.id, userId: req.user.id }, include: { items: true } });
    if (!order) throw new HttpError(404, 'Pesanan tidak ditemukan.');
    if (order.status !== 'PENDING') throw new HttpError(409, 'User hanya dapat membatalkan pesanan yang masih Pending. Hubungi admin untuk pesanan yang sudah disetujui.');
    await releaseOrderReservation(tx, order, req.user.id, 'Cadangan dikembalikan karena ' + order.orderNumber + ' dibatalkan oleh pemesan.');
    await tx.orderStatusHistory.create({ data: {
      orderId: order.id, changedById: req.user.id, fromStatus: 'PENDING', toStatus: 'CANCELLED',
      note: 'Pesanan dibatalkan oleh pemesan sebelum disetujui admin.',
    } });
    await notifyAdmins(tx, {
      type: 'ORDER_STATUS', title: 'Pesanan dibatalkan user',
      message: `${req.user.username} membatalkan pesanan ${order.orderNumber}.`, orderId: order.id,
    });
    return tx.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' }, include: orderInclude });
  }, { isolationLevel: 'Serializable' });
  void sendDiscordNotification({ title: 'Pesanan dibatalkan anggota', description: `Anggota **${req.user.username}** membatalkan pesanan **${result.orderNumber}**.`, color: 0xD97706 });
  res.json({ order: serializeOrder(result) });
}));

export default router;
