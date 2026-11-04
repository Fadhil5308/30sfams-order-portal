import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { HttpError, asyncHandler, serializeResource } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const rows = await prisma.favoriteResource.findMany({
    where: { userId: req.user.id },
    include: { resource: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ favorites: rows.filter((row) => row.resource.isActive && row.resource.category !== 'OTHER').map((row) => ({
    id: row.id, resourceId: row.resourceId, createdAt: row.createdAt, resource: serializeResource(row.resource),
  })) });
}));

router.post('/:resourceId', asyncHandler(async (req, res) => {
  const resourceId = z.string().min(1).max(100).parse(req.params.resourceId);
  const resource = await prisma.resource.findFirst({ where: { id: resourceId, isActive: true } });
  if (!resource || resource.category === 'OTHER') throw new HttpError(404, 'Resource tidak ditemukan atau tidak tersedia untuk katalog.');
  const favorite = await prisma.favoriteResource.upsert({
    where: { userId_resourceId: { userId: req.user.id, resourceId } },
    create: { userId: req.user.id, resourceId },
    update: {},
    select: { id: true, resourceId: true, createdAt: true },
  });
  res.status(201).json({ favorite, message: `${resource.name} ditambahkan ke favorit.` });
}));

router.delete('/:resourceId', asyncHandler(async (req, res) => {
  const resourceId = z.string().min(1).max(100).parse(req.params.resourceId);
  await prisma.favoriteResource.deleteMany({ where: { userId: req.user.id, resourceId } });
  res.json({ message: 'Resource dihapus dari favorit.' });
}));

export default router;
