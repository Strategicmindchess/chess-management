import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../src/lib/leaderboard-config';
import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

async function viewLogs() {
  const queue = new Queue(QUEUE_NAMES.LEADERBOARD_CALC, { connection });
  
  // Get the most recently completed jobs
  const completedJobs = await queue.getCompleted(0, 5);
  
  if (completedJobs.length === 0) {
    console.log('No completed jobs found.');
    process.exit(0);
  }

  const latestJob = completedJobs[0];
  console.log(`\n===========================================`);
  console.log(`📋 STEP-BY-STEP LOGS FOR JOB: ${latestJob.id}`);
  console.log(`===========================================\n`);

  const logs = await queue.getJobLogs(latestJob.id!);
  
  if (logs.logs.length === 0) {
    console.log('No detailed logs recorded for this job.');
  } else {
    logs.logs.forEach((logLine, index) => {
      console.log(`[Step ${index + 1}] ${logLine}`);
    });
  }
  
  console.log(`\n===========================================\n`);
  process.exit(0);
}

viewLogs().catch(console.error);
