import IORedis from 'ioredis';
import { Queue } from 'bullmq';

async function main() {
  const connection = new IORedis('redis://127.0.0.1:6379');
  const queue = new Queue('leaderboard-calc-queue', { connection });

  const failedJobs = await queue.getFailed(0, 5);
  for (const job of failedJobs) {
    console.log(`Job ${job.id} failed: ${job.failedReason}`);
  }
  
  process.exit(0);
}

main().catch(console.error);
