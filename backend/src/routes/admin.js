import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { HttpError, asyncHandler, serializeOrder } from '../lib/http.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { notifyOrderOwner } from '../lib/notifications.js';
import { isDiscordWebhookConfigured, sendDiscordNotification } from '../lib/discord.js';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/integrations/discord', asyncHandler(async (_req, res) => {
  res.json({ configured: isDiscordWebhookConfigured(), message: isDiscordWebhookConfigured() ? 'Discord webhook detected in backend configuration.' : 'Discord webhook is not configured or its URL format is invalid.' });
}));

router.get('/dashboard', asyncHandler(async (_req, res) => {
  const [statusRows, resourceTotals, stockRows, lowStockCandidates, recentOrders] = await Promise.all([
    prisma.order.groupBy({
      by: ['status'],
      _count: { _all: true },
      _sum: { totalQuantity: true, totalAmount: true },
    }),
    prisma.resource.aggregate({
      // Other is stash-only and must never affect the main Overview totals.
      where: { isActive: true, category: { not: 'OTHER' } },
      _count: { _all: true },
      _sum: { stockAvailable: true, stockReserved: true },
    }),
    prisma.resource.groupBy({
      by: ['category'],
      where: { isActive: true, category: { not: 'OTHER' } },
      _sum: { stockAvailable: true },
    }),
    prisma.resource.findMany({
      where: {
        isActive: true,
        category: { not: 'OTHER' },
        OR: [{ minStock: { gt: 0 } }, { stockAvailable: 0 }],
      },
      select: {
        id: true, name: true, sku: true, category: true, unit: true,
        stockAvailable: true, stockReserved: true, minStock: true,
      },
      orderBy: [{ stockAvailable: 'asc' }, { name: 'asc' }],
    }),
    prisma.order.findMany({
      where: { archivedAt: null },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalQuantity: true,
        totalAmount: true,
        user: { select: { username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  const byStatus = Object.fromEntries(statusRows.map((row) => [row.status, row]));
  const sum = (status, field) => Number(byStatus[status]?._sum?.[field] || 0);
  const count = (status) => byStatus[status]?._count?._all || 0;

  res.json({
    summary: {
      totalOrders: statusRows.reduce((total, row) => total + row._count._all, 0),
      pendingOrders: count('PENDING'),
      approvedOrders: count('APPROVED'),
      completedOrders: count('COMPLETED'),
      completedQuantity: sum('COMPLETED', 'totalQuantity'),
      completedAmount: sum('COMPLETED', 'totalAmount'),
      activeResources: resourceTotals._count._all,
      lowStockResources: lowStockCandidates.filter((resource) => resource.stockAvailable <= resource.minStock).length,
    },
    lowStockResources: lowStockCandidates
      .filter((resource) => resource.stockAvailable <= resource.minStock)
      .slice(0, 8),
    stock: {
      available: resourceTotals._sum.stockAvailable || 0,
      reserved: resourceTotals._sum.stockReserved || 0,
      byCategory: Object.fromEntries(stockRows.map((row) => [row.category, row._sum.stockAvailable || 0])),
    },
    recentOrders: recentOrders.map((order) => ({ ...order, totalAmount: Number(order.totalAmount) })),
  });
}));

router.post('/integrations/discord/test', asyncHandler(async (req, res) => {
  if (!isDiscordWebhookConfigured()) throw new HttpError(409, 'Tambahkan DISCORD_WEBHOOK_URL yang valid ke backend/.env, lalu restart backend.');
  const sent = await sendDiscordNotification({
    title: 'Tes koneksi Discord 30sFams',
    description: `Webhook berhasil diuji oleh admin **${req.user.username}**. Notifikasi 30sFams siap diterima di channel ini.`,
    color: 0x16A34A,
  });
  if (!sent) throw new HttpError(502, 'Discord could not receive the notification. Check the webhook and backend internet connection.');
  await prisma.activityLog.create({ data: { userId: req.user.id, action: 'DISCORD_WEBHOOK_TESTED', detail: `Admin ${req.user.username} berhasil menguji koneksi webhook Discord.` } });
  res.json({ ok: true, message: 'Discord test succeeded. Check the connected Discord channel.' });
}));

const orderInclude = {
  items: true,
  user: { select: { id: true, username: true, email: true } },
  statusHistory: { include: { changedBy: { select: { username: true, role: true } } }, orderBy: { createdAt: 'asc' } },
  archivedBy: { select: { id: true, username: true } },
};

const orderListInclude = {
  items: true,
  user: { select: { username: true } },
};


// Check/secure reservations for approval. Pending orders created before automatic
// reservation have no RESERVED movement, so they are reserved here as a legacy fallback.
async function ensureOrderReservation(tx, order, userId) {
  const movements = await tx.stockMovement.findMany({
    where: { orderId: order.id, type: 'RESERVED' },
    select: { resourceId: true, quantity: true },
  });
  if (movements.length) {
    const reservedByResource = new Map();
    for (const movement of movements) reservedByResource.set(movement.resourceId, (reservedByResource.get(movement.resourceId) || 0) + movement.quantity);
    for (const item of order.items) {
      if ((reservedByResource.get(item.resourceId) || 0) !== item.quantity) {
        throw new HttpError(409, 'Stock reservation for ' + item.resourceName + ' is inconsistent. The order was not approved.');
      }
    }
    return false;
  }
  const newMovements = [];
  for (const item of order.items) {
    const changed = await tx.resource.updateMany({
      where: { id: item.resourceId, isActive: true, stockAvailable: { gte: item.quantity } },
      data: { stockAvailable: { decrement: item.quantity }, stockReserved: { increment: item.quantity } },
    });
    if (changed.count !== 1) {
      const current = await tx.resource.findUnique({ where: { id: item.resourceId }, select: { stockAvailable: true } });
      throw new HttpError(409, 'Stock ' + item.resourceName + ' is insufficient. Currently available: ' + (current?.stockAvailable ?? 0) + '. The order was not approved.');
    }
    newMovements.push({
      resourceId: item.resourceId, userId, orderId: order.id, type: 'RESERVED', quantity: item.quantity,
      note: 'Stock reservation for pesanan lama ' + order.orderNumber + ' saat disetujui admin.',
    });
  }
  if (newMovements.length) await tx.stockMovement.createMany({ data: newMovements });
  return true;
}

// Return reserved stock on rejection/cancellation. Legacy Pending orders may not
// have a reservation yet; those are allowed to pass without changing inventory.
async function releaseOrderReservation(tx, order, userId, note) {
  const movements = await tx.stockMovement.findMany({
    where: { orderId: order.id, type: 'RESERVED' },
    select: { resourceId: true, quantity: true },
  });
  if (!movements.length) {
    if (order.status === 'PENDING') return false;
    throw new HttpError(409, 'Stock reservation ' + order.orderNumber + ' was not found. Check stock history before continuing.');
  }
  const reservedByResource = new Map();
  for (const movement of movements) reservedByResource.set(movement.resourceId, (reservedByResource.get(movement.resourceId) || 0) + movement.quantity);
  for (const item of order.items) {
    if ((reservedByResource.get(item.resourceId) || 0) !== item.quantity) {
      throw new HttpError(409, 'Stock reservation ' + item.resourceName + ' for ' + order.orderNumber + ' is inconsistent. No changes were saved.');
    }
    const changed = await tx.resource.updateMany({
      where: { id: item.resourceId, stockReserved: { gte: item.quantity } },
      data: { stockReserved: { decrement: item.quantity }, stockAvailable: { increment: item.quantity } },
    });
    if (changed.count !== 1) throw new HttpError(409, 'Stock reservation ' + item.resourceName + ' is inconsistent.');
    await tx.stockMovement.create({ data: {
      resourceId: item.resourceId, userId, orderId: order.id, type: 'RELEASED', quantity: item.quantity, note,
    } });
  }
  return true;
}

router.get('/orders', asyncHandler(async (req, res) => {
  const statusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED']).optional();
  const view = z.enum(['active', 'archive']).default('active').parse(req.query.view ?? 'active');
  const status = statusSchema.parse(req.query.status);
  const where = view === 'archive' ? { archivedAt: { not: null } } : { archivedAt: null };
  if (status) where.status = status;
  const orders = await prisma.order.findMany({
    where, include: orderListInclude, orderBy: view === 'archive' ? { archivedAt: 'desc' } : { createdAt: 'desc' }, take: 1000,
  });
  res.json({ orders: orders.map(serializeOrder), view });
}));

router.get('/orders/:id', asyncHandler(async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: orderInclude });
  if (!order) throw new HttpError(404, 'Order not found.');
  res.json({ order: serializeOrder(order) });
}));

// Arsip memindahkan pesanan keluar dari daftar aktif tanpa mengubah status, stok, atau invoice.
router.post('/orders/archive-all', asyncHandler(async (req, res) => {
  const data = z.object({
    confirmation: z.literal('RESET 30SFAMS'),
    reason: z.string().trim().max(300).optional().default('Penutupan periode pemesanan.'),
  }).parse(req.body ?? {});
  const result = await prisma.$transaction(async (tx) => {
    const archivedAt = new Date();
    const changed = await tx.order.updateMany({
      where: { archivedAt: null },
      data: { archivedAt, archivedById: req.user.id },
    });
    await tx.activityLog.create({ data: {
      userId: req.user.id,
      action: 'ORDERS_ARCHIVED',
      detail: `Mengarsipkan ${changed.count} pesanan. Alasan: ${data.reason || 'Tidak dicantumkan.'}`,
    } });
    return { archivedCount: changed.count, archivedAt };
  }, { isolationLevel: 'Serializable' });
  res.json({ ...result, message: `${result.archivedCount} orders moved to the archive. History and stock were not changed.` });
}));

// Pulihkan satu pesanan dari arsip ke daftar operasional tanpa mengubah status atau stok.
router.post('/orders/:id/restore', asyncHandler(async (req, res) => {
  const updated = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: req.params.id } });
    if (!order) throw new HttpError(404, 'Order not found.');
    if (!order.archivedAt) throw new HttpError(409, 'This order is not archived.');
    const changed = await tx.order.updateMany({
      where: { id: order.id, archivedAt: { not: null } },
      data: { archivedAt: null, archivedById: null },
    });
    if (changed.count !== 1) throw new HttpError(409, 'The order changed while being restored. Reload the page and try again.');
    await tx.activityLog.create({ data: {
      userId: req.user.id, action: 'ORDER_RESTORED',
      detail: `Memulihkan pesanan ${order.orderNumber} dari arsip ke daftar aktif.`,
    } });
    return tx.order.findUnique({ where: { id: order.id }, include: orderInclude });
  }, { isolationLevel: 'Serializable' });
  res.json({ order: serializeOrder(updated), message: `Pesanan ${updated.orderNumber} was restored to the active list. Status and stock were not changed.` });
}));

// Pembatalan massal adalah aksi terpisah dari arsip. Reservasi pada pesanan Approved dikembalikan.
router.post('/orders/cancel-active', asyncHandler(async (req, res) => {
  const data = z.object({
    confirmation: z.literal('CANCEL 30SFAMS'),
    reason: z.string().trim().max(300).optional().default('Pembatalan massal oleh admin.'),
  }).parse(req.body ?? {});
  const result = await prisma.$transaction(async (tx) => {
    const candidates = await tx.order.findMany({
      where: { archivedAt: null, status: { in: ['PENDING', 'APPROVED'] } },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    });
    let pendingCancelled = 0;
    let approvedCancelled = 0;
    for (const order of candidates) {
      await releaseOrderReservation(tx, order, req.user.id, `Cadangan dilepas karena pembatalan massal ${order.orderNumber}. ${data.reason}`.trim());
      if (order.status === 'APPROVED') approvedCancelled += 1;
      else pendingCancelled += 1;
      const note = data.reason || 'Pembatalan massal oleh admin.';
      const changedOrder = await tx.order.updateMany({
        where: { id: order.id, archivedAt: null, status: order.status },
        data: { status: 'CANCELLED', adminNotes: order.adminNotes ? `${order.adminNotes}\n\n[Bulk cancel] ${note}` : note },
      });
      if (changedOrder.count !== 1) throw new HttpError(409, `Status ${order.orderNumber} changed during processing. All cancellations were rolled back.`);
      await tx.orderStatusHistory.create({ data: {
        orderId: order.id, changedById: req.user.id, fromStatus: order.status, toStatus: 'CANCELLED',
        note: `Pembatalan massal oleh admin. ${note}`.trim(),
      } });
      await notifyOrderOwner(tx, order, {
        type: 'ORDER_STATUS', title: 'Pesanan dibatalkan admin',
        message: `Pesanan ${order.orderNumber} cancelled by an administrator. ${note}`.trim(),
      });
    }
    await tx.activityLog.create({ data: {
      userId: req.user.id, action: 'ORDERS_BULK_CANCELLED',
      detail: `Pembatalan massal: ${pendingCancelled} Pending dan ${approvedCancelled} Approved. Alasan: ${data.reason || 'Tidak dicantumkan.'}`,
    } });
    return { pendingCancelled, approvedCancelled, totalCancelled: pendingCancelled + approvedCancelled };
  }, { isolationLevel: 'Serializable', timeout: 30000 });
  void sendDiscordNotification({ title: 'Pembatalan massal pesanan', description: `Admin membatalkan ${result.totalCancelled} pesanan aktif (${result.pendingCancelled} Pending, ${result.approvedCancelled} Approved).`, color: 0xD97706 });
  res.json({ ...result, message: `${result.totalCancelled} pesanan aktif dibatalkan. Stock reservation dari pesanan Pending dan Approved yang sudah menggunakan reservasi telah dikembalikan.` });
}));

router.post('/orders/:id/approve', asyncHandler(async (req, res) => {
  const updated = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!order) throw new HttpError(404, 'Order not found.');
    if (order.status !== 'PENDING') throw new HttpError(409, 'Only Pending orders can be approved.');

    await ensureOrderReservation(tx, order, req.user.id);
    await tx.activityLog.create({ data: { userId: req.user.id, action: 'ORDER_APPROVED', detail: `Menyetujui pesanan ${order.orderNumber}` } });
    await tx.orderStatusHistory.create({ data: {
      orderId: order.id, changedById: req.user.id, fromStatus: 'PENDING', toStatus: 'APPROVED',
      note: 'Pesanan disetujui admin. Stock yang telah dicadangkan tetap diamankan.',
    } });
    return tx.order.update({ where: { id: order.id }, data: { status: 'APPROVED', approvedAt: new Date() }, include: orderInclude });
  }, { isolationLevel: 'Serializable', maxWait: 10000, timeout: 15000 });
  try {
    await notifyOrderOwner(prisma, updated, {
      type: 'ORDER_STATUS', title: 'Pesanan disetujui',
      message: `Pesanan ${updated.orderNumber} disetujui. Stock tetap diamankan dan menunggu penyerahan resource.`,
    });
  } catch (error) {
    console.error('Notifikasi persetujuan pesanan gagal disimpan:', error);
  }
  void sendDiscordNotification({ title: 'Pesanan disetujui', description: `Pesanan **${updated.orderNumber}** milik **${updated.user?.username || 'anggota'}** disetujui. Stock telah dicadangkan.` });
  res.json({ order: serializeOrder(updated), message: 'Order approved. Stock remains reserved and will not be deducted twice.' });
}));

router.post('/orders/:id/reject', asyncHandler(async (req, res) => {
  const data = z.object({ adminNotes: z.string().trim().max(500).optional().default('') }).parse(req.body ?? {});
  const updated = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!order) throw new HttpError(404, 'Order not found.');
    if (order.status !== 'PENDING') throw new HttpError(409, 'Only Pending orders can be rejected.');
    await releaseOrderReservation(tx, order, req.user.id, 'Cadangan dikembalikan karena pesanan ' + order.orderNumber + ' ditolak admin.');
    await tx.activityLog.create({ data: { userId: req.user.id, action: 'ORDER_REJECTED', detail: `Menolak pesanan ${order.orderNumber}` } });
    await tx.orderStatusHistory.create({ data: {
      orderId: order.id, changedById: req.user.id, fromStatus: 'PENDING', toStatus: 'REJECTED',
      note: data.adminNotes || 'Pesanan was rejected by an administrator.',
    } });
    return tx.order.update({ where: { id: order.id }, data: { status: 'REJECTED', adminNotes: data.adminNotes }, include: orderInclude });
  }, { isolationLevel: 'Serializable', maxWait: 10000, timeout: 15000 });
  try {
    await notifyOrderOwner(prisma, updated, {
      type: 'ORDER_STATUS', title: 'Pesanan ditolak',
      message: `Pesanan ${updated.orderNumber} was rejected by an administrator.${data.adminNotes ? ` Catatan: ${data.adminNotes}` : ''}`,
    });
  } catch (error) {
    console.error('Notifikasi penolakan pesanan gagal disimpan:', error);
  }
  void sendDiscordNotification({ title: 'Pesanan ditolak', description: `Pesanan **${updated.orderNumber}** was rejected by an administrator.` , color: 0xD97706 });
  res.json({ order: serializeOrder(updated) });
}));

router.post('/orders/:id/complete', asyncHandler(async (req, res) => {
  const data = z.object({ handoverNote: z.string().trim().max(500).optional().default('') }).parse(req.body ?? {});
  const updated = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!order) throw new HttpError(404, 'Order not found.');
    if (order.status !== 'APPROVED') throw new HttpError(409, 'Only Approved orders can be completed.');
    const cashInitialized = await tx.gangCashEntry.findFirst({ where: { type: 'OPENING_BALANCE' }, select: { id: true } });
    if (!cashInitialized) throw new HttpError(409, 'Set the initial gang fund balance in Finance & Gang Fund before completing an order.');
    const existingIncome = await tx.gangCashEntry.findUnique({ where: { orderId: order.id }, select: { id: true } });
    if (existingIncome) throw new HttpError(409, 'Income for this order has already been recorded. No duplicate income was created.');
    const completedAt = new Date();
    const transition = await tx.order.updateMany({ where: { id: order.id, status: 'APPROVED' }, data: { status: 'COMPLETED', completedAt } });
    if (transition.count !== 1) throw new HttpError(409, 'The order status changed during processing. Reload the data before trying again.');
    const completedMovements = [];
    for (const item of order.items) {
      const changed = await tx.resource.updateMany({
        where: { id: item.resourceId, stockReserved: { gte: item.quantity } },
        data: { stockReserved: { decrement: item.quantity } },
      });
      if (changed.count !== 1) throw new HttpError(409, `Stock reservation ${item.resourceName} is inconsistent. Periksa stock movement.`);
      completedMovements.push({
        resourceId: item.resourceId, userId: req.user.id, orderId: order.id,
        type: 'COMPLETED', quantity: item.quantity, note: `Resource dikeluarkan for ${order.orderNumber}`,
      });
    }
    if (completedMovements.length) await tx.stockMovement.createMany({ data: completedMovements });
    await tx.activityLog.create({ data: { userId: req.user.id, action: 'ORDER_COMPLETED', detail: `Menyelesaikan pesanan ${order.orderNumber}` } });
    await tx.gangCashEntry.create({
      data: {
        type: 'ORDER_INCOME', amount: order.totalAmount, category: 'Pembelian resource',
        description: `Pemasukan kas dari pesanan ${order.orderNumber} oleh ${req.user.username}.`,
        orderId: order.id, createdById: req.user.id,
      },
    });
    await tx.orderStatusHistory.create({ data: {
      orderId: order.id, changedById: req.user.id, fromStatus: 'APPROVED', toStatus: 'COMPLETED',
      note: `Resource diserahkan langsung oleh ${req.user.username} dan pesanan ditandai selesai.${data.handoverNote ? ` Catatan penyerahan: ${data.handoverNote}` : ''}`,
    } });
    return tx.order.findUnique({ where: { id: order.id }, include: orderInclude });
  }, { isolationLevel: 'Serializable', maxWait: 10000, timeout: 15000 });

  // Notification delivery must not keep the stock/cash transaction open.
  try {
    await notifyOrderOwner(prisma, updated, {
      type: 'ORDER_STATUS', title: 'Resource telah diserahkan',
      message: `Pesanan ${updated.orderNumber} was handed over and marked as completed by an administrator.${data.handoverNote ? ` Catatan: ${data.handoverNote}` : ''}`,
    });
  } catch (error) {
    console.error('Notifikasi penyelesaian pesanan gagal disimpan:', error);
  }
  void sendDiscordNotification({ title: 'Resource diserahkan', description: `Pesanan **${updated.orderNumber}** milik **${updated.user?.username || 'anggota'}** selesai. Resource telah diserahkan.` , color: 0x16A34A });
  res.json({ order: serializeOrder(updated), message: 'Order completed. Reserved stock has been removed from inventory.' });
}));

router.post('/orders/:id/cancel', asyncHandler(async (req, res) => {
  const data = z.object({ adminNotes: z.string().trim().max(500).optional().default('') }).parse(req.body ?? {});
  const updated = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!order) throw new HttpError(404, 'Order not found.');
    if (!['PENDING', 'APPROVED'].includes(order.status)) throw new HttpError(409, 'Pesanan ini cannot be cancelled in its current status.');
    await releaseOrderReservation(tx, order, req.user.id, `Cadangan dilepas karena ${order.orderNumber} dibatalkan oleh admin.`);
    await tx.activityLog.create({ data: { userId: req.user.id, action: 'ORDER_CANCELLED', detail: `Membatalkan pesanan ${order.orderNumber}` } });
    await tx.orderStatusHistory.create({ data: {
      orderId: order.id, changedById: req.user.id, fromStatus: order.status, toStatus: 'CANCELLED',
      note: data.adminNotes || 'Pesanan dibatalkan oleh admin.',
    } });
    return tx.order.update({ where: { id: order.id }, data: { status: 'CANCELLED', adminNotes: data.adminNotes }, include: orderInclude });
  }, { isolationLevel: 'Serializable', maxWait: 10000, timeout: 15000 });
  try {
    await notifyOrderOwner(prisma, updated, {
      type: 'ORDER_STATUS', title: 'Pesanan dibatalkan',
      message: `Pesanan ${updated.orderNumber} dibatalkan oleh admin.${data.adminNotes ? ` Catatan: ${data.adminNotes}` : ''}`,
    });
  } catch (error) {
    console.error('Notifikasi pembatalan pesanan gagal disimpan:', error);
  }
  void sendDiscordNotification({ title: 'Pesanan dibatalkan', description: `Pesanan **${updated.orderNumber}** dibatalkan oleh admin.`, color: 0xD97706 });
  res.json({ order: serializeOrder(updated), message: 'Order cancelled.' });
}));

router.get('/reports', asyncHandler(async (_req, res) => {
  const [statusRows, categoryRows, topRows, usersCount, resourcesCount, movements] = await Promise.all([
    prisma.order.groupBy({
      by: ['status'],
      _count: { _all: true },
      _sum: { totalQuantity: true, totalAmount: true },
    }),
    prisma.orderItem.groupBy({
      by: ['category'],
      where: { order: { status: 'COMPLETED' } },
      _sum: { quantity: true, lineTotal: true },
    }),
    prisma.orderItem.groupBy({
      by: ['resourceId', 'resourceName'],
      where: { order: { status: 'COMPLETED' } },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    }),
    prisma.user.count({ where: { role: 'USER', deletedAt: null } }),
    prisma.resource.count({ where: { isActive: true } }),
    prisma.stockMovement.count(),
  ]);

  const byStatus = Object.fromEntries(statusRows.map((row) => [row.status, row]));
  const count = (status) => byStatus[status]?._count?._all || 0;
  const sum = (status, field) => Number(byStatus[status]?._sum?.[field] || 0);
  const categories = Object.fromEntries(categoryRows.map((row) => [row.category, {
    quantity: row._sum.quantity || 0,
    amount: Number(row._sum.lineTotal || 0),
  }]));

  res.json({
    summary: {
      totalOrders: statusRows.reduce((total, row) => total + row._count._all, 0),
      pendingOrders: count('PENDING'),
      approvedOrders: count('APPROVED'),
      completedOrders: count('COMPLETED'),
      rejectedOrders: count('REJECTED'),
      cancelledOrders: count('CANCELLED'),
      completedQuantity: sum('COMPLETED', 'totalQuantity'),
      completedAmount: sum('COMPLETED', 'totalAmount'),
      reservedQuantity: sum('APPROVED', 'totalQuantity'),
      reservedAmount: sum('APPROVED', 'totalAmount'),
      pendingQuantity: sum('PENDING', 'totalQuantity'),
      pendingAmount: sum('PENDING', 'totalAmount'),
      totalUsers: usersCount,
      activeResources: resourcesCount,
      stockMovementCount: movements,
    },
    categories,
    topResources: topRows.map((row) => ({ resourceId: row.resourceId, name: row.resourceName, quantity: row._sum.quantity || 0, amount: Number(row._sum.lineTotal || 0) })),
  });
}));

const createUserSchema = z.object({
  username: z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_.-]+$/, 'Username hanya boleh berisi huruf, angka, titik, garis bawah, atau strip.'),
  email: z.email().trim().max(150),
  password: z.string().min(12, 'Password sementara minimal 12 karakter.').max(100),
  rank: z.enum(['HANGAROUND', 'YOUNGBOYS', 'HOODBOYS', 'HOOD_PRESIDENT', 'SHOOT_CALLER', 'UNDER_OG', 'OG']).default('HANGAROUND'),
});

// Akun user hanya dapat dibuat oleh admin yang sudah terautentikasi.
router.post('/users', asyncHandler(async (req, res) => {
  const data = createUserSchema.parse(req.body);
  const username = data.username;
  const email = data.email.toLowerCase();
  const duplicate = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] }, select: { id: true } });
  if (duplicate) throw new HttpError(409, 'Username or email is already in use.');
  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { username, email, passwordHash, role: 'USER', rank: data.rank, isActive: true, registrationStatus: 'APPROVED' },
      select: { id: true, username: true, email: true, role: true, rank: true, isActive: true, registrationStatus: true, createdAt: true },
    });
    await tx.notification.create({ data: {
      userId: created.id, type: 'ACCOUNT_CREATED', title: 'Akun 30sFams dibuat',
      message: 'Akun kamu sudah dibuat oleh admin 30sFams. Gunakan username/email dan password sementara yang diberikan admin for login.',
    } });
    await tx.activityLog.create({ data: {
      userId: req.user.id, action: 'USER_CREATED', detail: `Membuat akun user ${created.username} (${created.email}).`,
    } });
    return created;
  });
  res.status(201).json({ user, message: `Akun ${user.username} was created. Share the initial credentials privately with the account owner.` });
}));

router.patch('/users/:id/approval', asyncHandler(async (req, res) => {
  const data = z.object({ status: z.enum(['APPROVED', 'REJECTED']) }).parse(req.body ?? {});
  const target = await prisma.user.findUnique({ where: { id: req.params.id, deletedAt: null }, select: { id: true, username: true, email: true, role: true, registrationStatus: true, isActive: true } });
  if (!target) throw new HttpError(404, 'User not found.');
  if (target.role !== 'USER') throw new HttpError(403, 'Administrator accounts cannot be processed as member registrations.');
  if (target.registrationStatus === 'APPROVED') throw new HttpError(409, 'This account is already verified. Use account status settings to enable or disable access.');
  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: target.id },
      data: { registrationStatus: data.status, isActive: data.status === 'APPROVED', sessionVersion: { increment: 1 } },
      select: { id: true, username: true, email: true, role: true, isActive: true, registrationStatus: true, createdAt: true },
    });
    await tx.notification.create({ data: {
      userId: target.id, type: 'ACCOUNT_STATUS',
      title: data.status === 'APPROVED' ? 'Akun 30sFams disetujui' : 'Pendaftaran belum disetujui',
      message: data.status === 'APPROVED'
        ? 'Pendaftaran kamu telah disetujui. Silakan login ke portal 30sFams.'
        : 'Pendaftaran kamu belum disetujui. Hubungi admin 30sFams for informasi lebih lanjut.',
    } });
    await tx.activityLog.create({ data: {
      userId: req.user.id,
      action: data.status === 'APPROVED' ? 'USER_REGISTRATION_APPROVED' : 'USER_REGISTRATION_REJECTED',
      detail: `${data.status === 'APPROVED' ? 'Menyetujui' : 'Menolak'} pendaftaran ${target.username} (${target.email}).`,
    } });
    return updated;
  });
  res.json({ user, message: data.status === 'APPROVED' ? `Akun ${user.username} has been approved and can now sign in.` : `Pendaftaran ${user.username} was rejected.` });
}));

router.get('/users', asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, username: true, email: true, role: true, rank: true, isActive: true, registrationStatus: true, createdAt: true, _count: { select: { orders: true } } },
    orderBy: { createdAt: 'desc' }, take: 500,
  });
  res.json({ users });
}));

router.patch('/users/:id/role', asyncHandler(async (req, res) => {
  const data = z.object({ role: z.enum(['ADMIN', 'USER']) }).parse(req.body ?? {});
  if (req.params.id === req.user.id) {
    throw new HttpError(409, 'You cannot change the role of your own account.');
  }

  const target = await prisma.user.findUnique({
    where: { id: req.params.id, deletedAt: null },
    select: { id: true, username: true, role: true }, 
  });
  if (!target) throw new HttpError(404, 'User not found.');
  if (target.role === data.role) {
    return res.json({ user: target, message: 'Account role was not changed.' });
  }

  if (target.role === 'ADMIN' && data.role === 'USER') {
    const superAdminCount = await prisma.user.count({ where: { role: 'ADMIN', isActive: true, registrationStatus: 'APPROVED', deletedAt: null } });
    if (superAdminCount <= 1) {
      throw new HttpError(409, 'The last active Super Admin cannot be demoted to Member.');
    }
  }

  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: target.id },
      data: { role: data.role, sessionVersion: { increment: 1 } },
      select: { id: true, username: true, role: true },
    });
    await tx.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'USER_ROLE_UPDATED',
        detail: 'Mengubah role ' + target.username + ' dari ' + target.role + ' menjadi ' + data.role + '. Sesi lama dicabut.',
      },
    });
    return updated;
  });

  res.json({
    user,
    message: 'Role for ' + user.username + ' was changed to ' + (user.role === 'ADMIN' ? 'Super Admin' : 'Member') + '.',
  });
}));

router.patch('/users/:id/rank', asyncHandler(async (req, res) => {
  const data = z.object({ rank: z.enum(['HANGAROUND', 'YOUNGBOYS', 'HOODBOYS', 'HOOD_PRESIDENT', 'SHOOT_CALLER', 'UNDER_OG', 'OG']) }).parse(req.body ?? {});
  const target = await prisma.user.findUnique({ where: { id: req.params.id, deletedAt: null }, select: { id: true, username: true, role: true, rank: true } });
  if (!target) throw new HttpError(404, 'User not found.');
  if (target.rank === data.rank) return res.json({ user: target, message: 'Rank was not changed.' });
  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({ where: { id: target.id }, data: { rank: data.rank }, select: { id: true, username: true, role: true, rank: true } });
    await tx.activityLog.create({ data: { userId: req.user.id, action: 'USER_RANK_UPDATED', detail: 'Mengubah rank ' + target.username + ' dari ' + target.rank + ' menjadi ' + data.rank + '.' } });
    return updated;
  });
  res.json({ user, message: 'Rank for ' + user.username + ' was updated.' });
}));

router.patch('/users/:id/status', asyncHandler(async (req, res) => {
  const data = z.object({ isActive: z.boolean() }).parse(req.body ?? {});
  const target = await prisma.user.findUnique({ where: { id: req.params.id, deletedAt: null }, select: { id: true, username: true, role: true, isActive: true, registrationStatus: true } });
  if (!target) throw new HttpError(404, 'User not found.');
  if (target.role !== 'USER') throw new HttpError(403, 'Administrator account status cannot be changed from this menu.');
  if (target.registrationStatus !== 'APPROVED') throw new HttpError(409, 'Registration must be approved before changing the account status.');
  if (target.isActive === data.isActive) return res.json({ user: target, message: 'Account status was not changed.' });
  if (!data.isActive) {
    const openOrders = await prisma.order.count({ where: { userId: target.id, status: { in: ['PENDING', 'APPROVED'] } } });
    if (openOrders > 0) throw new HttpError(409, `Akun belum dapat dinonaktifkan karena masih memiliki ${openOrders} pesanan Pending/Approved. Selesaikan atau batalkan pesanan terlebih dahulu agar reservasi stok tidak tertahan.`);
  }
  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({ where: { id: target.id }, data: { isActive: data.isActive, sessionVersion: { increment: 1 } }, select: { id: true, username: true, email: true, role: true, isActive: true, registrationStatus: true } });
    await tx.activityLog.create({ data: {
      userId: req.user.id, action: data.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      detail: `${data.isActive ? 'Mengaktifkan' : 'Menonaktifkan'} akun ${target.username}.`,
    } });
    return updated;
  });
  res.json({ user, message: `Akun ${user.username} berhasil ${user.isActive ? 'diaktifkan' : 'dinonaktifkan'}.` });
}));

router.delete('/users/:id', asyncHandler(async (req, res) => {
  const target = await prisma.user.findUnique({
    where: { id: req.params.id, deletedAt: null },
    select: { id: true, username: true, role: true },
  });
  if (!target) throw new HttpError(404, 'Member not found or already deleted.');
  if (target.role !== 'USER') throw new HttpError(403, 'Super Admin accounts cannot be deleted from the Members menu.');

  const openOrders = await prisma.order.count({
    where: { userId: target.id, status: { in: ['PENDING', 'APPROVED'] } },
  });
  if (openOrders > 0) {
    throw new HttpError(409, 'Member cannot be deleted because they still have ' + openOrders + ' Pending/Approved orders. Complete or cancel these orders first to release reserved stock.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: target.id },
      data: { deletedAt: new Date(), isActive: false, sessionVersion: { increment: 1 } },
    });
    await tx.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'USER_SOFT_DELETED',
        detail: 'Menghapus akun Member ' + target.username + '. Akses login dicabut; riwayat pesanan dan transaksi tetap dipertahankan.',
      },
    });
  });

  res.json({ message: 'Akun ' + target.username + ' berhasil dihapus dari daftar anggota. Riwayat transaksi tetap tersimpan.' });
}));

router.get('/stock-movements', asyncHandler(async (req, res) => {
  const typeSchema = z.enum(['RESTOCK', 'ADJUSTMENT', 'RESERVED', 'RELEASED', 'COMPLETED']).optional();
  const type = typeSchema.parse(req.query.type);
  const resourceId = req.query.resourceId ? z.string().min(1).max(100).parse(req.query.resourceId) : undefined;
  const limit = z.coerce.number().int().min(1).max(500).default(200).parse(req.query.limit ?? 200);
  const movements = await prisma.stockMovement.findMany({
    where: { ...(type ? { type } : {}), ...(resourceId ? { resourceId } : {}) },
    include: {
      resource: { select: { id: true, name: true, sku: true, category: true, unit: true } },
      user: { select: { id: true, username: true } },
      order: { select: { id: true, orderNumber: true } },
    },
    orderBy: { createdAt: 'desc' }, take: limit,
  });
  res.json({ movements });
}));

router.get('/member-stats', asyncHandler(async (_req, res) => {
  const [members, completed, openOrders] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'USER' },
      select: { id: true, username: true, email: true, isActive: true, registrationStatus: true, createdAt: true, deletedAt: true },
      orderBy: { createdAt: 'desc' }, take: 1000,
    }),
    prisma.order.groupBy({
      by: ['userId'], where: { status: 'COMPLETED' },
      _sum: { totalAmount: true, totalQuantity: true },
      _count: { _all: true }, _max: { completedAt: true },
    }),
    prisma.order.groupBy({
      by: ['userId', 'status'], where: { status: { in: ['PENDING', 'APPROVED'] } },
      _count: { _all: true },
    }),
  ]);
  const completedByUser = new Map(completed.map((row) => [row.userId, row]));
  const openByUser = new Map();
  for (const row of openOrders) {
    const current = openByUser.get(row.userId) || { pendingOrders: 0, approvedOrders: 0 };
    if (row.status === 'PENDING') current.pendingOrders = row._count._all;
    if (row.status === 'APPROVED') current.approvedOrders = row._count._all;
    openByUser.set(row.userId, current);
  }
  const rows = members.map((member) => {
    const order = completedByUser.get(member.id);
    const open = openByUser.get(member.id) || { pendingOrders: 0, approvedOrders: 0 };
    return {
      ...member,
      completedOrders: order?._count?._all || 0,
      completedQuantity: order?._sum?.totalQuantity || 0,
      totalSpend: Number(order?._sum?.totalAmount || 0),
      lastCompletedAt: order?._max?.completedAt || null,
      pendingOrders: open.pendingOrders,
      approvedOrders: open.approvedOrders,
    };
  }).sort((a, b) => b.totalSpend - a.totalSpend || b.completedOrders - a.completedOrders);
  res.json({
    summary: {
      totalMembers: members.filter((member) => !member.deletedAt).length,
      activeMembers: members.filter((member) => !member.deletedAt && member.isActive && member.registrationStatus === 'APPROVED').length,
      pendingRegistrations: members.filter((member) => !member.deletedAt && member.registrationStatus === 'PENDING').length,
      completedOrders: rows.reduce((sum, row) => sum + row.completedOrders, 0),
      completedAmount: Number(rows.reduce((sum, row) => sum + row.totalSpend, 0).toFixed(2)),
      completedQuantity: rows.reduce((sum, row) => sum + row.completedQuantity, 0),
    },
    members: rows,
  });
}));

const manualNoteCategories = ['UMUM', 'OPERASIONAL', 'STOK', 'PESANAN', 'PENGUMUMAN', 'LAINNYA'];
const manualNoteSchema = z.object({
  title: z.string().trim().min(3).max(120),
  category: z.enum(manualNoteCategories).default('UMUM'),
  content: z.string().trim().min(1).max(20000),
});

router.get('/notes', asyncHandler(async (req, res) => {
  const search = req.query.search
    ? z.string().trim().max(120).parse(String(req.query.search))
    : '';
  const category = req.query.category
    ? z.enum(manualNoteCategories).parse(String(req.query.category))
    : undefined;
  const where = {
    ...(category ? { category } : {}),
    ...(search ? {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ],
    } : {}),
  };
  const notes = await prisma.manualNote.findMany({
    where,
    include: { createdBy: { select: { id: true, username: true } } },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    take: 500,
  });
  res.json({ notes });
}));

router.post('/notes', asyncHandler(async (req, res) => {
  const data = manualNoteSchema.parse(req.body);
  const note = await prisma.$transaction(async (tx) => {
    const created = await tx.manualNote.create({
      data: { ...data, createdById: req.user.id },
      include: { createdBy: { select: { id: true, username: true } } },
    });
    await tx.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'MANUAL_NOTE_CREATED',
        detail: `Membuat catatan "${created.title}" [${created.category}].`,
      },
    });
    return created;
  });
  res.status(201).json({ note });
}));

router.patch('/notes/:id', asyncHandler(async (req, res) => {
  const data = manualNoteSchema.partial().parse(req.body);
  if (!Object.keys(data).length) throw new HttpError(400, 'No note changes were submitted.');
  const note = await prisma.$transaction(async (tx) => {
    const current = await tx.manualNote.findUnique({ where: { id: req.params.id } });
    if (!current) throw new HttpError(404, 'Note not found.');
    const updated = await tx.manualNote.update({
      where: { id: current.id },
      data,
      include: { createdBy: { select: { id: true, username: true } } },
    });
    await tx.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'MANUAL_NOTE_UPDATED',
        detail: `Memperbarui catatan "${current.title}" menjadi "${updated.title}".`,
      },
    });
    return updated;
  });
  res.json({ note });
}));

router.delete('/notes/:id', asyncHandler(async (req, res) => {
  const deleted = await prisma.$transaction(async (tx) => {
    const current = await tx.manualNote.findUnique({ where: { id: req.params.id } });
    if (!current) throw new HttpError(404, 'Note not found.');
    await tx.manualNote.delete({ where: { id: current.id } });
    await tx.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'MANUAL_NOTE_DELETED',
        detail: `Menghapus catatan "${current.title}" [${current.category}].`,
      },
    });
    return current;
  });
  res.json({ ok: true, deletedId: deleted.id });
}));

router.get('/activity', asyncHandler(async (_req, res) => {
  const logs = await prisma.activityLog.findMany({ include: { user: { select: { username: true } } }, orderBy: { createdAt: 'desc' }, take: 100 });
  res.json({ logs });
}));

export default router;
