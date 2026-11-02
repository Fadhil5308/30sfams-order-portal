import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { mkdir } from 'node:fs/promises';
import { uploadsDir } from './lib/uploads.js';
import { ZodError } from 'zod';
import authRoutes from './routes/auth.js';
import resourceRoutes from './routes/resources.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';
import notificationRoutes from './routes/notifications.js';
import financeRoutes from './routes/finance.js';
import favoriteRoutes from './routes/favorites.js';
import { prisma } from './lib/prisma.js';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL belum diatur. Salin .env.example menjadi .env.');
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET wajib memiliki minimal 32 karakter.');

const app = express();
const port = Number(process.env.PORT || 4000);
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim());

const isProduction = process.env.NODE_ENV === 'production';
const trustProxy = process.env.TRUST_PROXY;
if (trustProxy) app.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : (trustProxy === 'true' ? 1 : trustProxy));
else if (isProduction) app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('Pragma', 'no-cache');
  next();
});
app.use(cors({ origin(origin, callback) {
  if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
  return callback(null, false);
}, credentials: true, optionsSuccessStatus: 204 }));

// Cookie-authenticated mutations must originate from an explicitly trusted frontend.
app.use((req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (!origin && isProduction) return res.status(403).json({ message: 'Origin request tidak tersedia. Permintaan ditolak demi keamanan.' });
  if (origin && !allowedOrigins.includes(origin)) return res.status(403).json({ message: 'Origin tidak diizinkan.' });
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Folder gambar disajikan agar katalog dapat menampilkan gambar resource.
await mkdir(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir, { fallthrough: false, maxAge: '7d', immutable: true }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Terlalu banyak percobaan login/registrasi. Coba lagi 15 menit kemudian.' } });
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Batas permintaan API tercapai. Coba lagi beberapa saat.' } });
const orderLimiter = rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Terlalu banyak percobaan membuat pesanan. Tunggu satu menit.' } });
app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/orders', orderLimiter);

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'fivem-resource-portal-api' }));
app.use('/api/auth', authRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin/finance', financeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/favorites', favoriteRoutes);

app.use((req, res) => res.status(404).json({ message: `Endpoint ${req.method} ${req.path} tidak ditemukan.` }));
app.use((error, _req, res, _next) => {
  if (error instanceof ZodError) {
    return res.status(400).json({ message: 'Data yang dikirim belum valid.', errors: error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })) });
  }
  if (error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'Ukuran gambar maksimal 5 MB.' });
  if (error.code === 'P2002') return res.status(409).json({ message: 'Data unik sudah digunakan (misalnya username, email, atau SKU).' });
  if (error.code === 'P2025') return res.status(404).json({ message: 'Data tidak ditemukan.' });
  if (error.code === 'P2034') return res.status(409).json({ message: 'Ada transaksi bersamaan. Muat ulang data lalu coba lagi.' });
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) console.error(error);
  res.status(status).json({ message: status >= 500 ? 'Terjadi kesalahan pada server.' : error.message });
});

const server = app.listen(port, () => console.log(`API berjalan di http://localhost:${port}`));

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
