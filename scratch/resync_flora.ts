import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
const queue = new Queue('chess-fetch', { connection });

async function triggerFloraSync() {
  const studentProfileId = 'cms058awk000004jlepfh1d01'; // Flora's ID from DB check
  const periodStart = new Date('2026-08-01T00:00:00.000Z');

  const job = await queue.add('chess-fetch-job', {
    studentProfileId,
    periodType: 'MONTHLY',
    periodStart: periodStart.toISOString()
  }, {
    jobId: `manual-flora-resync-${Date.now()}`,
    removeOnComplete: false,
    removeOnFail: false
  });

  console.log(`Job queued: ${job.id}`);
  console.log(`Waiting for worker to process...`);
  await connection.quit();
}

triggerFloraSync().catch(console.error);
