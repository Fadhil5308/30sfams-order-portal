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

router.post('/', asyncHandler(async (req, res) => {
  const data = createOrderSchema.parse(req.body);
  const order = await prisma.$transaction(async (tx) => {
    const ids = data.items.map((item) => item.resourceId);
    const resources = await tx.resource.findMany({ where: { id: { in: ids }, isActive: true } });
    if (resources.length !== ids.length) throw new HttpError(400, 'Ada resource yang tidak ditemukan atau sedang tidak aktif.');
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
    const created = await tx.order.create({
      data: {
        orderNumber: makeOrderNumber(), userId: req.user.id, notes: data.notes,
        totalQuantity, totalAmount, items: { create: items },
      },
    });
    await tx.orderStatusHistory.create({ data: {
      orderId: created.id, changedById: req.user.id, fromStatus: null, toStatus: 'PENDING',
      note: 'Pesanan dibuat dan menunggu persetujuan admin.',
    } });
    await notifyAdmins(tx, {
      type: 'ORDER_CREATED', title: 'Pesanan baru masuk',
      message: `${req.user.username} membuat pesanan ${created.orderNumber}. Periksa dan tinjau permintaan ini.`,
      orderId: created.id,
    });
    await notifyUsers(tx, [req.user.id], {
      type: 'ORDER_STATUS', title: 'Pesanan berhasil diterima',
      message: `Pesanan ${created.orderNumber} sudah diterima sistem dan menunggu persetujuan admin.`,
      orderId: created.id,
    });
    return tx.order.findUnique({ where: { id: created.id }, include: orderInclude });
  });
  void sendDiscordNotification({ title: 'Pesanan baru 30sFams', description: `Anggota **${req.user.username}** mengirim pesanan **${order.orderNumber}** berisi ${order.totalQuantity} unit dan menunggu persetujuan admin.` });
  res.status(201).json({ order: serializeOrder(order), message: 'Pesanan terkirim dan menunggu persetujuan admin.' });
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
    const created = await tx.order.create({
      data: {
        orderNumber: makeOrderNumber(), userId: req.user.id,
        notes: `Pesanan ulang dari ${previous.orderNumber}. Harga mengikuti harga resource saat ini.`,
        totalQuantity, totalAmount, items: { create: items },
      },
    });
    await tx.orderStatusHistory.create({ data: {
      orderId: created.id, changedById: req.user.id, fromStatus: null, toStatus: 'PENDING',
      note: `Pesanan ulang dibuat berdasarkan ${previous.orderNumber}. Harga mengikuti harga resource saat ini.`,
    } });
    await notifyAdmins(tx, {
      type: 'ORDER_CREATED', title: 'Pesanan ulang masuk',
      message: `${req.user.username} membuat pesanan ulang ${created.orderNumber} berdasarkan ${previous.orderNumber}.`, orderId: created.id,
    });
    await notifyUsers(tx, [req.user.id], {
      type: 'ORDER_STATUS', title: 'Pesanan ulang berhasil dikirim',
      message: `Pesanan ${created.orderNumber} dibuat berdasarkan ${previous.orderNumber} dan menunggu persetujuan admin.`, orderId: created.id,
    });
    await tx.activityLog.create({ data: {
      userId: req.user.id, action: 'ORDER_REORDERED',
      detail: `Membuat pesanan ulang ${created.orderNumber} berdasarkan ${previous.orderNumber}.`,
    } });
    return tx.order.findUnique({ where: { id: created.id }, include: orderInclude });
  }, { isolationLevel: 'Serializable' });
  void sendDiscordNotification({ title: 'Pesanan ulang 30sFams', description: `Anggota **${req.user.username}** mengirim pesanan ulang **${newOrder.orderNumber}** berdasarkan **${previous.orderNumber}**.` });
  res.status(201).json({ order: serializeOrder(newOrder), message: `Pesanan ulang ${newOrder.orderNumber} berhasil dikirim. Harga menggunakan harga saat ini.` });
}));

router.post('/:id/cancel', asyncHandler(async (req, res) => {
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id: req.params.id, userId: req.user.id }, include: { items: true } });
    if (!order) throw new HttpError(404, 'Pesanan tidak ditemukan.');
    if (order.status !== 'PENDING') throw new HttpError(409, 'User hanya dapat membatalkan pesanan yang masih Pending. Hubungi admin untuk pesanan yang sudah disetujui.');
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
