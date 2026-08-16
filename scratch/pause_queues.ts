import { Queue } from 'bullmq';
import { connection } from '../src/workers/queue';
import { QUEUE_NAMES } from '../src/lib/leaderboard-config';

async function main() {
  const fetchQueue = new Queue(QUEUE_NAMES.CHESS_FETCH, { connection });
  const calcQueue = new Queue(QUEUE_NAMES.LEADERBOARD_CALC, { connection });

  // Clear existing jobs
  await fetchQueue.obliterate({ force: true });
  await calcQueue.obliterate({ force: true });

  console.log('Queues obliterated (cleared completely).');
  
  // Pause queues so the remote Railway worker cannot process new jobs
  await fetchQueue.pause();
  await calcQueue.pause();

  console.log('Queues paused. Remote workers will no longer pick up jobs.');
}

main().catch(console.error).finally(() => process.exit(0));
