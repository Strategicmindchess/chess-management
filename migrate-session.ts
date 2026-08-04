import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

async function main() {
  const { prisma } = await import('./src/lib/prisma');
  
  // Step 1: Add the new startSession column, seeded from lectureIndex + 1
  await prisma.$executeRawUnsafe(`
    ALTER TABLE batches 
    ADD COLUMN IF NOT EXISTS "startSession" INTEGER DEFAULT 1
  `);
  
  await prisma.$executeRawUnsafe(`
    UPDATE batches 
    SET "startSession" = COALESCE("lectureIndex", 0) + 1
  `);
  
  const count = await prisma.$queryRaw`SELECT COUNT(*) as n FROM batches WHERE "startSession" IS NOT NULL`;
  console.log('Data migrated. Rows with startSession:', (count as any)[0].n);
  
  // Step 2: Add sessionNumber column to class_instances (nullable, no backfill needed)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE class_instances
    ADD COLUMN IF NOT EXISTS "sessionNumber" INTEGER
  `);
  
  console.log('sessionNumber column added to class_instances.');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
