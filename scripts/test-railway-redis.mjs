import Redis from 'ioredis';

const railwayRedisUrl = "redis://default:chPfPrlvAWqzdnSaTOwMBDlJpdjsSFoy@altaria.proxy.rlwy.net:46936";

async function main() {
  console.log('Testing connection to Railway Redis (Redis 7)...');
  const redis = new Redis(railwayRedisUrl, { connectTimeout: 10000 });
  
  try {
    const pong = await redis.ping();
    console.log('✅ Railway Redis PING:', pong);

    const info = await redis.info('server');
    const versionMatch = info.match(/redis_version:(.*)/);
    console.log('✅ Railway Redis Version:', versionMatch ? versionMatch[1].trim() : 'Unknown');
  } catch (err) {
    console.error('❌ Could not connect to Railway Redis:', err.message);
  } finally {
    await redis.quit();
  }
}

main();
