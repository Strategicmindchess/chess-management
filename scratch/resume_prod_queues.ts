import { Queue } from 'bullmq';
import IORedis from 'ioredis';

function buildRedisUrl() {
  return process.env.REDIS_URL || 'redis://default:chPfPrlvAWqzdnSaTOwMBDlJpdjsSFoy@altaria.proxy.rlwy.net:46936';
}

async function main() {
  const conn = new IORedis(buildRedisUrl(), { maxRetriesPerRequest: null });
  
  // The production queue names are exactly these:
  const fetchQ = new Queue('chess-fetch', { connection: conn });
  const calcQ = new Queue('leaderboard-calc', { connection: conn });

  console.log('Resuming ACTUAL production queues...');
  await fetchQ.resume();
  await calcQ.resume();
  console.log('Queues resumed!');
  
  // Check counts
  const fetchCounts = await fetchQ.getJobCounts();
  console.log('chess-fetch queue counts:', fetchCounts);
  
  const calcCounts = await calcQ.getJobCounts();
  console.log('leaderboard-calc queue counts:', calcCounts);

  await conn.quit();
}

main().catch(console.error);
