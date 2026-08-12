/**
 * Redis client singleton — shared across workers and server actions.
 * Uses the same connection logic as jobs/queue.ts.
 */

import IORedis from 'ioredis';

function buildRedisUrl(): string {
  const rawUrl = process.env.REDIS_URL ?? '';
  if (rawUrl && !rawUrl.includes('${{')) return rawUrl;

  const user = process.env.REDISUSER ?? 'default';
  const pass = process.env.REDIS_PASSWORD ?? process.env.REDISPASSWORD ?? '';
  const rawHost = process.env.REDISHOST ?? '';
  const port = process.env.REDISPORT ?? '6379';
  const host = rawHost && !rawHost.includes('${{') ? rawHost : 'localhost';

  if (!pass || host === 'localhost') return `redis://${host}:${port}`;
  if (user === 'default') return `redis://:${pass}@${host}:${port}`;
  return `redis://${user}:${pass}@${host}:${port}`;
}

const globalForRedis = globalThis as unknown as { _smcRedis?: IORedis };

export const redis =
  globalForRedis._smcRedis ??
  new IORedis(buildRedisUrl(), {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForRedis._smcRedis = redis;
}

redis.on('error', (err) => {
  console.error('[Redis] Connection Error:', err.message);
});

// ── Typed helper utilities ───────────────────────────────────────────────────

/** Get a cached value, parsed from JSON. Returns null on miss. */
export async function redisGet<T>(key: string): Promise<T | null> {
  try {
    const val = await redis.get(key);
    if (!val) return null;
    return JSON.parse(val) as T;
  } catch {
    return null;
  }
}

/** Set a cached JSON value with a TTL (seconds). */
export async function redisSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    console.error('[Redis] Set failed:', err);
  }
}

/** Delete one or more cache keys. */
export async function redisDel(...keys: string[]): Promise<void> {
  try {
    if (keys.length > 0) await redis.del(...keys);
  } catch (err) {
    console.error('[Redis] Del failed:', err);
  }
}

/**
 * Acquire a distributed lock. Returns true if lock acquired, false if already locked.
 * Lock auto-expires after `ttlSeconds` even if not explicitly released.
 */
export async function acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
  try {
    const result = await redis.set(key, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  } catch {
    return false;
  }
}

/** Release a lock. */
export async function releaseLock(key: string): Promise<void> {
  await redisDel(key);
}

/** Get the remaining TTL of a key in seconds (-1 = no TTL, -2 = key doesn't exist) */
export async function getTTL(key: string): Promise<number> {
  try {
    return await redis.ttl(key);
  } catch {
    return -2;
  }
}
