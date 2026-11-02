import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const username = process.env.ADMIN_USERNAME;
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !email || !password || password.length < 12) {
    throw new Error('Atur ADMIN_USERNAME, ADMIN_EMAIL, dan ADMIN_PASSWORD (minimal 12 karakter) di backend/.env sebelum menjalankan npm run db:seed.');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.upsert({
    where: { email },
    update: { username, passwordHash, role: 'ADMIN' },
    create: { username, email, passwordHash, role: 'ADMIN' },
    select: { id: true, username: true, email: true, role: true },
  });
  console.log('Admin siap:', admin);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
