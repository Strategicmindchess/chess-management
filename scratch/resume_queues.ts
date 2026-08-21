import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Connect using local .env which points to Railway Redis
function buildRedisUrl() {
  const rawUrl = process.env.REDIS_URL ?? '';
  if (rawUrl && !rawUrl.includes('${{')) return rawUrl;
  const user = process.env.REDISUSER ?? 'default';
  const pass = process.env.REDIS_PASSWORD ?? process.env.REDISPASSWORD ?? '';
  const rawHost = process.env.REDISHOST ?? '';
  const port = process.env.REDISPORT ?? '6379';
  const host = rawHost && !rawHost.includes('${{') ? rawHost : 'localhost';
  if (!pass || host === 'localhost') return `redis://${host}:${port}`;
  if (user === 'default') return `redis://:${pass}@${host}:${port}`;
  return `redis://${user}:${pass}@${host}:${port}`;
}

async function main() {
  const conn = new IORedis(buildRedisUrl(), { maxRetriesPerRequest: null });
  
  const fetchQ = new Queue('chess-fetch-queue', { connection: conn });
  const calcQ = new Queue('leaderboard-calc-queue', { connection: conn });

  console.log('Resuming queues...');
  await fetchQ.resume();
  await calcQ.resume();
  console.log('Queues resumed!');
  
  // Check counts
  const fetchCounts = await fetchQ.getJobCounts();
  console.log('chess-fetch-queue counts:', fetchCounts);

  await conn.quit();
}

main().catch(console.error);
