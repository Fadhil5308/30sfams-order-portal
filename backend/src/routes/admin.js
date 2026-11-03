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
  res.json({ configured: isDiscordWebhookConfigured(), message: isDiscordWebhookConfigured() ? 'Webhook Discord terdeteksi di konfigurasi backend.' : 'Webhook Discord belum dikonfigurasi atau format URL tidak valid.' });
}));

router.get('/dashboard', asyncHandler(async (_req, res) => {
  const [statusRows, resourceTotals, stockRows, recentOrders] = await Promise.all([
    prisma.order.groupBy({
      by: ['status'],
      _count: { _all: true },
      _sum: { totalQuantity: true, totalAmount: true },
    }),
    prisma.resource.aggregate({
      where: { isActive: true },
      _count: { _all: true },
      _sum: { stockAvailable: true, stockReserved: true },
    }),
    prisma.resource.groupBy({
      by: ['category'],
      where: { isActive: true },
      _sum: { stockAvailable: true },
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
    },
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
  if (!sent) throw new HttpError(502, 'Discord belum dapat menerima notifikasi. Periksa webhook dan koneksi internet backend.');
  await prisma.activityLog.create({ data: { userId: req.user.id, action: 'DISCORD_WEBHOOK_TESTED', detail: `Admin ${req.user.username} berhasil menguji koneksi webhook Discord.` } });
  res.json({ ok: true, message: 'Tes Discord berhasil. Periksa channel Discord yang terhubung.' });
}));

const orderInclude = {
  items: true,
  user: { select: { id: true, username: true, email: true } },
  statusHistory: { include: { changedBy: { select: { username: true, role: true } } }, orderBy: { createdAt: 'asc' } },
  archivedBy: { select: { id: true, username: true } },
};

router.get('/orders', asyncHandler(async (req, res) => {
  const statusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED']).optional();
  const view = z.enum(['active', 'archive']).default('active').parse(req.query.view ?? 'active');
  const status = statusSchema.parse(req.query.status);
  const where = view === 'archive' ? { archivedAt: { not: null } } : { archivedAt: null };
  if (status) where.status = status;
  const orders = await prisma.order.findMany({
    where, include: orderInclude, orderBy: view === 'archive' ? { archivedAt: 'desc' } : { createdAt: 'desc' }, take: 1000,
  });
  res.json({ orders: orders.map(serializeOrder), view });
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
  res.json({ ...result, message: `${result.archivedCount} pesanan dipindahkan ke arsip. Riwayat dan stok tidak diubah.` });
}));

// Pulihkan satu pesanan dari arsip ke daftar operasional tanpa mengubah status atau stok.
router.post('/orders/:id/restore', asyncHandler(async (req, res) => {
  const updated = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: req.params.id } });
    if (!order) throw new HttpError(404, 'Pesanan tidak ditemukan.');
    if (!order.archivedAt) throw new HttpError(409, 'Pesanan ini tidak berada di arsip.');
    const changed = await tx.order.updateMany({
      where: { id: order.id, archivedAt: { not: null } },
      data: { archivedAt: null, archivedById: null },
    });
    if (changed.count !== 1) throw new HttpError(409, 'Pesanan berubah saat dipulihkan. Muat ulang halaman lalu coba lagi.');
    await tx.activityLog.create({ data: {
      userId: req.user.id, action: 'ORDER_RESTORED',
      detail: `Memulihkan pesanan ${order.orderNumber} dari arsip ke daftar aktif.`,
    } });
    return tx.order.findUnique({ where: { id: order.id }, include: orderInclude });
  }, { isolationLevel: 'Serializable' });
  res.json({ order: serializeOrder(updated), message: `Pesanan ${updated.orderNumber} berhasil dipulihkan ke daftar aktif. Status dan stok tidak diubah.` });
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
      if (order.status === 'APPROVED') {
        for (const item of order.items) {
          const changed = await tx.resource.updateMany({
            where: { id: item.resourceId, stockReserved: { gte: item.quantity } },
            data: { stockReserved: { decrement: item.quantity }, stockAvailable: { increment: item.quantity } },
          });
          if (changed.count !== 1) throw new HttpError(409, `Cadangan stok ${item.resourceName} untuk ${order.orderNumber} tidak konsisten. Seluruh pembatalan dibatalkan, tidak ada perubahan yang disimpan.`);
          await tx.stockMovement.create({ data: {
            resourceId: item.resourceId, userId: req.user.id, orderId: order.id,
            type: 'RELEASED', quantity: item.quantity,
            note: `Cadangan dilepas karena pembatalan massal ${order.orderNumber}. ${data.reason}`.trim(),
          } });
        }
        approvedCancelled += 1;
      } else {
        pendingCancelled += 1;
      }
      const note = data.reason || 'Pembatalan massal oleh admin.';
      const changedOrder = await tx.order.updateMany({
        where: { id: order.id, archivedAt: null, status: order.status },
        data: { status: 'CANCELLED', adminNotes: order.adminNotes ? `${order.adminNotes}\n\n[Bulk cancel] ${note}` : note },
      });
      if (changedOrder.count !== 1) throw new HttpError(409, `Status ${order.orderNumber} berubah selama proses. Seluruh pembatalan dibatalkan.`);
      await tx.orderStatusHistory.create({ data: {
        orderId: order.id, changedById: req.user.id, fromStatus: order.status, toStatus: 'CANCELLED',
        note: `Pembatalan massal oleh admin. ${note}`.trim(),
      } });
      await notifyOrderOwner(tx, order, {
        type: 'ORDER_STATUS', title: 'Pesanan dibatalkan admin',
        message: `Pesanan ${order.orderNumber} dibatalkan oleh admin. ${note}`.trim(),
      });
    }
    await tx.activityLog.create({ data: {
      userId: req.user.id, action: 'ORDERS_BULK_CANCELLED',
      detail: `Pembatalan massal: ${pendingCancelled} Pending dan ${approvedCancelled} Approved. Alasan: ${data.reason || 'Tidak dicantumkan.'}`,
    } });
    return { pendingCancelled, approvedCancelled, totalCancelled: pendingCancelled + approvedCancelled };
  }, { isolationLevel: 'Serializable', timeout: 30000 });
  void sendDiscordNotification({ title: 'Pembatalan massal pesanan', description: `Admin membatalkan ${result.totalCancelled} pesanan aktif (${result.pendingCancelled} Pending, ${result.approvedCancelled} Approved).`, color: 0xD97706 });
  res.json({ ...result, message: `${result.totalCancelled} pesanan aktif dibatalkan. Stok cadangan dari ${result.approvedCancelled} pesanan Approved telah dikembalikan.` });
}));

router.post('/orders/:id/approve', asyncHandler(async (req, res) => {
  const updated = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!order) throw new HttpError(404, 'Pesanan tidak ditemukan.');
    if (order.status !== 'PENDING') throw new HttpError(409, 'Hanya pesanan Pending yang dapat disetujui.');

    for (const item of order.items) {
      // Atomic conditional update: only reserve if enough stock is still available.
      const changed = await tx.resource.updateMany({
        where: { id: item.resourceId, isActive: true, stockAvailable: { gte: item.quantity } },
        data: { stockAvailable: { decrement: item.quantity }, stockReserved: { increment: item.quantity } },
      });
      if (changed.count !== 1) throw new HttpError(409, `Stok ${item.resourceName} tidak mencukupi. Pesanan belum disetujui.`);
      await tx.stockMovement.create({ data: {
        resourceId: item.resourceId, userId: req.user.id, orderId: order.id,
        type: 'RESERVED', quantity: item.quantity, note: `Cadangan untuk ${order.orderNumber}`,
      } });
    }
    await tx.activityLog.create({ data: { userId: req.user.id, action: 'ORDER_APPROVED', detail: `Menyetujui pesanan ${order.orderNumber}` } });
    await tx.orderStatusHistory.create({ data: {
      orderId: order.id, changedById: req.user.id, fromStatus: 'PENDING', toStatus: 'APPROVED',
      note: 'Pesanan disetujui admin dan stok berhasil dicadangkan.',
    } });
    await notifyOrderOwner(tx, order, {
      type: 'ORDER_STATUS', title: 'Pesanan disetujui',
      message: `Pesanan ${order.orderNumber} disetujui. Stok sudah dicadangkan dan menunggu penyerahan resource.`,
    });
    return tx.order.update({ where: { id: order.id }, data: { status: 'APPROVED', approvedAt: new Date() }, include: orderInclude });
  }, { isolationLevel: 'Serializable' });
  void sendDiscordNotification({ title: 'Pesanan disetujui', description: `Pesanan **${updated.orderNumber}** milik **${updated.user?.username || 'anggota'}** disetujui. Stok telah dicadangkan.` });
  res.json({ order: serializeOrder(updated), message: 'Pesanan disetujui dan stok berhasil dicadangkan.' });
}));

router.post('/orders/:id/reject', asyncHandler(async (req, res) => {
  const data = z.object({ adminNotes: z.string().trim().max(500).optional().default('') }).parse(req.body ?? {});
  const updated = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: req.params.id } });
    if (!order) throw new HttpError(404, 'Pesanan tidak ditemukan.');
    if (order.status !== 'PENDING') throw new HttpError(409, 'Hanya pesanan Pending yang dapat ditolak.');
    await tx.activityLog.create({ data: { userId: req.user.id, action: 'ORDER_REJECTED', detail: `Menolak pesanan ${order.orderNumber}` } });
    await tx.orderStatusHistory.create({ data: {
      orderId: order.id, changedById: req.user.id, fromStatus: 'PENDING', toStatus: 'REJECTED',
      note: data.adminNotes || 'Pesanan ditolak oleh admin.',
    } });
    await notifyOrderOwner(tx, order, {
      type: 'ORDER_STATUS', title: 'Pesanan ditolak',
      message: `Pesanan ${order.orderNumber} ditolak oleh admin.${data.adminNotes ? ` Catatan: ${data.adminNotes}` : ''}`,
    });
    return tx.order.update({ where: { id: order.id }, data: { status: 'REJECTED', adminNotes: data.adminNotes }, include: orderInclude });
  }, { isolationLevel: 'Serializable' });
  void sendDiscordNotification({ title: 'Pesanan ditolak', description: `Pesanan **${updated.orderNumber}** ditolak oleh admin.` , color: 0xD97706 });
  res.json({ order: serializeOrder(updated) });
}));

router.post('/orders/:id/complete', asyncHandler(async (req, res) => {
  const data = z.object({ handoverNote: z.string().trim().max(500).optional().default('') }).parse(req.body ?? {});
  const updated = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!order) throw new HttpError(404, 'Pesanan tidak ditemukan.');
    if (order.status !== 'APPROVED') throw new HttpError(409, 'Hanya pesanan Approved yang dapat diselesaikan.');
    const cashInitialized = await tx.gangCashEntry.findFirst({ where: { type: 'OPENING_BALANCE' }, select: { id: true } });
    if (!cashInitialized) throw new HttpError(409, 'Atur saldo awal kas terlebih dahulu melalui menu Keuangan & Kas Gang sebelum menyelesaikan pesanan.');
    const existingIncome = await tx.gangCashEntry.findUnique({ where: { orderId: order.id }, select: { id: true } });
    if (existingIncome) throw new HttpError(409, 'Pemasukan untuk pesanan ini sudah pernah dicatat. Tidak ada pemasukan ganda yang dibuat.');
    const completedAt = new Date();
    const transition = await tx.order.updateMany({ where: { id: order.id, status: 'APPROVED' }, data: { status: 'COMPLETED', completedAt } });
    if (transition.count !== 1) throw new HttpError(409, 'Status pesanan berubah saat diproses. Muat ulang data sebelum mencoba lagi.');
    for (const item of order.items) {
      const changed = await tx.resource.updateMany({
        where: { id: item.resourceId, stockReserved: { gte: item.quantity } },
        data: { stockReserved: { decrement: item.quantity } },
      });
      if (changed.count !== 1) throw new HttpError(409, `Cadangan stok ${item.resourceName} tidak konsisten. Periksa stock movement.`);
      await tx.stockMovement.create({ data: {
        resourceId: item.resourceId, userId: req.user.id, orderId: order.id,
        type: 'COMPLETED', quantity: item.quantity, note: `Resource dikeluarkan untuk ${order.orderNumber}`,
      } });
    }
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
    await notifyOrderOwner(tx, order, {
      type: 'ORDER_STATUS', title: 'Resource telah diserahkan',
      message: `Pesanan ${order.orderNumber} telah diserahkan dan ditandai selesai oleh admin.${data.handoverNote ? ` Catatan: ${data.handoverNote}` : ''}`,
    });
    return tx.order.findUnique({ where: { id: order.id }, include: orderInclude });
  }, { isolationLevel: 'Serializable' });
  void sendDiscordNotification({ title: 'Resource diserahkan', description: `Pesanan **${updated.orderNumber}** milik **${updated.user?.username || 'anggota'}** selesai. Resource telah diserahkan.` , color: 0x16A34A });
  res.json({ order: serializeOrder(updated), message: 'Pesanan selesai. Stok yang dicadangkan telah dikeluarkan dari inventory.' });
}));

router.post('/orders/:id/cancel', asyncHandler(async (req, res) => {
  const data = z.object({ adminNotes: z.string().trim().max(500).optional().default('') }).parse(req.body ?? {});
  const updated = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!order) throw new HttpError(404, 'Pesanan tidak ditemukan.');
    if (!['PENDING', 'APPROVED'].includes(order.status)) throw new HttpError(409, 'Pesanan ini tidak dapat dibatalkan pada status sekarang.');
    if (order.status === 'APPROVED') {
      for (const item of order.items) {
        const changed = await tx.resource.updateMany({
          where: { id: item.resourceId, stockReserved: { gte: item.quantity } },
          data: { stockReserved: { decrement: item.quantity }, stockAvailable: { increment: item.quantity } },
        });
        if (changed.count !== 1) throw new HttpError(409, `Cadangan stok ${item.resourceName} tidak konsisten.`);
        await tx.stockMovement.create({ data: {
          resourceId: item.resourceId, userId: req.user.id, orderId: order.id,
          type: 'RELEASED', quantity: item.quantity, note: `Cadangan dilepas karena ${order.orderNumber} dibatalkan`,
        } });
      }
    }
    await tx.activityLog.create({ data: { userId: req.user.id, action: 'ORDER_CANCELLED', detail: `Membatalkan pesanan ${order.orderNumber}` } });
    await tx.orderStatusHistory.create({ data: {
      orderId: order.id, changedById: req.user.id, fromStatus: order.status, toStatus: 'CANCELLED',
      note: data.adminNotes || 'Pesanan dibatalkan oleh admin.',
    } });
    await notifyOrderOwner(tx, order, {
      type: 'ORDER_STATUS', title: 'Pesanan dibatalkan',
      message: `Pesanan ${order.orderNumber} dibatalkan oleh admin.${data.adminNotes ? ` Catatan: ${data.adminNotes}` : ''}`,
    });
    return tx.order.update({ where: { id: order.id }, data: { status: 'CANCELLED', adminNotes: data.adminNotes }, include: orderInclude });
  }, { isolationLevel: 'Serializable' });
  void sendDiscordNotification({ title: 'Pesanan dibatalkan', description: `Pesanan **${updated.orderNumber}** dibatalkan oleh admin.`, color: 0xD97706 });
  res.json({ order: serializeOrder(updated), message: 'Pesanan dibatalkan.' });
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
    prisma.user.count({ where: { role: 'USER' } }),
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
});

// Akun user hanya dapat dibuat oleh admin yang sudah terautentikasi.
router.post('/users', asyncHandler(async (req, res) => {
  const data = createUserSchema.parse(req.body);
  const username = data.username;
  const email = data.email.toLowerCase();
  const duplicate = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] }, select: { id: true } });
  if (duplicate) throw new HttpError(409, 'Username atau email sudah digunakan.');
  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { username, email, passwordHash, role: 'USER', isActive: true, registrationStatus: 'APPROVED' },
      select: { id: true, username: true, email: true, role: true, isActive: true, registrationStatus: true, createdAt: true },
    });
    await tx.notification.create({ data: {
      userId: created.id, type: 'ACCOUNT_CREATED', title: 'Akun 30sFams dibuat',
      message: 'Akun kamu sudah dibuat oleh admin 30sFams. Gunakan username/email dan password sementara yang diberikan admin untuk login.',
    } });
    await tx.activityLog.create({ data: {
      userId: req.user.id, action: 'USER_CREATED', detail: `Membuat akun user ${created.username} (${created.email}).`,
    } });
    return created;
  });
  res.status(201).json({ user, message: `Akun ${user.username} berhasil dibuat. Sampaikan kredensial awal secara pribadi kepada pemilik akun.` });
}));

router.patch('/users/:id/approval', asyncHandler(async (req, res) => {
  const data = z.object({ status: z.enum(['APPROVED', 'REJECTED']) }).parse(req.body ?? {});
  const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, username: true, email: true, role: true, registrationStatus: true, isActive: true } });
  if (!target) throw new HttpError(404, 'Pengguna tidak ditemukan.');
  if (target.role !== 'USER') throw new HttpError(403, 'Akun admin tidak dapat diproses sebagai pendaftaran user.');
  if (target.registrationStatus === 'APPROVED') throw new HttpError(409, 'Akun ini sudah diverifikasi. Gunakan pengaturan status akun untuk menonaktifkan atau mengaktifkan akses.');
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
        : 'Pendaftaran kamu belum disetujui. Hubungi admin 30sFams untuk informasi lebih lanjut.',
    } });
    await tx.activityLog.create({ data: {
      userId: req.user.id,
      action: data.status === 'APPROVED' ? 'USER_REGISTRATION_APPROVED' : 'USER_REGISTRATION_REJECTED',
      detail: `${data.status === 'APPROVED' ? 'Menyetujui' : 'Menolak'} pendaftaran ${target.username} (${target.email}).`,
    } });
    return updated;
  });
  res.json({ user, message: data.status === 'APPROVED' ? `Akun ${user.username} sudah disetujui dan dapat login.` : `Pendaftaran ${user.username} ditolak.` });
}));

router.get('/users', asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, email: true, role: true, isActive: true, registrationStatus: true, createdAt: true, _count: { select: { orders: true } } },
    orderBy: { createdAt: 'desc' }, take: 500,
  });
  res.json({ users });
}));

router.patch('/users/:id/status', asyncHandler(async (req, res) => {
  const data = z.object({ isActive: z.boolean() }).parse(req.body ?? {});
  const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, username: true, role: true, isActive: true, registrationStatus: true } });
  if (!target) throw new HttpError(404, 'Pengguna tidak ditemukan.');
  if (target.role !== 'USER') throw new HttpError(403, 'Status akun admin tidak dapat diubah dari menu ini.');
  if (target.registrationStatus !== 'APPROVED') throw new HttpError(409, 'Pendaftaran harus disetujui terlebih dahulu sebelum status akun diubah.');
  if (target.isActive === data.isActive) return res.json({ user: target, message: 'Status akun tidak berubah.' });
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
      select: { id: true, username: true, email: true, isActive: true, registrationStatus: true, createdAt: true },
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
      totalMembers: members.length,
      activeMembers: members.filter((member) => member.isActive && member.registrationStatus === 'APPROVED').length,
      pendingRegistrations: members.filter((member) => member.registrationStatus === 'PENDING').length,
      completedOrders: rows.reduce((sum, row) => sum + row.completedOrders, 0),
      completedAmount: Number(rows.reduce((sum, row) => sum + row.totalSpend, 0).toFixed(2)),
      completedQuantity: rows.reduce((sum, row) => sum + row.completedQuantity, 0),
    },
    members: rows,
  });
}));

router.get('/activity', asyncHandler(async (_req, res) => {
  const logs = await prisma.activityLog.findMany({ include: { user: { select: { username: true } } }, orderBy: { createdAt: 'desc' }, take: 100 });
  res.json({ logs });
}));

export default router;
