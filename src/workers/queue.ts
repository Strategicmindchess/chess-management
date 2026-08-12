import { Queue } from 'bullmq';
import IORedis from 'ioredis';

/**
 * Builds a clean Redis URL from environment variables.
 *
 * On Railway, REDIS_URL is set as a Railway reference string like:
 *   redis://${{REDISUSER}}:${{REDIS_PASSWORD}}@${{REDISHOST}}:${{REDISPORT}}
 * These ${{...}} tokens are expanded by Railway at runtime on deployed services.
 *
 * When running locally (worker.ts via tsx), those tokens are NOT expanded because
 * dotenv doesn't know about Railway syntax. In that case we fall back to building
 * the URL ourselves from the individual env vars, or default to localhost.
 *
 * Railway Redis 5.x rejects a username in the AUTH command. If the username is
 * "default" (the Railway default), we omit it so the URL is redis://:pass@host:port
 * which is accepted by both Redis 5 and Redis 6+.
 */
function buildRedisUrl(): string {
  const rawUrl = process.env.REDIS_URL ?? '';

  // If the URL looks clean (no unexpanded Railway tokens), use it directly.
  if (rawUrl && !rawUrl.includes('${{')) {
    return rawUrl;
  }

  // Build from individual variables (local dev or Railway internal network).
  const user     = process.env.REDISUSER     ?? 'default';
  const pass     = process.env.REDIS_PASSWORD ?? process.env.REDISPASSWORD ?? '';
  const rawHost  = process.env.REDISHOST     ?? '';
  const port     = process.env.REDISPORT     ?? '6379';

  // If the host is also an unexpanded Railway token, fall back to localhost.
  const host = rawHost && !rawHost.includes('${{') ? rawHost : 'localhost';

  if (!pass || host === 'localhost') {
    // No auth needed locally.
    return `redis://${host}:${port}`;
  }

  // Redis 5: omit username if it is the default "default" user.
  if (user === 'default') {
    return `redis://:${pass}@${host}:${port}`;
  }

  return `redis://${user}:${pass}@${host}:${port}`;
}

const redisUrl = buildRedisUrl();

export const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null, // Required by BullMQ
});

connection.on('error', (err) => {
  console.error('[Redis] BullMQ Connection Error:', err.message);
});

export const batchQueue = new Queue('batch-queue', { connection });
