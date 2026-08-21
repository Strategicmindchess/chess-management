#!/bin/sh
node -e "
const { Queue } = require('bullmq');
const IORedis = require('ioredis');
const conn = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });

async function main() {
  // Delete the paused marker key directly
  const deleted = await conn.del('bull:chess-fetch:paused');
  console.log('Deleted paused key:', deleted);

  const q = new Queue('chess-fetch-queue', { connection: conn });
  const isPaused = await q.isPaused();
  console.log('chess-fetch isPaused after delete:', isPaused);
  
  const counts = await q.getJobCounts();
  console.log('chess-fetch counts:', JSON.stringify(counts));
  
  await q.close();
  await conn.quit();
  console.log('Done!');
}

main().catch(e => { console.error(e.message); process.exit(1); });
"
