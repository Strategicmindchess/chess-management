/**
 * Log Cleanup Worker — Worker 3
 *
 * Responsibilities:
 *  1. Delete ChessApiFetchLog entries older than 30 days
 */

import { Worker, type Job } from 'bullmq';
import { connection } from '@/workers/queue';
import { QUEUE_NAMES } from '@/lib/leaderboard-config';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

async function processLogCleanup(job: Job) {
  logger.info('[LogCleanupWorker] Starting purge of old logs');

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = await prisma.chessApiFetchLog.deleteMany({
    where: {
      fetchedAt: {
        lt: thirtyDaysAgo,
      },
    },
  });

  logger.info(`[LogCleanupWorker] Purge complete. Deleted ${result.count} logs older than 30 days.`);

  return { deletedCount: result.count };
}

export const logCleanupWorker = new Worker(
  QUEUE_NAMES.LOG_CLEANUP,
  async (job) => {
    return processLogCleanup(job);
  },
  {
    connection,
    concurrency: 1,
  }
);

logCleanupWorker.on('completed', (job, result) => {
  logger.job.success('log-cleanup', { jobId: job.id, deletedCount: result?.deletedCount });
});

logCleanupWorker.on('failed', (job, err) => {
  logger.job.fail('log-cleanup', { jobId: job?.id, error: err.message });
});
