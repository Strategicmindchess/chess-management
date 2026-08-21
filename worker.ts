/**
 * BullMQ Worker Entry Point
 *
 * This file is the persistent process that picks up background jobs.
 * It is NOT part of the Next.js server — it runs as a separate service.
 *
 * Local dev:  npm run worker
 * Railway:    Set start command to "npm run worker" on the Worker service.
 *
 * @next/env is used to load .env variables before any module is imported,
 * because Node.js hoists static imports before synchronous code runs.
 * Dynamic import() is used to guarantee env vars are set first.
 */
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

// ── Logger must be imported after env is loaded ───────────────────────────────
import { logger } from './src/lib/logger';

logger.info('Worker process starting...', { pid: process.pid, node: process.version });

// ── Start all workers ─────────────────────────────────────────────────────────

Promise.all([
  // Existing batch queue worker (class instance generation)
  import('./src/workers/batch.worker').then(() => {
    logger.info('batch-queue worker started');
  }),

  // Chess data fetch worker — fetches Chess.com + Lichess data per student
  import('./src/workers/chess-fetch.worker').then(() => {
    logger.info('chess-fetch worker started');
  }),

  // Leaderboard score calculation worker — reads snapshots, writes LeaderboardEntry
  import('./src/workers/leaderboard-calc.worker').then(() => {
    logger.info('leaderboard-calc worker started');
  }),

  // Log cleanup worker — deletes fetch logs > 30 days
  import('./src/workers/log-cleanup.worker').then(() => {
    logger.info('log-cleanup worker started');
  }),

  // Attendance summary worker — calculates attendance %
  import('./src/workers/attendance-summary.worker').then(() => {
    logger.info('attendance-summary worker started');
  }),

  // Assignment summary worker — calculates assignment completion
  import('./src/workers/assignment-summary.worker').then(() => {
    logger.info('assignment-summary worker started');
  }),
])
  .then(async () => {
    logger.info('All BullMQ workers running — listening for jobs', {
      queues: ['batch-queue', 'chess-fetch-queue', 'leaderboard-calc-queue', 'log-cleanup-queue', 'attendance-summary-queue', 'assignment-summary-queue'],
    });

    // Log queue depths every 5 minutes
    setInterval(async () => {
      try {
        const { chessFetchQueue, leaderboardCalcQueue } = await import('./src/workers/leaderboard.queues');
        const [fetchCounts, calcCounts] = await Promise.all([
          chessFetchQueue.getJobCounts(),
          leaderboardCalcQueue.getJobCounts(),
        ]);
        logger.info('Queue health', { chessFetch: fetchCounts, leaderboardCalc: calcCounts });
      } catch (err) {
        logger.warn('Health check failed', { error: String(err) });
      }
    }, 5 * 60 * 1_000);
  })
  .catch((err: Error) => {
    logger.error('Failed to start one or more workers', { error: err.message, stack: err.stack });
    process.exit(1);
  });

// ── Graceful shutdown ─────────────────────────────────────────────────────────

async function shutdown(signal: string) {
  logger.info(`Received ${signal} — shutting down gracefully...`);
  try {
    const [{ chessFetchWorker }, { leaderboardCalcWorker }, { logCleanupWorker }, { attendanceSummaryWorker }, { assignmentSummaryWorker }, { batchWorker }] = await Promise.all([
      import('./src/workers/chess-fetch.worker'),
      import('./src/workers/leaderboard-calc.worker'),
      import('./src/workers/log-cleanup.worker'),
      import('./src/workers/attendance-summary.worker'),
      import('./src/workers/assignment-summary.worker'),
      import('./src/workers/batch.worker'),
    ]);
    await Promise.all([
      chessFetchWorker.close(),
      leaderboardCalcWorker.close(),
      logCleanupWorker.close(),
      attendanceSummaryWorker.close(),
      assignmentSummaryWorker.close(),
      batchWorker?.close?.(),
    ]);
    logger.info('All workers closed cleanly.');
    process.exit(0);
  } catch (err) {
    logger.error('Error during shutdown', { error: String(err) });
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
