import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { HttpError, asyncHandler } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { notifyAdmins } from '../lib/notifications.js';
import { sendDiscordNotification } from '../lib/discord.js';

const router = Router();
const loginSchema = z.object({ identifier: z.string().trim().min(1), password: z.string().min(1) });

function sessionCookieOptions() {
  const production = process.env.NODE_ENV === 'production';
  const sameSite = (process.env.COOKIE_SAME_SITE || (production ? 'none' : 'lax')).toLowerCase();
  if (!['lax', 'strict', 'none'].includes(sameSite)) throw new Error('COOKIE_SAME_SITE harus lax, strict, atau none.');
  return {
    httpOnly: true,
    secure: production || process.env.COOKIE_SECURE === 'true',
    sameSite,
    path: '/',
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
    maxAge: 12 * 60 * 60 * 1000,
  };
}

function setSession(res, user) {
  const token = jwt.sign({ sub: user.id, ver: user.sessionVersion ?? 0 }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '12h' });
  res.cookie('fivem_session', token, sessionCookieOptions());
}

const registerSchema = z.object({
  username: z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_.-]+$/, 'Username hanya boleh berisi huruf, angka, titik, garis bawah, atau strip.'),
  email: z.email().trim().max(150),
  password: z.string().min(12, 'Password minimal 12 karakter.').max(100),
});

// Public registration creates a pending account. An admin must explicitly approve it before login.
router.post('/register', asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body ?? {});
  const username = data.username;
  const email = data.email.toLowerCase();
  const duplicate = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] }, select: { id: true } });
  if (duplicate) throw new HttpError(409, 'Username atau email sudah digunakan.');
  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { username, email, passwordHash, role: 'USER', isActive: false, registrationStatus: 'PENDING' },
      select: { id: true, username: true, email: true, registrationStatus: true, createdAt: true },
    });
    await notifyAdmins(tx, {
      type: 'ACCOUNT_REGISTRATION', title: 'Pendaftaran anggota baru',
      message: `${created.username} (${created.email}) mendaftar dan menunggu persetujuan admin.`,
    });
    await tx.activityLog.create({ data: {
      userId: created.id, action: 'USER_REGISTRATION_PENDING',
      detail: `Pendaftaran publik dari ${created.username} (${created.email}) menunggu persetujuan admin.`,
    } });
    return created;
  });
  void sendDiscordNotification({ title: 'Pendaftaran anggota baru', description: `Anggota **${user.username}** mendaftar ke portal 30sFams dan menunggu persetujuan admin.`, color: 0xD97706 });
  res.status(201).json({
    user,
    message: 'Pendaftaran berhasil diterima. Akun kamu menunggu persetujuan admin 30sFams. Kamu dapat login setelah akun disetujui.',
  });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);
  const identifier = data.identifier.trim();
  const user = await prisma.user.findFirst({
    where: { deletedAt: null, OR: [{ email: identifier.toLowerCase() }, { username: identifier }] },
  });
  if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) throw new HttpError(401, 'Username/email atau password salah.');
  if (user.registrationStatus === 'PENDING') throw new HttpError(403, 'Pendaftaran kamu masih menunggu persetujuan admin 30sFams.');
  if (user.registrationStatus === 'REJECTED') throw new HttpError(403, 'Pendaftaran akun belum disetujui. Hubungi admin 30sFams untuk informasi lebih lanjut.');
  if (!user.isActive) throw new HttpError(403, 'Akun kamu sedang dinonaktifkan. Hubungi admin 30sFams.');
  setSession(res, user);
  res.json({ user: { id: user.id, username: user.username, email: user.email, role: user.role } });
}));


router.post('/change-password', requireAuth, asyncHandler(async (req, res) => {
  const data = z.object({
    currentPassword: z.string().min(1).max(100),
    newPassword: z.string().min(12, 'Password baru minimal 12 karakter.').max(100),
  }).parse(req.body ?? {});
  const account = await prisma.user.findUnique({ where: { id: req.user.id }, select: { passwordHash: true, sessionVersion: true } });
  if (!account) throw new HttpError(404, 'Akun tidak ditemukan.');
  const currentMatches = await bcrypt.compare(data.currentPassword, account.passwordHash);
  if (!currentMatches) throw new HttpError(400, 'Password saat ini tidak sesuai.');
  if (await bcrypt.compare(data.newPassword, account.passwordHash)) throw new HttpError(400, 'Password baru harus berbeda dari password saat ini.');
  const passwordHash = await bcrypt.hash(data.newPassword, 12);
  const updated = await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash, sessionVersion: { increment: 1 } }, select: { id: true, sessionVersion: true } });
  await prisma.activityLog.create({ data: { userId: req.user.id, action: 'PASSWORD_CHANGED', detail: `Pengguna ${req.user.username} mengganti password akun. Sesi lama dicabut.` } });
  setSession(res, updated);
  res.json({ message: 'Password berhasil diubah. Sesi pada perangkat lain telah dicabut.' });
}));

router.post('/logout', (_req, res) => {
  const options = sessionCookieOptions();
  delete options.maxAge;
  res.clearCookie('fivem_session', options);
  res.json({ message: 'Berhasil logout.' });
});

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

export default router;
