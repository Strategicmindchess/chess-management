/**
 * Attendance Summary Worker
 *
 * Responsibilities:
 *  1. Read all raw AttendanceRecords for classes held within a given period.
 *  2. Calculate the total classes and attended classes per student.
 *  3. Upsert the result into LeaderboardAttendance.
 */

import { Worker, type Job } from 'bullmq';
import { connection } from '@/workers/queue';
import { QUEUE_NAMES } from '@/lib/leaderboard-config';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { AttendanceSummaryJobData } from './leaderboard.queues';

async function processAttendanceSummary(job: Job<AttendanceSummaryJobData>) {
  const { periodType, periodStart: periodStartStr, periodEnd: periodEndStr } = job.data;
  const periodStart = new Date(periodStartStr);
  const periodEnd = new Date(periodEndStr);

  logger.info(`[AttendanceSummaryWorker] Calculating attendance for ${periodType} starting ${periodStartStr}`);

  // Fetch all active students who could have attended classes
  const activeStudents = await prisma.user.findMany({
    where: { role: 'STUDENT', isActive: true },
    select: { studentProfile: { select: { id: true } } },
  });

  const studentIds = activeStudents
    .map((u) => u.studentProfile?.id)
    .filter((id): id is string => Boolean(id));

  let processedCount = 0;

  // We could use raw SQL with GROUP BY, but standard Prisma counts per student works fine for small scale
  // and maintains type safety. For larger scales, a Prisma groupBy on AttendanceRecord joined with ClassLog is better.
  // We'll query all attendance records in the period at once to save DB trips.
  
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

  // Group by student
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

  // Upsert summaries
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

    processedCount++;
  }

  logger.info(`[AttendanceSummaryWorker] Completed summary for ${processedCount} students.`);
  return { processedCount };
}

export const attendanceSummaryWorker = new Worker<AttendanceSummaryJobData>(
  QUEUE_NAMES.ATTENDANCE_SUMMARY,
  async (job) => {
    if (job.name === 'calc-attendance') {
      return processAttendanceSummary(job);
    }
  },
  {
    connection,
    concurrency: 1,
  }
);

attendanceSummaryWorker.on('completed', (job, result) => {
  logger.job.success('attendance-summary', { jobId: job.id, processedCount: result?.processedCount });
});

attendanceSummaryWorker.on('failed', (job, err) => {
  logger.job.fail('attendance-summary', { jobId: job?.id, error: err.message });
});
