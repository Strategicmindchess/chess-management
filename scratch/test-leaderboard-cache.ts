import { redisGet } from '../src/lib/redis';
import { REDIS_KEYS } from '../src/lib/leaderboard-config';
import { getCurrentPeriod } from '../src/lib/leaderboard-period';

// Note: Need to mock env variables if they aren't loaded automatically by ts-node
require('dotenv').config();

async function run() {
  const period = getCurrentPeriod('MONTHLY');
  const cacheKey = REDIS_KEYS.leaderboard('MONTHLY', period.periodStart.toISOString());
  
  console.log(`Checking cache key: ${cacheKey}`);
  
  for (let i = 1; i <= 100; i++) {
    try {
      const cached = await redisGet<{entries: any[]}>(cacheKey);
      const timestamp = new Date().toISOString();
      if (cached) {
        console.log(`[${timestamp}] Call ${i}: CACHE HIT - Entries: ${cached.entries?.length || 0}`);
      } else {
        console.log(`[${timestamp}] Call ${i}: CACHE MISS`);
      }
    } catch (e) {
      console.error(`Error on call ${i}:`, e);
    }
    // Wait 1 second
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  process.exit(0);
}

run().catch(console.error);
