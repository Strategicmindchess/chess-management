/**
 * Backfill sessionNumber on class_instances.
 * 
 * Extracts the lecture number from lectureName (e.g. "Lecture 6: ..." → 6)
 * and writes it to sessionNumber.
 *
 * Run: npx tsx backfill-session-number.ts
 */
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

async function main() {
  const { prisma } = await import('./src/lib/prisma');

  // Use raw SQL for speed — extract the number after "Lecture " from lectureName
  const result = await prisma.$executeRawUnsafe(`
    UPDATE class_instances
    SET "sessionNumber" = CAST(
      substring("lectureName" FROM 'Lecture ([0-9]+)')
      AS INTEGER
    )
    WHERE "lectureName" IS NOT NULL
      AND "sessionNumber" IS NULL
  `);

  console.log(`✅ Backfilled sessionNumber for ${result} rows.`);

  // Verify
  const sample = await prisma.$queryRaw`
    SELECT "lectureName", "sessionNumber" 
    FROM class_instances 
    WHERE "sessionNumber" IS NOT NULL 
    ORDER BY "sessionNumber" 
    LIMIT 5
  `;
  console.log('\nSample rows:');
  console.log(sample);

  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
