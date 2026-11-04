import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { HttpError, asyncHandler } from '../lib/http.js';

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.fivem_session;
  if (!token) throw new HttpError(401, 'Silakan login terlebih dahulu.');
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new HttpError(401, 'Sesi login tidak valid atau sudah berakhir.');
  }
  const user = await prisma.user.findUnique({
    where: { id: payload.sub, isActive: true, registrationStatus: 'APPROVED', deletedAt: null },
    select: { id: true, username: true, email: true, role: true, sessionVersion: true },
  });
  if (!user) throw new HttpError(401, 'Akun tidak ditemukan atau telah dinonaktifkan. Silakan hubungi admin 30sFams.');
  if ((payload.ver ?? 0) !== user.sessionVersion) throw new HttpError(401, 'Sesi sudah diperbarui. Silakan login kembali.');
  req.user = user;
  next();
});

export function requireAdmin(req, _res, next) {
  if (req.user?.role !== 'ADMIN') return next(new HttpError(403, 'Akses khusus admin.'));
  next();
}
