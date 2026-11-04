import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { HttpError, asyncHandler, serializeResource } from '../lib/http.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { uploadsDir } from '../lib/uploads.js';
import { sendDiscordNotification } from '../lib/discord.js';
import {
  uploadImage,
  getImageUrl,
  deleteImage,
} from '../lib/storage.js';

const router = Router();
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 }, // Maksimal 5 MB per gambar.
});

// Menampilkan gambar dari Neon Object Storage (Private Bucket)
router.get(
  '/images/:key',
  requireAuth,
  asyncHandler(async (req, res) => {
    const key = req.params.key;

    // Validasi nama file gambar
    if (!/^[a-f0-9-]{36}\.(jpg|png|webp|gif)$/i.test(key)) {
      throw new HttpError(400, 'Nama file gambar tidak valid.');
    }

    if (!objectStorageEnabled) {
      throw new HttpError(404, 'Penyimpanan gambar tidak tersedia.');
    }

    const imageUrl = await getImageUrl(key);
    res.redirect(imageUrl);
  })
);

function imageExtension(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6))) return 'gif';
  return null;
}


const objectStorageEnabled = Boolean(
  process.env.AWS_ENDPOINT_URL_S3 &&
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_BUCKET_NAME
);

function storedImagePath(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith('/uploads/')) return null;

  const filename = path.basename(imageUrl);
  if (!filename || filename === '.' || filename === '..') return null;

  return path.join(uploadsDir, filename);
}

async function removeStoredImage(imageUrl) {
  if (!imageUrl) return;

  const storageMatch = imageUrl.match(
    /^\/api\/resources\/images\/([A-Za-z0-9._-]+)$/
  );

  if (storageMatch) {
    await deleteImage(storageMatch[1]);
    return;
  }

  const target = storedImagePath(imageUrl);
  if (!target) return;

  try {
    await unlink(target);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

const categories = ['CLASS1', 'CLASS2', 'CLASS3', 'NARKO', 'VEST', 'ATTACHMENT', 'AMMO', 'OTHER'];
const createSchema = z.object({
  name: z.string().trim().min(2).max(100),
  sku: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/),
  description: z.string().max(500).optional().default(''),
  category: z.enum(categories),
  unit: z.string().trim().min(1).max(24).default('unit'),
  unitPrice: z.coerce.number().min(0).max(1_000_000_000),
  initialStock: z.coerce.number().int().min(0).max(1_000_000).default(0),
});
const updateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  category: z.enum(categories).optional(),
  unit: z.string().trim().min(1).max(24).optional(),
  unitPrice: z.coerce.number().min(0).max(1_000_000_000).optional(),
  isActive: z.boolean().optional(),
});

router.use(requireAuth);

router.get('/stash', requireAdmin, asyncHandler(async (req, res) => {
  // Stash is a view over the same Resource rows used by inventory and ordering.
  // It intentionally includes both orderable resources and stash-only OTHER items.
  const resources = await prisma.resource.findMany({
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
  res.json({ resources: resources.map(serializeResource) });
}));

router.get('/', asyncHandler(async (req, res) => {
  const { category, search, all } = req.query;
  const isAdminInventoryView = req.user.role === 'ADMIN' && all === 'true';
  const where = {};

  // OTHER items are served only by the dedicated /stash endpoint.
  if (category && categories.includes(String(category))) {
    const requestedCategory = String(category);
    if (requestedCategory === 'OTHER') {
      res.json({ resources: [] });
      return;
    }
    where.category = requestedCategory;
  }

  if (search) where.OR = [
    { name: { contains: String(search), mode: 'insensitive' } },
    { sku: { contains: String(search), mode: 'insensitive' } },
  ];
  if (!isAdminInventoryView) where.isActive = true;
  const resources = await prisma.resource.findMany({
    where,
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
  // Keep OTHER exclusive to /stash, including the admin inventory listing.
  // Filtering in application code also keeps existing databases compatible
  // until the additive OTHER enum migration has been applied.
  const visibleResources = resources.filter((resource) => resource.category !== 'OTHER');
  res.json({ resources: visibleResources.map(serializeResource) });
}));

router.post('/', requireAdmin, asyncHandler(async (req, res) => {
  const data = createSchema.parse(req.body);
  const resource = await prisma.$transaction(async (tx) => {
    const created = await tx.resource.create({
      data: {
        name: data.name, sku: data.sku.toUpperCase(), description: data.description,
        category: data.category, unit: data.unit, unitPrice: data.unitPrice,
        stockAvailable: data.initialStock,
      },
    });
    if (data.initialStock > 0) {
      await tx.stockMovement.create({ data: { resourceId: created.id, userId: req.user.id, type: 'RESTOCK', quantity: data.initialStock, note: 'Stok awal saat resource dibuat' } });
    }
    await tx.activityLog.create({ data: { userId: req.user.id, action: 'RESOURCE_CREATED', detail: `Menambahkan resource ${created.name} (${created.sku})` } });
    return created;
  });
  void sendDiscordNotification({ title: resource.category === 'OTHER' ? 'Item Stash baru' : 'Resource inventory baru', description: resource.category === 'OTHER' ? `Item **${resource.name}** (${resource.sku}) ditambahkan ke Stash dan tidak tersedia di katalog pemesanan.` : `Resource **${resource.name}** (${resource.sku}) ditambahkan ke katalog 30sFams.` });
  res.status(201).json({ resource: serializeResource(resource) });
}));

// Admin dapat mengunggah atau mengganti gambar resource yang sudah ada.
router.post('/:id/image', requireAdmin, imageUpload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Pilih file gambar terlebih dahulu.');
  const extension = imageExtension(req.file.buffer);
  if (!extension) throw new HttpError(400, 'Format gambar harus JPG, PNG, WEBP, atau GIF.');

  const current = await prisma.resource.findUnique({ where: { id: req.params.id } });
  if (!current) throw new HttpError(404, 'Resource tidak ditemukan.');

const filename = `${randomUUID()}.${extension}`;
const contentTypes = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

const imageUrl = objectStorageEnabled
  ? `/api/resources/images/${filename}`
  : `/uploads/${filename}`;

if (objectStorageEnabled) {
  await uploadImage(filename, req.file.buffer, contentTypes[extension]);
} else {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Konfigurasi Neon Object Storage belum lengkap.');
  }

  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), req.file.buffer, { flag: 'wx' });
}

  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      const resource = await tx.resource.update({ where: { id: current.id }, data: { imageUrl } });
      await tx.activityLog.create({
        data: { userId: req.user.id, action: 'RESOURCE_IMAGE_UPDATED', detail: `Memperbarui gambar resource ${resource.name} (${resource.sku})` },
      });
      return resource;
    });
  } catch (error) {
    await removeStoredImage(imageUrl);
    throw error;
  }

  await removeStoredImage(current.imageUrl);
  res.json({ resource: serializeResource(updated) });
}));

// Admin dapat menghapus gambar dan kembali ke ikon bawaan.
router.delete('/:id/image', requireAdmin, asyncHandler(async (req, res) => {
  const current = await prisma.resource.findUnique({ where: { id: req.params.id } });
  if (!current) throw new HttpError(404, 'Resource tidak ditemukan.');
  const updated = await prisma.$transaction(async (tx) => {
    const resource = await tx.resource.update({ where: { id: current.id }, data: { imageUrl: null } });
    await tx.activityLog.create({
      data: { userId: req.user.id, action: 'RESOURCE_IMAGE_REMOVED', detail: `Menghapus gambar resource ${resource.name} (${resource.sku})` },
    });
    return resource;
  });
  await removeStoredImage(current.imageUrl);
  res.json({ resource: serializeResource(updated) });
}));

router.patch('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const data = updateSchema.parse(req.body);
  if (!Object.keys(data).length) throw new HttpError(400, 'Tidak ada perubahan yang dikirim.');
  const resource = await prisma.resource.update({ where: { id: req.params.id }, data });
  await prisma.activityLog.create({ data: { userId: req.user.id, action: 'RESOURCE_UPDATED', detail: `Memperbarui resource ${resource.name} (${resource.sku})` } });
  res.json({ resource: serializeResource(resource) });
}));

router.patch('/:id/stock', requireAdmin, asyncHandler(async (req, res) => {
  const schema = z.object({ delta: z.coerce.number().int().min(-1_000_000).max(1_000_000).refine((v) => v !== 0), note: z.string().trim().min(3).max(250) });
  const data = schema.parse(req.body);
  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.resource.findUnique({ where: { id: req.params.id } });
    if (!current) throw new HttpError(404, 'Resource tidak ditemukan.');
    if (data.delta > 0) {
      await tx.resource.update({ where: { id: current.id }, data: { stockAvailable: { increment: data.delta } } });
    } else {
      const changed = await tx.resource.updateMany({
        where: { id: current.id, stockAvailable: { gte: Math.abs(data.delta) } },
        data: { stockAvailable: { decrement: Math.abs(data.delta) } },
      });
      if (changed.count !== 1) throw new HttpError(409, 'Stok tersedia tidak cukup untuk pengurangan tersebut.');
    }
    await tx.stockMovement.create({ data: { resourceId: current.id, userId: req.user.id, type: data.delta > 0 ? 'RESTOCK' : 'ADJUSTMENT', quantity: Math.abs(data.delta), note: data.note } });
    await tx.activityLog.create({ data: { userId: req.user.id, action: 'STOCK_ADJUSTED', detail: `${data.delta > 0 ? 'Menambah' : 'Mengurangi'} ${Math.abs(data.delta)} ${current.unit} ${current.name}: ${data.note}` } });
    const updated = await tx.resource.findUnique({ where: { id: current.id } });
    return { resource: updated, name: current.name, sku: current.sku, unit: current.unit };
  }, { isolationLevel: 'Serializable' });
  void sendDiscordNotification({ title: data.delta > 0 ? 'Stok resource ditambah' : 'Stok resource disesuaikan', description: `**${result.name}** (${result.sku}): ${data.delta > 0 ? '+' : ''}${data.delta} ${result.unit}. Alasan: ${data.note}`, color: data.delta > 0 ? 0x16A34A : 0xD97706 });
  res.json({ resource: serializeResource(result.resource) });
}));

router.get('/:id/movements', requireAdmin, asyncHandler(async (req, res) => {
  const movements = await prisma.stockMovement.findMany({
    where: { resourceId: req.params.id },
    include: { user: { select: { username: true } }, order: { select: { orderNumber: true } } },
    orderBy: { createdAt: 'desc' }, take: 100,
  });
  res.json({ movements });
}));

export default router;
