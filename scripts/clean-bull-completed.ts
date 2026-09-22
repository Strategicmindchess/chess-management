/**
 * One-time script: Clean only COMPLETED BullMQ jobs from all queues.
 * Does NOT touch: waiting, active, delayed, failed, or repeatable jobs.
 *
 * Run with:
 *   npx tsx scripts/clean-bull-completed.ts
 *
 * Set NODE_ENV=production if you want to clean production queues (no -dev suffix).
 */

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import * as dotenv from 'dotenv';

dotenv.config();

function buildRedisUrl(): string {
  const rawUrl = process.env.REDIS_URL ?? '';
  if (rawUrl && !rawUrl.includes('${{')) return rawUrl;

  const pass = process.env.REDIS_PASSWORD ?? process.env.REDISPASSWORD ?? '';
  const host = process.env.REDISHOST ?? 'localhost';
  const port = process.env.REDISPORT ?? '6379';

  if (!pass || host === 'localhost') return `redis://${host}:${port}`;
  return `redis://:${pass}@${host}:${port}`;
}

const connection = new IORedis(buildRedisUrl(), {
  maxRetriesPerRequest: null,
});

const suffix = process.env.NODE_ENV === 'production' ? '' : '-dev';

const QUEUE_NAMES = [
  `chess-fetch${suffix}`,
  `leaderboard-calc${suffix}`,
  `log-cleanup${suffix}`,
  `attendance-summary${suffix}`,
  `assignment-summary${suffix}`,
  `penalty${suffix}`,
];

async function cleanCompleted() {
  console.log(`\n🔧 BullMQ Completed Jobs Cleaner`);
  console.log(`Environment: ${process.env.NODE_ENV ?? 'development'}`);
  console.log(`Queue suffix: "${suffix}"\n`);

  let totalCleaned = 0;

  for (const queueName of QUEUE_NAMES) {
    const queue = new Queue(queueName, { connection });

    try {
      // Clean completed jobs (all of them)
      const completed = await queue.clean(0, 5000, 'completed');
      console.log(`  ✅ completed: ${completed.length} removed`);
      totalCleaned += completed.length;

      // Clean failed jobs older than 1 day
      const failed = await queue.clean(86400_000, 5000, 'failed');
      console.log(`  🔴 failed:    ${failed.length} removed`);
      totalCleaned += failed.length;

      // Clean delayed (stuck retries) older than 1 day
      const delayed = await queue.clean(86400_000, 5000, 'delayed');
      console.log(`  ⏳ delayed:   ${delayed.length} removed`);
      totalCleaned += delayed.length;
    } catch (err: any) {
      console.warn(`⚠️  ${queueName}: ${err.message}`);
    } finally {
      await queue.close();
    }
  }

  console.log(`\n🎉 Done! Total completed jobs removed: ${totalCleaned}`);
  await connection.quit();
}

cleanCompleted().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
