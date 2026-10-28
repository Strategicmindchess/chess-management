/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * PHASE 1 AUDIT: Read-Only System & Payment Inspection
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 100% READ-ONLY: No database writes, no schema modifications.
 * 
 * Inspects:
 * 1. Database table check: Does class_instances already have coachProfileId?
 * 2. Active batches, their primary coach, payoutRate, and instance counts
 * 3. ClassInstance status distribution (SCHEDULED, COMPLETED, CANCELLED)
 * 4. Cross-Coach occurrences: instances taught by substitute coaches vs batch coach
 * 5. Current Month Payout reality (Batch view vs Coach view comparison)
 * 6. Student Fee configuration summary (Monthly vs Batch-based)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import { config } from 'dotenv';
config();
import { prisma } from '../src/lib/prisma';

function banner(title: string) {
  console.log('\n' + '═'.repeat(75));
  console.log(`  🔍 ${title}`);
  console.log('═'.repeat(75));
}

function section(title: string) {
  console.log(`\n▶ ${title}`);
  console.log('─'.repeat(75));
}

async function runPhase1Audit() {
  banner('PHASE 1 AUDIT: LIVE DATABASE & PAYMENT ARCHITECTURE INSPECTION');

  // 1. Column Existence Check
  section('1. Database Column Check: class_instances.coachProfileId');
  let columnExists = false;
  try {
    const res: any[] = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'class_instances' AND column_name = 'coachProfileId';
    `;
    if (res.length > 0) {
      columnExists = true;
      console.log(`  ✅ Column "coachProfileId" ALREADY EXISTS in "class_instances" (${res[0].data_type}, nullable: ${res[0].is_nullable})`);
    } else {
      console.log(`  ❌ Column "coachProfileId" DOES NOT EXIST in "class_instances" yet.`);
    }
  } catch (err: any) {
    console.log(`  ⚠️ Column check query error: ${err.message}`);
  }

  // 2. Active Batches & Rates
  section('2. Active Batches, Assigned Coaches & Current Payout Rates');
  const batches = await prisma.batch.findMany({
    where: { isActive: true },
    include: {
      coach: { include: { user: { select: { name: true, email: true } } } },
      _count: { select: { classInstances: true, classLogs: true, students: true } },
    },
    orderBy: { code: 'asc' },
  });

  console.log(`  Total Active Batches: ${batches.length}\n`);
  console.log('  ' + '┌────────────┬─────────────────────────────┬────────────────────┬──────────┬───────────┬──────────┐');
  console.log('  ' + '│ Batch Code │ Batch Name                  │ Assigned Coach     │ Rate/Sess│ Students  │ Instances│');
  console.log('  ' + '├────────────┼─────────────────────────────┼────────────────────┼──────────┼───────────┼──────────┤');
  for (const b of batches) {
    const code = (b.code || '—').padEnd(10);
    const name = (b.name.length > 27 ? b.name.slice(0, 24) + '...' : b.name).padEnd(27);
    const coach = (b.coach?.user?.name || 'UNASSIGNED').padEnd(18);
    const rate = (`₹${b.payoutRate}`).padStart(8);
    const students = String(b._count.students).padStart(9);
    const instances = String(b._count.classInstances).padStart(9);
    console.log(`  │ ${code} │ ${name} │ ${coach} │ ${rate} │${students} │${instances} │`);
  }
  console.log('  ' + '└────────────┴─────────────────────────────┴────────────────────┴──────────┴───────────┴──────────┘');

  // 3. Class Instance Status Breakdown
  section('3. Class Instances Total Breakdown');
  const statusCounts = await prisma.classInstance.groupBy({
    by: ['status'],
    _count: true,
  });
  const totalInstances = statusCounts.reduce((sum, s) => sum + s._count, 0);
  console.log(`  Total Class Instances in Database: ${totalInstances}`);
  for (const s of statusCounts) {
    console.log(`    • ${s.status.padEnd(12)} : ${s._count} instances`);
  }

  // 4. Substitute Coach / Mismatches in ClassLogs
  section('4. Cross-Coach ClassLog Detection (Substitute Coaches)');
  const mismatchedLogs = await prisma.classLog.findMany({
    where: {
      batch: {
        coachProfileId: { not: null },
      },
    },
    include: {
      batch: {
        include: {
          coach: { include: { user: { select: { name: true } } } },
        },
      },
      coach: { include: { user: { select: { name: true } } } },
    },
  });

  const substituteCases = mismatchedLogs.filter(
    (log) => log.coachProfileId !== log.batch.coachProfileId
  );

  console.log(`  Total ClassLogs evaluated: ${mismatchedLogs.length}`);
  console.log(`  ClassLogs taken by a DIFFERENT coach than the Batch coach: ${substituteCases.length}`);

  if (substituteCases.length > 0) {
    console.log('\n  Substitute Class Sessions Found:');
    for (const sc of substituteCases.slice(0, 10)) {
      const dateStr = sc.date.toISOString().split('T')[0];
      console.log(`    • [${dateStr}] Batch: ${sc.batch.code} | Batch Owner: ${sc.batch.coach?.user?.name} ➔ Actual Teacher: ${sc.coach.user.name} | Log Payout: ₹${sc.payoutAmount}`);
    }
    if (substituteCases.length > 10) {
      console.log(`    ... and ${substituteCases.length - 10} more.`);
    }
  } else {
    console.log('  (No cross-coach substitution logs detected so far)');
  }

  // 5. Current Month Payout Analysis (Batch View vs Coach View)
  section('5. Current Month Payout Reality: "By Batch" vs "By Coach"');
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  console.log(`  Month: ${currentMonthStr}`);

  // Batch Payout query
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const monthLogs = await prisma.classLog.findMany({
    where: {
      date: { gte: startOfMonth, lte: endOfMonth },
    },
    include: {
      batch: true,
      coach: { include: { user: { select: { name: true } } } },
    },
  });

  console.log(`  ClassLogs in ${currentMonthStr}: ${monthLogs.length}`);

  const byBatchMap = new Map<string, { code: string; name: string; coachName: string; count: number; payout: number }>();
  const byCoachMap = new Map<string, { coachName: string; count: number; payout: number }>();

  for (const log of monthLogs) {
    // By Batch
    if (!byBatchMap.has(log.batchId)) {
      byBatchMap.set(log.batchId, {
        code: log.batch.code,
        name: log.batch.name,
        coachName: log.coach.user.name, // Current bug: first coach encountered
        count: 0,
        payout: 0,
      });
    }
    const b = byBatchMap.get(log.batchId)!;
    b.count += 1;
    b.payout += log.payoutAmount;

    // By Coach
    if (!byCoachMap.has(log.coachProfileId)) {
      byCoachMap.set(log.coachProfileId, {
        coachName: log.coach.user.name,
        count: 0,
        payout: 0,
      });
    }
    const c = byCoachMap.get(log.coachProfileId)!;
    c.count += 1;
    c.payout += log.payoutAmount;
  }

  console.log(`\n  --- Payout Aggregated "By Coach" (Who actually earned it) ---`);
  for (const [coachId, data] of byCoachMap) {
    console.log(`  • ${data.coachName.padEnd(20)} : ${String(data.count).padStart(3)} sessions | Gross ₹${data.payout}`);
  }

  console.log(`\n  --- Payout Aggregated "By Batch" (What getAdminPayoutSummary shows) ---`);
  for (const [batchId, data] of byBatchMap) {
    console.log(`  • Batch ${data.code.padEnd(10)} [Attributed to: ${data.coachName}] : ${String(data.count).padStart(3)} sessions | Total ₹${data.payout}`);
  }

  // 6. Student Fee System
  section('6. Student Fee Configuration & Payment Ledger Summary');
  const totalConfigs = await prisma.studentFeeConfig.count();
  const monthlyType = await prisma.studentFeeConfig.count({ where: { feeType: 'MONTHLY' } });
  const batchType = await prisma.studentFeeConfig.count({ where: { feeType: 'BATCH_BASED' } });
  const totalCycles = await prisma.feeCycle.count();
  const paidCycles = await prisma.feeCycle.count({ where: { status: 'PAID' } });
  const unpaidCycles = await prisma.feeCycle.count({ where: { status: 'UNPAID' } });
  const waivedCycles = await prisma.feeCycle.count({ where: { status: 'WAIVED' } });

  console.log(`  Student Fee Configurations: ${totalConfigs} (Monthly: ${monthlyType}, Batch-Based: ${batchType})`);
  console.log(`  Fee Cycles: Total ${totalCycles} | Paid: ${paidCycles} | Unpaid: ${unpaidCycles} | Waived: ${waivedCycles}`);

  banner('PHASE 1 AUDIT COMPLETE - NO SYSTEM CHANGES MADE');
}

runPhase1Audit()
  .catch((e) => {
    console.error('Fatal error in Phase 1 audit:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
