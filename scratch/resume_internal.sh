#!/bin/sh
node -e "
const { Queue } = require('bullmq');
const IORedis = require('ioredis');
const conn = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
const q1 = new Queue('chess-fetch-queue', { connection: conn });
const q2 = new Queue('leaderboard-calc-queue', { connection: conn });
q1.isPaused().then(p1 => {
  console.log('chess-fetch isPaused:', p1);
  return p1 ? q1.resume().then(() => console.log('chess-fetch RESUMED')) : Promise.resolve();
}).then(() => q2.isPaused()).then(p2 => {
  console.log('leaderboard-calc isPaused:', p2);
  return p2 ? q2.resume().then(() => console.log('leaderboard-calc RESUMED')) : Promise.resolve();
}).then(() => Promise.all([q1.getJobCounts(), q2.getJobCounts()])).then(([c1, c2]) => {
  console.log('chess-fetch counts:', JSON.stringify(c1));
  console.log('leaderboard-calc counts:', JSON.stringify(c2));
  return conn.quit();
}).then(() => { console.log('Done'); process.exit(0); }).catch(e => { console.error(e.message); process.exit(1); });
"
