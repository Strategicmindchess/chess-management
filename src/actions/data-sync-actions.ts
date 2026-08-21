'use server';

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { getCurrentUser } from '@/lib/dal';
import { Role } from '@/lib/enums';
import { prisma } from '@/lib/prisma';
import { getCurrentPeriod } from '@/lib/leaderboard-period';

// or instantiate a quick IORedis instance if this is serverless.
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
const { chessFetchQueue, attendanceSummaryQueue, assignmentSummaryQueue, leaderboardCalcQueue } = require('@/workers/leaderboard.queues');

export async function triggerManualSync(studentProfileId: string) {
  const user = await getCurrentUser();
  
  if (!user || user.role !== Role.ADMIN) {
    throw new Error('Unauthorized');
  }

  // 1. Guard against duplicate pending/active jobs for the same student
  // In BullMQ, filtering jobs across states can be heavy if the queue is massive, 
  // but for SMC scale (under a thousand jobs), fetching active/waiting is fast enough.
  const activeJobs = await chessFetchQueue.getJobs(['waiting', 'active', 'delayed']);
  
  const isAlreadyQueued = activeJobs.some((job: any) => 
    job.data?.studentProfileId === studentProfileId
  );

  if (isAlreadyQueued) {
    return { success: false, message: 'Job is already waiting or running.' };
  }

  const { periodStart } = getCurrentPeriod('MONTHLY');

  // 2. Enqueue jobs
  // Chess fetch is fast but async, so we'll run attendance and assignments in parallel,
  // and delay leaderboard calculation slightly so everything completes first.
  // Create an IN_PROGRESS run so the UI shows it immediately
  await prisma.studentSyncRun.create({
    data: {
      studentProfileId,
      periodType: 'MONTHLY',
      periodStart: periodStart,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      completedAt: new Date(), // UI needs this, though it's technically still running
    }
  });

  await chessFetchQueue.add('chess-fetch-job', {
    studentProfileId,
    periodType: 'MONTHLY',
    periodStart: periodStart.toISOString()
  }, {
    jobId: `manual-sync-${studentProfileId}-${Date.now()}`,
    removeOnComplete: true,
    removeOnFail: false,
    attempts: 20,
    backoff: {
      type: 'fixed',
      delay: 3 * 60 * 1000 // 3 minutes
    }
  });

  await attendanceSummaryQueue.add('calc-attendance', {
    periodType: 'MONTHLY',
    periodStart: periodStart.toISOString(),
    periodEnd: new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0, 23, 59, 59, 999).toISOString(),
  });

  await assignmentSummaryQueue.add('calc-assignment', {
    periodType: 'MONTHLY',
    periodStart: periodStart.toISOString(),
    periodEnd: new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0, 23, 59, 59, 999).toISOString(),
  });

  // Delay calculation by 5 seconds to give fetch & summaries time to write to DB
  await leaderboardCalcQueue.add('calc-leaderboard', {
    periodType: 'MONTHLY',
    periodStart: periodStart.toISOString(),
    periodEnd: new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0, 23, 59, 59, 999).toISOString(),
    studentProfileId, // Only calculate for this student to save resources
  }, {
    delay: 5000,
  });

  return { success: true, message: 'Sync job triggered successfully. Data will refresh shortly.' };
}
