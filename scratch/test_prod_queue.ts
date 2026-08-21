import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Connect using local .env which points to Railway Redis
function buildRedisUrl() {
  return process.env.REDIS_URL || 'redis://default:chPfPrlvAWqzdnSaTOwMBDlJpdjsSFoy@altaria.proxy.rlwy.net:46936';
}

async function main() {
  const conn = new IORedis(buildRedisUrl(), { maxRetriesPerRequest: null });
  // Note: Forcing PRODUCTION queue name manually
  const fetchQ = new Queue('chess-fetch', { connection: conn });
  
  console.log('Sending a test job directly to the PRODUCTION queue (chess-fetch)...');
  await fetchQ.add('fetch-all', {
    studentProfileId: 'test-id',
    periodType: 'MONTHLY',
    periodStart: new Date().toISOString(),
    periodEnd: new Date().toISOString(),
  }, { priority: 1 });

  console.log('Job sent successfully!');

  // Check counts
  const fetchCounts = await fetchQ.getJobCounts();
  console.log('chess-fetch queue counts:', fetchCounts);

  await conn.quit();
}

main().catch(console.error);
