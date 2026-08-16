import { Queue } from 'bullmq';
import { connection } from '../src/workers/queue';
import { QUEUE_NAMES } from '../src/lib/leaderboard-config';

async function main() {
  const fetchQueue = new Queue(QUEUE_NAMES.CHESS_FETCH, { connection });
  const calcQueue = new Queue(QUEUE_NAMES.LEADERBOARD_CALC, { connection });

  const [
    fetchWaiting, fetchActive, fetchCompleted, fetchFailed, fetchIsPaused,
    calcWaiting, calcActive, calcCompleted, calcFailed, calcIsPaused
  ] = await Promise.all([
    fetchQueue.getWaitingCount(), fetchQueue.getActiveCount(), fetchQueue.getCompletedCount(), fetchQueue.getFailedCount(), fetchQueue.isPaused(),
    calcQueue.getWaitingCount(), calcQueue.getActiveCount(), calcQueue.getCompletedCount(), calcQueue.getFailedCount(), calcQueue.isPaused()
  ]);

  console.log('--- CHESS FETCH QUEUE ---');
  console.log(`Waiting: ${fetchWaiting}`);
  console.log(`Active: ${fetchActive}`);
  console.log(`Failed: ${fetchFailed}`);
  console.log(`Paused: ${fetchIsPaused}`);

  console.log('\\n--- LEADERBOARD CALC QUEUE ---');
  console.log(`Waiting: ${calcWaiting}`);
  console.log(`Active: ${calcActive}`);
  console.log(`Failed: ${calcFailed}`);
  console.log(`Paused: ${calcIsPaused}`);

  process.exit(0);
}

main().catch(console.error);
