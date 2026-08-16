import { QueueEvents } from 'bullmq';
import { QUEUE_NAMES } from '../src/lib/leaderboard-config';
import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

async function trackQueue(queueName: string) {
  console.log(`\n===========================================`);
  console.log(`👁️  LIVE TRACKING QUEUE: ${queueName}`);
  console.log(`===========================================`);

  const events = new QueueEvents(queueName, { connection });

  events.on('added', ({ jobId, name }) => {
    console.log(`[${new Date().toLocaleTimeString()}] ➕ Job Added: ${jobId} (${name})`);
  });

  events.on('active', ({ jobId, prev }) => {
    console.log(`[${new Date().toLocaleTimeString()}] 🚀 Job Active: ${jobId}`);
  });

  events.on('progress', ({ jobId, data }) => {
    console.log(`[${new Date().toLocaleTimeString()}] ⏳ Job Progress: ${jobId} -> ${data}%`);
  });

  events.on('completed', ({ jobId, returnvalue }) => {
    console.log(`[${new Date().toLocaleTimeString()}] ✅ Job Completed: ${jobId}`);
    if (returnvalue) {
      console.log(`   └─ Result: ${JSON.stringify(returnvalue)}`);
    }
  });

  events.on('failed', ({ jobId, failedReason }) => {
    console.log(`[${new Date().toLocaleTimeString()}] ❌ Job Failed: ${jobId}`);
    console.log(`   └─ Reason: ${failedReason}`);
  });

  events.on('stalled', ({ jobId }) => {
    console.log(`[${new Date().toLocaleTimeString()}] ⚠️ Job Stalled: ${jobId}`);
  });

  console.log(`Listening for events... Press Ctrl+C to exit.\n`);
}

async function main() {
  await trackQueue(QUEUE_NAMES.CHESS_FETCH);
  await trackQueue(QUEUE_NAMES.LEADERBOARD_CALC);
}

main().catch(console.error);
