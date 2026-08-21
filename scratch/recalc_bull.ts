import { Queue } from 'bullmq';
import IORedis from 'ioredis';

async function main() {
  const connection = new IORedis('redis://127.0.0.1:6379');
  const queue = new Queue('leaderboard-calc-queue', { connection });

  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

  await queue.add('calc-leaderboard', {
    periodType: 'MONTHLY',
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
  });

  console.log('Triggered full recalculation for MONTHLY period.');
  process.exit(0);
}

main().catch(console.error);
