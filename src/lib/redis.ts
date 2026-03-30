// Redis client — falls back to in-memory Map if REDIS_URL not configured
// Phase 7: Production-grade caching + rate limiting

import Redis from "ioredis";

let redis: Redis | null = null;

if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });
  redis.connect().catch((err) => {
    console.warn("Redis connection failed, falling back to in-memory:", err.message);
    redis = null;
  });
} else {
  console.warn("REDIS_URL not set — using in-memory cache/rate-limit (not suitable for production)");
}

// In-memory fallback store
const memoryStore = new Map<string, { value: string; expiresAt: number }>();

// Clean up expired in-memory entries every 60s
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    if (entry.expiresAt > 0 && now > entry.expiresAt) {
      memoryStore.delete(key);
    }
  }
}, 60_000);

export async function cacheGet(key: string): Promise<string | null> {
  if (redis) {
    return redis.get(key);
  }
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
}

export async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  if (redis) {
    await redis.set(key, value, "EX", ttlSeconds);
    return;
  }
  memoryStore.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export async function cacheDel(key: string): Promise<void> {
  if (redis) {
    await redis.del(key);
    return;
  }
  memoryStore.delete(key);
}

export async function cacheIncr(key: string, ttlSeconds: number): Promise<number> {
  if (redis) {
    const val = await redis.incr(key);
    if (val === 1) {
      await redis.expire(key, ttlSeconds);
    }
    return val;
  }
  const entry = memoryStore.get(key);
  if (!entry || (entry.expiresAt > 0 && Date.now() > entry.expiresAt)) {
    memoryStore.set(key, { value: "1", expiresAt: Date.now() + ttlSeconds * 1000 });
    return 1;
  }
  const newVal = parseInt(entry.value, 10) + 1;
  entry.value = String(newVal);
  return newVal;
}

export function isRedisConnected(): boolean {
  return redis !== null && redis.status === "ready";
}
