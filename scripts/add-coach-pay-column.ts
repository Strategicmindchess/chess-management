/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * SMC CRM: Add coach_pay to ClassInstance & Backfill Script
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Run with: npx tsx scripts/add-coach-pay-column.ts
 * 
 * 1. Adds column "coach_pay" (INTEGER, nullable) to "class_instances"
 * 2. Adds column "coachPay" (INTEGER, nullable) alias for Prisma
 * 3. Backfill Rule (28 Oct 2026 Cutoff):
 *    - Past classes (< 28 Oct 2026 IST): Left NULL (Protected & untouched)
 *    - Future classes (>= 28 Oct 2026 IST): Populated from parent batch's payoutRate
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { fromZonedTime } from 'date-fns-tz';

// Cutoff Date: 28 October 2026, 00:00:00 IST (UTC 2026-10-27T18:30:00.000Z)
const CUTOFF_DATE_IST = '2026-10-28 00:00:00';
const CUTOFF_TIMESTAMP_UTC = fromZonedTime(CUTOFF_DATE_IST, 'Asia/Kolkata');

async function main() {
  console.log('\n♟️ SMC CRM: Add coach_pay to class_instances\n');

  // 1. DDL: Add columns
  console.log('1. Adding "coach_pay" and "coachPay" columns to class_instances...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "class_instances" 
    ADD COLUMN IF NOT EXISTS "coach_pay" INTEGER;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "class_instances" 
    ADD COLUMN IF NOT EXISTS "coachPay" INTEGER;
  `);
  console.log('✅ Columns verified / added successfully.');

  // 2. DML: Backfill future classes (>= 28 Oct 2026 IST) from batch.payoutRate
  console.log('\n2. Backfilling future classes (>= 28 Oct 2026 IST) with batch.payoutRate...');
  const updatedCount = await prisma.$executeRaw`
    UPDATE "class_instances" ci
    SET 
      "coach_pay" = b."payoutRate",
      "coachPay" = b."payoutRate"
    FROM "batches" b
    WHERE ci."batchId" = b."id"
      AND ci."date" >= ${CUTOFF_TIMESTAMP_UTC};
  `;
  console.log(`✅ Successfully updated ${updatedCount} future ClassInstance rows with batch payout rate!`);

  // 3. Verification
  console.log('\n3. Verification Audit:');
  const pastCount: any[] = await prisma.$queryRaw`
    SELECT COUNT(*) as count 
    FROM "class_instances" 
    WHERE "date" < ${CUTOFF_TIMESTAMP_UTC}
      AND "coach_pay" IS NULL;
  `;
  const futureCount: any[] = await prisma.$queryRaw`
    SELECT COUNT(*) as count 
    FROM "class_instances" 
    WHERE "date" >= ${CUTOFF_TIMESTAMP_UTC}
      AND "coach_pay" IS NOT NULL;
  `;

  console.log(`• Past classes (< 28 Oct) kept NULL: ${pastCount[0]?.count ?? 0} (Protected ✅)`);
  console.log(`• Future classes (>= 28 Oct) with coach_pay: ${futureCount[0]?.count ?? 0} (Updated ✅)`);
  console.log('\n🎉 Finished coach_pay migration & backfill successfully!\n');
}

main()
  .catch((err) => {
    console.error('\n❌ Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
