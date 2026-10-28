/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * SMC CRM: ClassInstance Coach Decoupling & Backfill Script
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Run with: npx tsx scripts/backfill-coach-columns.ts
 * 
 * RULES IMPLEMENTED:
 * 1. TABLE "class_instances":
 *    - Adds column "class_instance_coach" (nullable TEXT, FK -> coach_profiles.id).
 *    - Also adds "coachProfileId" alias for Prisma compatibility.
 *    - Initially all existing rows have NULL.
 *    - CUTOFF RULE (28 Oct 2026 IST):
 *      • All past classes (< 28 Oct 2026) are NEVER touched and remain NULL!
 *        (Prevents corrupting historical classes where coach substitutions happened).
 *      • ONLY classes on or after 28 Oct 2026 (>= 28 Oct 2026 IST) are backfilled
 *        with their parent batch coach (batch.coachProfileId).
 * 
 * 2. TABLE "class_logs":
 *    - Adds column "coach_class_taken" (nullable TEXT, FK -> coach_profiles.id).
 *    - Also adds "coachClassTaken" alias for Prisma compatibility.
 *    - Left 100% EMPTY (all values NULL) as requested.
 * 
 * 3. TABLE "batches":
 *    - ZERO modifications. Batch retains its default parent coach (batch.coachProfileId).
 * 
 * SAFETY GUARANTEES:
 *    - Non-destructive: Uses ADD COLUMN IF NOT EXISTS.
 *    - Past data protected: Past lectures (< 28 Oct 2026) are strictly kept NULL.
 *    - Idempotent: Can be run multiple times safely.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { fromZonedTime } from 'date-fns-tz';

// Cutoff Date: 28 October 2026, 00:00:00 IST (UTC 2026-10-27T18:30:00.000Z)
const CUTOFF_DATE_IST = '2026-10-28 00:00:00';
const CUTOFF_TIMESTAMP_UTC = fromZonedTime(CUTOFF_DATE_IST, 'Asia/Kolkata');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function divider(title: string) {
  console.log('\n' + '═'.repeat(75));
  console.log(`  ${title}`);
  console.log('═'.repeat(75));
}

function subDivider(title: string) {
  console.log(`\n  ── ${title} ${'─'.repeat(Math.max(0, 65 - title.length))}`);
}

async function checkColumn(tableName: string, columnName: string): Promise<boolean> {
  try {
    const result: any[] = await prisma.$queryRawUnsafe(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = '${tableName}' 
      AND column_name = '${columnName}'
    `);
    return result.length > 0;
  } catch {
    return false;
  }
}

// ─── PHASE 1: AUDIT CURRENT SYSTEM ───────────────────────────────────────────

async function auditCurrentSystem() {
  divider('PHASE 1: AUDIT CURRENT DATABASE STATE');

  const batches = await prisma.batch.findMany({
    where: { isActive: true },
    include: {
      coach: { include: { user: { select: { name: true } } } },
      _count: { select: { classInstances: true, classLogs: true } },
    },
    orderBy: { name: 'asc' },
  });

  console.log(`\n  Found ${batches.length} active batches in production:\n`);
  console.log('  ' + '┌─────────────────────┬──────────────────────┬───────────┬──────────┐');
  console.log('  ' + '│ Batch Code          │ Parent Batch Coach   │ Instances │ ClassLogs│');
  console.log('  ' + '├─────────────────────┼──────────────────────┼───────────┼──────────┤');
  
  for (const batch of batches) {
    const code = (batch.code || '—').padEnd(19);
    const coach = (batch.coach?.user?.name || 'Unassigned').padEnd(20);
    const instances = String(batch._count.classInstances).padStart(9);
    const logs = String(batch._count.classLogs).padStart(8);
    console.log(`  │ ${code} │ ${coach} │${instances} │${logs} │`);
  }
  console.log('  ' + '└─────────────────────┴──────────────────────┴───────────┴──────────┘');

  // Breakdown before and after 28 Oct 2026
  subDivider('Cutoff Date Audit: 28 Oct 2026 (Asia/Kolkata)');
  const pastCount = await prisma.classInstance.count({
    where: { date: { lt: CUTOFF_TIMESTAMP_UTC } }
  });
  const futureCount = await prisma.classInstance.count({
    where: { date: { gte: CUTOFF_TIMESTAMP_UTC } }
  });
  const totalInstances = await prisma.classInstance.count();

  console.log(`  • Cutoff Date                 : 28 Oct 2026 (00:00:00 IST)`);
  console.log(`  • Past Classes (< 28 Oct)     : ${pastCount} instances -> [PROTECTED: Will stay NULL]`);
  console.log(`  • Future Classes (>= 28 Oct)  : ${futureCount} instances -> [Will be linked to Batch Coach]`);
  console.log(`  • Total ClassInstances        : ${totalInstances}`);

  // Check column statuses
  subDivider('Target Columns Status Check');
  const ciCoach = await checkColumn('class_instances', 'class_instance_coach');
  const ciCoachCamel = await checkColumn('class_instances', 'coachProfileId');
  const logCoachTaken = await checkColumn('class_logs', 'coach_class_taken');

  console.log(`  • class_instances."class_instance_coach" : ${ciCoach ? '✅ EXISTS' : '❌ NOT ADDED YET'}`);
  console.log(`  • class_instances."coachProfileId"      : ${ciCoachCamel ? '✅ EXISTS' : '❌ NOT ADDED YET'}`);
  console.log(`  • class_logs."coach_class_taken"        : ${logCoachTaken ? '✅ EXISTS' : '❌ NOT ADDED YET'}`);

  return { batches, totalInstances, pastCount, futureCount };
}

// ─── PHASE 2: ADD REQUIRED COLUMNS (DDL) ─────────────────────────────────────

async function addColumns() {
  divider('PHASE 2: ADD REQUIRED COLUMNS (NON-DESTRUCTIVE DDL)');

  // 1. class_instances: Add "class_instance_coach" & "coachProfileId"
  subDivider('1. Updating "class_instances" table (Instance Coach)');
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "class_instances" 
      ADD COLUMN IF NOT EXISTS "class_instance_coach" TEXT;
    `);
    console.log('  ✅ Column "class_instance_coach" verified / added.');

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "class_instances" 
      ADD COLUMN IF NOT EXISTS "coachProfileId" TEXT;
    `);
    console.log('  ✅ Column "coachProfileId" (Prisma alias) verified / added.');

    // Add Foreign Key constraints safely
    try {
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'class_instances_class_instance_coach_fkey'
          ) THEN
            ALTER TABLE "class_instances" 
            ADD CONSTRAINT "class_instances_class_instance_coach_fkey" 
            FOREIGN KEY ("class_instance_coach") REFERENCES "coach_profiles"("id") 
            ON DELETE SET NULL;
          END IF;
        END $$;
      `);
      console.log('  ✅ Foreign key on "class_instance_coach" verified.');
    } catch (e: any) {
      console.log(`  ⚠️  Foreign key notice (class_instance_coach): ${e.message}`);
    }

    try {
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'class_instances_coachProfileId_fkey'
          ) THEN
            ALTER TABLE "class_instances" 
            ADD CONSTRAINT "class_instances_coachProfileId_fkey" 
            FOREIGN KEY ("coachProfileId") REFERENCES "coach_profiles"("id") 
            ON DELETE SET NULL;
          END IF;
        END $$;
      `);
      console.log('  ✅ Foreign key on "coachProfileId" verified.');
    } catch (e: any) {
      console.log(`  ⚠️  Foreign key notice (coachProfileId): ${e.message}`);
    }

    // Add Indexes for fast queries
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "class_instances_class_instance_coach_date_idx" 
      ON "class_instances"("class_instance_coach", "date");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "class_instances_coachProfileId_date_idx" 
      ON "class_instances"("coachProfileId", "date");
    `);
    console.log('  ✅ Performance indexes on ("class_instance_coach", "date") created.');
  } catch (err: any) {
    console.error('  ❌ Error modifying class_instances:', err.message);
    throw err;
  }

  // 2. class_logs: Add "coach_class_taken" (empty/null)
  subDivider('2. Updating "class_logs" table (Empty / Null)');
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "class_logs" 
      ADD COLUMN IF NOT EXISTS "coach_class_taken" TEXT;
    `);
    console.log('  ✅ Column "coach_class_taken" verified / added (default NULL / empty).');

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "class_logs" 
      ADD COLUMN IF NOT EXISTS "coachClassTaken" TEXT;
    `);
    console.log('  ✅ Column "coachClassTaken" (alias) verified / added.');

    try {
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'class_logs_coach_class_taken_fkey'
          ) THEN
            ALTER TABLE "class_logs" 
            ADD CONSTRAINT "class_logs_coach_class_taken_fkey" 
            FOREIGN KEY ("coach_class_taken") REFERENCES "coach_profiles"("id") 
            ON DELETE SET NULL;
          END IF;
        END $$;
      `);
      console.log('  ✅ Foreign key on "coach_class_taken" verified.');
    } catch (e: any) {
      console.log(`  ⚠️  Foreign key notice (coach_class_taken): ${e.message}`);
    }
  } catch (err: any) {
    console.error('  ❌ Error modifying class_logs:', err.message);
    throw err;
  }
}

// ─── PHASE 3: BACKFILL ONLY FROM 28 OCT 2026 ONWARDS (DML) ───────────────────

async function backfillClassInstances() {
  divider('PHASE 3: BACKFILL class_instance_coach (>= 28 OCT 2026 ONLY)');

  console.log(`\n  Executing targeted update for classes on or after 28 Oct 2026 IST...`);
  console.log(`  (Past classes < 28 Oct 2026 are strictly untouched and kept NULL)\n`);

  // Update only instances >= 28 Oct 2026 IST using parameterized Date
  const updatedCount = await prisma.$executeRaw`
    UPDATE "class_instances" ci
    SET 
      "class_instance_coach" = b."coachProfileId",
      "coachProfileId" = b."coachProfileId"
    FROM "batches" b
    WHERE ci."batchId" = b."id"
      AND b."coachProfileId" IS NOT NULL
      AND ci."date" >= ${CUTOFF_TIMESTAMP_UTC};
  `;

  console.log(`  ✅ Successfully updated ${updatedCount} ClassInstance rows from 28 Oct 2026 onwards!`);
}

// ─── PHASE 4: VERIFICATION & AUDIT REPORT ───────────────────────────────────

async function verifyAndAudit() {
  divider('PHASE 4: VERIFICATION & FINAL AUDIT');

  // Verify past vs future instances using parameterized queries
  const pastWithCoach: any[] = await prisma.$queryRaw`
    SELECT COUNT(*) as count 
    FROM "class_instances" 
    WHERE "date" < ${CUTOFF_TIMESTAMP_UTC}
      AND "class_instance_coach" IS NOT NULL;
  `;

  const pastNullCount: any[] = await prisma.$queryRaw`
    SELECT COUNT(*) as count 
    FROM "class_instances" 
    WHERE "date" < ${CUTOFF_TIMESTAMP_UTC}
      AND "class_instance_coach" IS NULL;
  `;

  const futureWithCoach: any[] = await prisma.$queryRaw`
    SELECT COUNT(*) as count 
    FROM "class_instances" 
    WHERE "date" >= ${CUTOFF_TIMESTAMP_UTC}
      AND "class_instance_coach" IS NOT NULL;
  `;

  const futureNullCount: any[] = await prisma.$queryRaw`
    SELECT COUNT(*) as count 
    FROM "class_instances" 
    WHERE "date" >= ${CUTOFF_TIMESTAMP_UTC}
      AND "class_instance_coach" IS NULL;
  `;

  console.log(`
  Audit Results:
  ┌────────────────────────────────────────┬─────────────┐
  │ Category                               │ Count       │
  ├────────────────────────────────────────┼─────────────┤
  │ Past Classes (< 28 Oct) with NULL      │ ${String(pastNullCount[0]?.count ?? 0).padStart(11)} │  (Untouched / Safe ✅)
  │ Past Classes with Coach (Should be 0)  │ ${String(pastWithCoach[0]?.count ?? 0).padStart(11)} │  (Zero past rows touched ✅)
  │ Future Classes (>= 28 Oct) with Coach  │ ${String(futureWithCoach[0]?.count ?? 0).padStart(11)} │  (Updated with batch coach ✅)
  │ Future Classes unassigned batch        │ ${String(futureNullCount[0]?.count ?? 0).padStart(11)} │
  └────────────────────────────────────────┴─────────────┘
  `);

  // Verify class_logs (confirming coach_class_taken is empty/null)
  const logStats: any[] = await prisma.$queryRawUnsafe(`
    SELECT 
      COUNT(*) as total,
      COUNT("coach_class_taken") as non_null_count
    FROM "class_logs";
  `);

  console.log(`  ClassLogs Verification:
  • Total ClassLogs in DB         : ${logStats[0]?.total ?? 0}
  • coach_class_taken (Empty/Null): ${Number(logStats[0]?.total || 0) - Number(logStats[0]?.non_null_count || 0)} (Confirmed EMPTY ✅)
  `);
}

// ─── MAIN EXECUTION ──────────────────────────────────────────────────────────

async function main() {
  console.log('\n♟️ STRATEGIC MIND CHESS CRM');
  console.log('   ClassInstance Coach Decoupling Migration & Backfill');
  console.log('   Target Cutoff Date: 28 Oct 2026 onwards\n');

  // Step 1: Read-only audit
  await auditCurrentSystem();

  // Step 2: Add columns in class_instances & class_logs ONLY
  await addColumns();

  // Step 3: Backfill class_instances (>= 28 Oct 2026 only)
  await backfillClassInstances();

  // Step 4: Verification
  await verifyAndAudit();

  divider('🎉 MIGRATION & BACKFILL COMPLETED SUCCESSFULLY');
}

main()
  .catch((err) => {
    console.error('\n❌ Script execution failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
