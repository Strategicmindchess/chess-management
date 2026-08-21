import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL = 'redis://default:chPfPrlvAWqzdnSaTOwMBDlJpdjsSFoy@altaria.proxy.rlwy.net:46936';

async function main() {
  const conn = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

  const chessFetch = new Queue('chess-fetch-queue', { connection: conn });
  const leaderboardCalc = new Queue('leaderboard-calc-queue', { connection: conn });

  const chessIsPaused = await chessFetch.isPaused();
  console.log('chessFetch isPaused:', chessIsPaused);
  if (chessIsPaused) {
    await chessFetch.resume();
    console.log('✅ chessFetch RESUMED!');
  }

  const calcIsPaused = await leaderboardCalc.isPaused();
  console.log('leaderboardCalc isPaused:', calcIsPaused);
  if (calcIsPaused) {
    await leaderboardCalc.resume();
    console.log('✅ leaderboardCalc RESUMED!');
  }

  // Check queue depths
  const chessCounts = await chessFetch.getJobCounts();
  const calcCounts = await leaderboardCalc.getJobCounts();
  console.log('\nchessFetch job counts:', chessCounts);
  console.log('leaderboardCalc job counts:', calcCounts);

  await chessFetch.close();
  await leaderboardCalc.close();
  await conn.quit();
  console.log('\nDone!');
}

main().catch(console.error);
