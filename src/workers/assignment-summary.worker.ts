/**
 * Assignment Summary Worker
 *
 * Responsibilities:
 *  1. Read all StudentAssignments for assignments given within a given period.
 *  2. Calculate the completion percentage per student.
 *  3. Assign score based on rule: 100 for all completed, 50 for around half, 0 otherwise.
 *  4. Upsert the result into AssignmentScore.
 */

import { Worker, type Job } from 'bullmq';
import { connection } from '@/workers/queue';
import { QUEUE_NAMES, POINTS } from '@/lib/leaderboard-config';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { AssignmentSummaryJobData } from './leaderboard.queues';

async function processAssignmentSummary(job: Job<AssignmentSummaryJobData>) {
  const { periodType, periodStart: periodStartStr, periodEnd: periodEndStr } = job.data;
  const periodStart = new Date(periodStartStr);
  const periodEnd = new Date(periodEndStr);

  logger.info(`[AssignmentSummaryWorker] Calculating assignments for ${periodType} starting ${periodStartStr}`);

  // Fetch all active students
  const activeStudents = await prisma.user.findMany({
    where: { role: 'STUDENT', isActive: true },
    select: { studentProfile: { select: { id: true } } },
  });

  const studentIds = activeStudents
    .map((u) => u.studentProfile?.id)
    .filter((id): id is string => Boolean(id));

  let processedCount = 0;

  // Query all assignments assigned in this period and their student statuses
  // We use batchAssignment.assignedAt to scope the assignment to the period
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
      completionLevel: true, // We can also consider FULLY_DONE if needed, but status=COMPLETED is standard
    },
  });

  // Group by student
  const assignmentMap = new Map<string, { total: number; completed: number }>();
  
  for (const sid of studentIds) {
    assignmentMap.set(sid, { total: 0, completed: 0 });
  }

  for (const record of studentAssignmentsInPeriod) {
    const stats = assignmentMap.get(record.studentProfileId);
    if (stats) {
      stats.total += 1;
      // Depending on how assignments are marked completed, we can check status
      // We will consider it completed if status is COMPLETED or PREVIOUS, or completionLevel is FULLY_DONE
      if (record.status === 'COMPLETED' || record.completionLevel === 'FULLY_DONE') {
        stats.completed += 1;
      }
    }
  }

  // Upsert summaries
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

    processedCount++;
  }

  logger.info(`[AssignmentSummaryWorker] Completed assignment summary for ${processedCount} students.`);
  return { processedCount };
}

export const assignmentSummaryWorker = new Worker<AssignmentSummaryJobData>(
  QUEUE_NAMES.ASSIGNMENT_SUMMARY,
  async (job) => {
    if (job.name === 'calc-assignment') {
      return processAssignmentSummary(job);
    }
  },
  {
    connection,
    concurrency: 1,
  }
);

assignmentSummaryWorker.on('completed', (job, result) => {
  logger.job.success('assignment-summary', { jobId: job.id, processedCount: result?.processedCount });
});

assignmentSummaryWorker.on('failed', (job, err) => {
  logger.job.fail('assignment-summary', { jobId: job?.id, error: err.message });
});
