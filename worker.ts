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

logger.info({ pid: process.pid, node: process.version }, 'Worker process starting...');

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

  // Penalty worker — finalises coach penalty amounts after 48h/96h feedback windows
  import('./src/workers/penalty.worker').then(() => {
    logger.info('penalty worker started');
  }),
])
  .then(async () => {
    logger.info({
      queues: ['batch-queue', 'chess-fetch-queue', 'leaderboard-calc-queue', 'log-cleanup-queue', 'attendance-summary-queue', 'assignment-summary-queue', 'penalty-queue'],
    }, 'All BullMQ workers running — listening for jobs');

    // Register daily repeatable job for penalty processing (runs every 24 hours at 02:00 UTC)
    try {
      const { penaltyQueue } = await import('./src/workers/leaderboard.queues');
      const { JOB_NAMES } = await import('./src/lib/leaderboard-config');
      await penaltyQueue.add(
        JOB_NAMES.PROCESS_PENALTIES,
        {},
        { repeat: { pattern: '0 2 * * *' }, jobId: 'daily-penalty-job' }
      );
      logger.info('Penalty repeatable job registered (daily at 02:00 UTC)');
    } catch (err) {
      logger.warn({ error: String(err) }, 'Failed to register penalty repeatable job');
    }

    // Log queue depths every 5 minutes
    setInterval(async () => {
      try {
        const { chessFetchQueue, leaderboardCalcQueue, penaltyQueue } = await import('./src/workers/leaderboard.queues');
        const [fetchCounts, calcCounts, penaltyCounts] = await Promise.all([
          chessFetchQueue.getJobCounts(),
          leaderboardCalcQueue.getJobCounts(),
          penaltyQueue.getJobCounts(),
        ]);
        logger.info({ chessFetch: fetchCounts, leaderboardCalc: calcCounts, penalty: penaltyCounts }, 'Queue health');
      } catch (err) {
        logger.warn({ error: String(err) }, 'Health check failed');
      }
    }, 5 * 60 * 1_000);
  })
  .catch((err: Error) => {
    logger.error({ error: err.message, stack: err.stack }, 'Failed to start one or more workers');
    process.exit(1);
  });

// ── Graceful shutdown ─────────────────────────────────────────────────────────

async function shutdown(signal: string) {
  logger.info(`Received ${signal} — shutting down gracefully...`);
  try {
    const [{ chessFetchWorker }, { leaderboardCalcWorker }, { logCleanupWorker }, { attendanceSummaryWorker }, { assignmentSummaryWorker }, { batchWorker }, { penaltyWorker }] = await Promise.all([
      import('./src/workers/chess-fetch.worker'),
      import('./src/workers/leaderboard-calc.worker'),
      import('./src/workers/log-cleanup.worker'),
      import('./src/workers/attendance-summary.worker'),
      import('./src/workers/assignment-summary.worker'),
      import('./src/workers/batch.worker'),
      import('./src/workers/penalty.worker'),
    ]);
    await Promise.all([
      chessFetchWorker.close(),
      leaderboardCalcWorker.close(),
      logCleanupWorker.close(),
      attendanceSummaryWorker.close(),
      assignmentSummaryWorker.close(),
      batchWorker?.close?.(),
      penaltyWorker?.close?.(),
    ]);
    logger.info('All workers closed cleanly.');
    process.exit(0);
  } catch (err) {
    logger.error({ error: String(err) }, 'Error during shutdown');
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
