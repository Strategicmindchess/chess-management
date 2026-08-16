import { redis } from '../src/lib/redis';

async function main() {
  const keys = await redis.keys('*leaderboard*');
  if (keys.length > 0) {
    console.log('Deleting keys:', keys);
    await redis.del(...keys);
  }
  
  const top10Keys = await redis.keys('*top10*');
  if (top10Keys.length > 0) {
    console.log('Deleting top10 keys:', top10Keys);
    await redis.del(...top10Keys);
  }

  const scoreKeys = await redis.keys('*studentScore*');
  if (scoreKeys.length > 0) {
    console.log('Deleting score keys:', scoreKeys);
    await redis.del(...scoreKeys);
  }

  console.log('Cache cleared successfully.');
}

main().catch(console.error).finally(() => process.exit(0));
