import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { prisma } from '../lib/prisma';
import { getCurrentPeriod } from '../lib/leaderboard-period';
import { POINTS } from '../lib/leaderboard-config';

async function syncAttendance(periodType: 'WEEKLY' | 'MONTHLY', periodStart: Date, periodEnd: Date) {
  console.log(`\n=== 1. SYNCING ATTENDANCE (${periodType}: ${periodStart.toISOString().split('T')[0]} to ${periodEnd.toISOString().split('T')[0]}) ===`);
  
  const activeStudents = await prisma.user.findMany({
    where: { role: 'STUDENT', isActive: true },
    select: { studentProfile: { select: { id: true, user: { select: { name: true } } } } },
  });

  const studentProfiles = activeStudents
    .map((u) => u.studentProfile)
    .filter((sp): sp is NonNullable<typeof sp> => Boolean(sp));

  const studentIds = studentProfiles.map(sp => sp.id);

  const recordsInPeriod = await prisma.attendanceRecord.findMany({
    where: {
      studentProfileId: { in: studentIds },
      classLog: {
        date: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    },
    select: {
      studentProfileId: true,
      status: true,
    },
  });

  const attendanceMap = new Map<string, { total: number; present: number }>();
  for (const sid of studentIds) {
    attendanceMap.set(sid, { total: 0, present: 0 });
  }

  for (const record of recordsInPeriod) {
    const stats = attendanceMap.get(record.studentProfileId);
    if (stats) {
      stats.total += 1;
      if (record.status === 'PRESENT') {
        stats.present += 1;
      }
    }
  }

  let updatedCount = 0;
  for (const [studentId, stats] of attendanceMap.entries()) {
    const percentage = stats.total === 0 ? 0 : (stats.present / stats.total) * 100;

    await prisma.leaderboardAttendance.upsert({
      where: {
        studentProfileId_periodType_periodStart: {
          studentProfileId: studentId,
          periodType,
          periodStart,
        },
      },
      create: {
        studentProfileId: studentId,
        periodType,
        periodStart,
        totalClasses: stats.total,
        classesAttended: stats.present,
        attendancePercent: percentage,
      },
      update: {
        totalClasses: stats.total,
        classesAttended: stats.present,
        attendancePercent: percentage,
      },
    });
    updatedCount++;
  }

  console.log(`Successfully updated attendance for ${updatedCount} students.`);
}

async function syncAssignments(periodType: 'WEEKLY' | 'MONTHLY', periodStart: Date, periodEnd: Date) {
  console.log(`\n=== 2. SYNCING ASSIGNMENTS (${periodType}: ${periodStart.toISOString().split('T')[0]} to ${periodEnd.toISOString().split('T')[0]}) ===`);

  const activeStudents = await prisma.user.findMany({
    where: { role: 'STUDENT', isActive: true },
    select: { studentProfile: { select: { id: true, user: { select: { name: true } } } } },
  });

  const studentProfiles = activeStudents
    .map((u) => u.studentProfile)
    .filter((sp): sp is NonNullable<typeof sp> => Boolean(sp));

  const studentIds = studentProfiles.map(sp => sp.id);

  // Note: an assignment can be considered part of the period if assigned in period OR released in period
  const studentAssignmentsInPeriod = await prisma.studentAssignment.findMany({
    where: {
      studentProfileId: { in: studentIds },
      batchAssignment: {
        assignedAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    },
    select: {
      studentProfileId: true,
      status: true,
      completionLevel: true,
    },
  });

  const assignmentMap = new Map<string, { total: number; completed: number }>();
  for (const sid of studentIds) {
    assignmentMap.set(sid, { total: 0, completed: 0 });
  }

  for (const record of studentAssignmentsInPeriod) {
    const stats = assignmentMap.get(record.studentProfileId);
    if (stats) {
      stats.total += 1;
      if (record.status === 'COMPLETED' || record.completionLevel === 'FULLY_DONE') {
        stats.completed += 1;
      }
    }
  }

  let updatedCount = 0;
  for (const [studentId, stats] of assignmentMap.entries()) {
    let score = 0;
    if (stats.total > 0) {
      const completionRatio = stats.completed / stats.total;
      if (completionRatio === 1) {
        score = 100; // All Completed
      } else if (completionRatio >= 0.5) {
        score = 50;  // Around Half Completed
      } else {
        score = 0;   // Less than half / None
      }
    }

    await prisma.assignmentScore.upsert({
      where: {
        studentProfileId_periodType_periodStart: {
          studentProfileId: studentId,
          periodType,
          periodStart,
        },
      },
      create: {
        studentProfileId: studentId,
        periodType,
        periodStart,
        totalAssignments: stats.total,
        completedCount: stats.completed,
        score: score,
      },
      update: {
        totalAssignments: stats.total,
        completedCount: stats.completed,
        score: score,
      },
    });
    updatedCount++;
  }

  console.log(`Successfully updated assignments for ${updatedCount} students.`);
}

async function recalculateLeaderboard(periodType: 'WEEKLY' | 'MONTHLY', periodStart: Date, periodEnd: Date) {
  console.log(`\n=== 3. RECALCULATING LEADERBOARD (${periodType}) ===`);
  const { processLeaderboardCalc } = await import('../workers/leaderboard-calc.worker');

  // Create a mock BullMQ job
  const mockJob: any = {
    data: {
      periodType,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    },
    log: async (msg: string) => console.log('  [Worker Log]:', msg),
    updateProgress: async (p: number) => console.log(`  [Progress]: ${p}%`),
  };

  const result = await processLeaderboardCalc(mockJob);
  console.log(`Leaderboard calculation completed. Calculated ${result.calculatedCount} students.`);
}

async function main() {
  const { periodStart, periodEnd } = getCurrentPeriod('MONTHLY');
  console.log(`Current Period: MONTHLY ${periodStart.toISOString()} -> ${periodEnd.toISOString()}`);

  // 1. Sync Attendance
  await syncAttendance('MONTHLY', periodStart, periodEnd);

  // 2. Sync Assignments
  await syncAssignments('MONTHLY', periodStart, periodEnd);

  // 3. Recalculate Leaderboard
  await recalculateLeaderboard('MONTHLY', periodStart, periodEnd);

  // 4. Print top 10 students
  console.log('\n=== TOP 10 STUDENTS AFTER SYNC ===');
  const top10 = await prisma.leaderboardEntry.findMany({
    where: { periodType: 'MONTHLY', periodStart },
    orderBy: { rank: 'asc' },
    take: 10,
    include: {
      student: { include: { user: { select: { name: true } } } }
    }
  });

  for (const entry of top10) {
    console.log(`Rank #${entry.rank}: ${entry.student.user.name} | Total: ${entry.totalScore} pts (Attendance: ${entry.attendance}, Assignment: ${entry.assignment}, Chess: ${entry.rapidClassicalPoints + entry.blitzPoints + entry.puzzlePoints}, Bonus: ${entry.winRateBonus + entry.puzzleAccuracyBonus + entry.ratingBonus + entry.consistencyBonus})`);
  }
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});

