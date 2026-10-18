import Redis from 'ioredis';

async function main() {
  console.log('Connecting to localhost:6379 (Memurai)...');
  const redis = new Redis('redis://localhost:6379', { connectTimeout: 3000, maxRetriesPerRequest: 1 });
  
  try {
    const pong = await redis.ping();
    console.log('✅ Connection Successful! PING:', pong);

    const info = await redis.info('server');
    const versionMatch = info.match(/redis_version:(.*)/);
    const memuraiVersion = info.match(/memurai_version:(.*)/);
    
    console.log('✅ Redis API Version:', versionMatch ? versionMatch[1].trim() : 'Unknown');
    if (memuraiVersion) {
      console.log('✅ Memurai Version:', memuraiVersion[1].trim());
    }
    console.log('\n🎉 Memurai is active and listening on port 6379!');
  } catch (err) {
    console.error('❌ Connection Failed:', err.message);
    console.log('\nMemurai service might not be started yet.');
  } finally {
    await redis.quit();
  }
}

main();
