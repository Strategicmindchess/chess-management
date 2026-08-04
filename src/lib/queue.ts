import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Railway Redis connection string
// Example: redis://default:password@viaduct.proxy.rlwy.net:12345
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Configure IORedis connection
const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

// Export the BullMQ Queue instance
export const batchQueue = new Queue('batch-queue', { connection });
