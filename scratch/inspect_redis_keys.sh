#!/bin/sh
node -e "
const { Queue } = require('bullmq');
const IORedis = require('ioredis');
const conn = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });

// Check all BullMQ keys in Redis
conn.keys('bull:*').then(keys => {
  console.log('All BullMQ keys count:', keys.length);
  // Find paused markers
  const pausedKeys = keys.filter(k => k.includes('paused'));
  console.log('Paused keys:', JSON.stringify(pausedKeys));
  
  // Find prioritized keys
  const prioKeys = keys.filter(k => k.includes('prioritized'));
  console.log('Prioritized keys count:', prioKeys.length);
  return conn.quit();
}).then(() => { console.log('Done'); process.exit(0); }).catch(e => { console.error(e.message); process.exit(1); });
"
