import { PrismaClient } from '../generated/prisma/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis;

// Neon already provides PgBouncer on the pooled DATABASE_URL. Keep each
// serverless instance's local pg pool small so warm instances do not hoard
// idle client connections between requests.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  max: process.env.VERCEL === '1' ? 2 : 10,
  idleTimeoutMillis: process.env.VERCEL === '1' ? 5000 : 10000,
  connectionTimeoutMillis: 10000,
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
globalForPrisma.prisma = prisma;
