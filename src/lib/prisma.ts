import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

const globalForPrisma = globalThis as unknown as { prisma_v4?: PrismaClient };

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set.');
  }

  const isDev = process.env.NODE_ENV !== 'production';

  // Railway PostgreSQL has limited connections (~20 on hobby).
  // 100 users will rarely exceed 3–5 concurrent DB operations.
  // Keeping the pool small saves ~5–10MB per idle connection.
  const adapter = new PrismaPg({
    connectionString,
    max: isDev ? 3 : 5,                 // dev needs fewer; prod caps at 5
    idleTimeoutMillis: 30_000,           // free idle connections after 30s
    connectionTimeoutMillis: 10_000,
  });

  return new PrismaClient({
    adapter,
    log: isDev ? ['warn', 'error'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma_v4 ?? createPrismaClient();

// Reuse the same client across hot-reloads in development instead of
// creating a new connection pool on every file change.
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma_v4 = prisma;
}
