// Rate limiting middleware using in-memory token bucket
// Improvement #2: Prevent brute-force attacks on auth routes

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.lastRefill > 600_000) store.delete(key);
  }
}, 300_000);

interface RateLimitConfig {
  maxTokens: number;     // Max requests in window
  refillRate: number;    // Tokens added per second
  windowMs?: number;     // Time window (unused — bucket refills continuously)
}

const CONFIGS: Record<string, RateLimitConfig> = {
  auth: { maxTokens: 5, refillRate: 0.1 },       // 5 attempts, refill 1 per 10s
  api: { maxTokens: 60, refillRate: 1 },          // 60/min
  upload: { maxTokens: 10, refillRate: 0.2 },     // 10 uploads, refill 1 per 5s
};

export function checkRateLimit(identifier: string, type: "auth" | "api" | "upload" = "api"): { allowed: boolean; retryAfterMs: number } {
  const config = CONFIGS[type];
  const key = `${type}:${identifier}`;
  const now = Date.now();

  let entry = store.get(key);
  if (!entry) {
    entry = { tokens: config.maxTokens, lastRefill: now };
    store.set(key, entry);
  }

  // Refill tokens based on elapsed time
  const elapsed = (now - entry.lastRefill) / 1000;
  entry.tokens = Math.min(config.maxTokens, entry.tokens + elapsed * config.refillRate);
  entry.lastRefill = now;

  if (entry.tokens < 1) {
    const waitTime = Math.ceil((1 - entry.tokens) / config.refillRate * 1000);
    return { allowed: false, retryAfterMs: waitTime };
  }

  entry.tokens -= 1;
  return { allowed: true, retryAfterMs: 0 };
}

export function getClientIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
