import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { HttpError, asyncHandler } from '../lib/http.js';

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.fivem_session;
  if (!token) throw new HttpError(401, 'Please sign in first.');
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new HttpError(401, 'Your session is invalid or has expired.');
  }
  const user = await prisma.user.findUnique({
    where: { id: payload.sub, isActive: true, registrationStatus: 'APPROVED', deletedAt: null },
    select: { id: true, username: true, email: true, role: true, sessionVersion: true },
  });
  if (!user) throw new HttpError(401, 'Account not found or deactivated. Please contact a 30sFams administrator.');
  if ((payload.ver ?? 0) !== user.sessionVersion) throw new HttpError(401, 'Your session has been updated. Please sign in again.');
  req.user = user;
  next();
});

export function requireAdmin(req, _res, next) {
  if (req.user?.role !== 'ADMIN') return next(new HttpError(403, 'Administrator access required.'));
  next();
}
