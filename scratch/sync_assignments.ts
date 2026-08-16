import { prisma } from '../src/lib/prisma';
import { getCurrentPeriod } from '../src/lib/leaderboard-period';

async function main() {
  const period = getCurrentPeriod('MONTHLY');
  console.log(`Syncing Assignment Scores for period starting: ${period.periodStart.toISOString()}`);

  const activeStudents = await prisma.user.findMany({
    where: { role: 'STUDENT', isActive: true },
    select: { studentProfile: { select: { id: true } } },
  });

  const studentIds = activeStudents
    .map((u) => u.studentProfile?.id)
    .filter((id): id is string => Boolean(id));

  console.log(`Found ${studentIds.length} active students.`);

  // 1. Get all assignments assigned in this period
  const batchAssignmentsInPeriod = await prisma.batchAssignment.findMany({
    where: {
      assignedAt: {
        gte: period.periodStart,
        lte: period.periodEnd,
      },
    },
    select: { id: true, assignedAt: true },
  });

  const batchAssignmentIds = batchAssignmentsInPeriod.map(b => b.id);

  // 2. Get student assignment records for these batch assignments
  const studentAssignments = await prisma.studentAssignment.findMany({
    where: {
      studentProfileId: { in: studentIds },
      batchAssignmentId: { in: batchAssignmentIds },
    },
    select: {
      studentProfileId: true,
      status: true,
      completionLevel: true, // We will use status === 'COMPLETED' or FULLY_DONE etc
    },
  });

  const assignmentMap = new Map<string, { total: number; completed: number }>();
  for (const sid of studentIds) {
    assignmentMap.set(sid, { total: 0, completed: 0 });
  }

  for (const sa of studentAssignments) {
    const stats = assignmentMap.get(sa.studentProfileId);
    if (stats) {
      stats.total += 1;
      // Depending on how frontend marks it, it could be status === 'COMPLETED' or completionLevel === 'FULLY_DONE'
      // We will count it as completed if status is COMPLETED or completionLevel is FULLY_DONE or HALF_DONE (since user says half done -> 50 marks, but the rule says 'Around half completed -> 50 marks' which implies half of the total assignments are completed).
      // Let's rely on status === 'COMPLETED'
      if (sa.status === 'COMPLETED') {
        stats.completed += 1;
      }
    }
  }

  let processedCount = 0;
  for (const [studentId, stats] of assignmentMap.entries()) {
    let score = 0;
    
    // Assignment Score (100 Marks)
    // All Completed → 100 Marks; Around Half Completed → 50 Marks; No Assignments Completed / All Pending → 0 Marks.
    if (stats.total > 0) {
      const percentage = (stats.completed / stats.total) * 100;
      
      if (percentage === 100) {
        score = 100;
      } else if (percentage >= 40) {
        // "Around Half Completed" -> 50 Marks. Let's say 40% to 99% gives 50 points
        score = 50;
      } else {
        score = 0;
      }
    }

    await prisma.assignmentScore.upsert({
      where: {
        studentProfileId_periodType_periodStart: {
          studentProfileId: studentId,
          periodType: 'MONTHLY',
          periodStart: period.periodStart,
        },
      },
      create: {
        studentProfileId: studentId,
        periodType: 'MONTHLY',
        periodStart: period.periodStart,
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

    processedCount++;
  }

  console.log(`Assignment calculation complete for ${processedCount} students.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
