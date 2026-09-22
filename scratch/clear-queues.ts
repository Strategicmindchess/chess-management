import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUE_NAMES } from '../src/lib/leaderboard-config';

require('dotenv').config();
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

async function clear() {
  const connection = new IORedis(REDIS_URL);
  const fetchQueue = new Queue(QUEUE_NAMES.CHESS_FETCH, { connection });
  const calcQueue = new Queue(QUEUE_NAMES.LEADERBOARD_CALC, { connection });

  await fetchQueue.obliterate({ force: true });
  await calcQueue.obliterate({ force: true });
  
  console.log('Cleared all background queues!');
  process.exit(0);
}

clear().catch(console.error);
