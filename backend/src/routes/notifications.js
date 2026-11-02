import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { HttpError, asyncHandler } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: req.user.id },
      include: { order: { select: { id: true, orderNumber: true } } },
      orderBy: { createdAt: 'desc' },
      take: 40,
    }),
    prisma.notification.count({ where: { userId: req.user.id, isRead: false } }),
  ]);
  res.json({ notifications, unreadCount });
}));

router.patch('/:id/read', asyncHandler(async (req, res) => {
  const id = z.string().min(1).parse(req.params.id);
  const existing = await prisma.notification.findFirst({ where: { id, userId: req.user.id } });
  if (!existing) throw new HttpError(404, 'Notifikasi tidak ditemukan.');
  const notification = existing.isRead ? existing : await prisma.notification.update({
    where: { id }, data: { isRead: true }, include: { order: { select: { id: true, orderNumber: true } } },
  });
  res.json({ notification });
}));

router.post('/read-all', asyncHandler(async (req, res) => {
  const result = await prisma.notification.updateMany({
    where: { userId: req.user.id, isRead: false },
    data: { isRead: true },
  });
  res.json({ markedRead: result.count, message: `${result.count} notifikasi ditandai sudah dibaca.` });
}));

export default router;
