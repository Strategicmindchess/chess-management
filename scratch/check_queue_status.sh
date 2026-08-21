#!/bin/sh
node -e "
const { Queue } = require('bullmq');
const IORedis = require('ioredis');
const conn = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });

Promise.all([
  new Queue('chess-fetch-queue', { connection: conn }).getJobCounts(),
  new Queue('leaderboard-calc-queue', { connection: conn }).getJobCounts(),
  new Queue('chess-fetch-queue', { connection: conn }).isPaused(),
]).then(([chess, calc, paused]) => {
  console.log('=== Queue Status ===');
  console.log('chess-fetch isPaused:', paused);
  console.log('chess-fetch counts:', JSON.stringify(chess));
  console.log('leaderboard-calc counts:', JSON.stringify(calc));
  return conn.quit();
}).then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
"
