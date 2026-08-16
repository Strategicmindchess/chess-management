import { Queue } from 'bullmq';
import { connection } from '../src/workers/queue';
import { QUEUE_NAMES } from '../src/lib/leaderboard-config';

async function main() {
  const fetchQueue = new Queue(QUEUE_NAMES.CHESS_FETCH, { connection });
  const calcQueue = new Queue(QUEUE_NAMES.LEADERBOARD_CALC, { connection });

  await fetchQueue.resume();
  await calcQueue.resume();

  console.log('Queues resumed. Remote workers will now process jobs normally.');
}

main().catch(console.error).finally(() => process.exit(0));
