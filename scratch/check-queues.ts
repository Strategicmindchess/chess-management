import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUE_NAMES } from '../src/lib/leaderboard-config';

require('dotenv').config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

async function check() {
  const connection = new IORedis(REDIS_URL);
  const fetchQueue = new Queue(QUEUE_NAMES.CHESS_FETCH, { connection });
  const calcQueue = new Queue(QUEUE_NAMES.LEADERBOARD_CALC, { connection });

  const fetchCounts = await fetchQueue.getJobCounts();
  const calcCounts = await calcQueue.getJobCounts();

  console.log('--- Chess Fetch Queue ---');
  console.log(fetchCounts);

  console.log('\n--- Leaderboard Calc Queue ---');
  console.log(calcCounts);

  const activeFetch = await fetchQueue.getJobs(['active']);
  console.log('\nActive Fetch Jobs:');
  activeFetch.forEach(j => console.log(`Job ${j.id} - ${j.name} - Student ID: ${j.data?.studentProfileId}`));
  
  const delayedFetch = await fetchQueue.getJobs(['delayed']);
  console.log('\nDelayed Fetch Jobs (Retrying):');
  delayedFetch.forEach(j => console.log(`Job ${j.id} - ${j.name} - Student ID: ${j.data?.studentProfileId}`));
  
  process.exit(0);
}

check().catch(console.error);
