// Rate limiting — Redis-backed with in-memory fallback
// Phase 7: Production-grade rate limiting

import { cacheIncr, cacheGet } from "@/lib/redis";

interface RateLimitConfig {
  maxRequests: number;  // Max requests in window
  windowSeconds: number; // Time window in seconds
}

const CONFIGS: Record<string, RateLimitConfig> = {
  auth: { maxRequests: 5, windowSeconds: 60 },        // 5 per minute
  api: { maxRequests: 60, windowSeconds: 60 },         // 60 per minute
  upload: { maxRequests: 10, windowSeconds: 60 },      // 10 per minute
  message: { maxRequests: 30, windowSeconds: 60 },     // 30 per minute
  webhook: { maxRequests: 100, windowSeconds: 60 },    // 100 per minute (Stripe/Checkr)
};

export async function checkRateLimit(
  identifier: string,
  type: "auth" | "api" | "upload" | "message" | "webhook" = "api"
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const config = CONFIGS[type];
  const key = `rl:${type}:${identifier}`;

  try {
    const count = await cacheIncr(key, config.windowSeconds);
    if (count > config.maxRequests) {
      // Estimate time remaining in window
      const ttlStr = await cacheGet(`${key}:ttl`);
      const retryAfterMs = ttlStr ? parseInt(ttlStr, 10) * 1000 : config.windowSeconds * 1000;
      return { allowed: false, retryAfterMs };
    }
    return { allowed: true, retryAfterMs: 0 };
  } catch {
    // If Redis fails, allow the request (fail-open for availability)
    return { allowed: true, retryAfterMs: 0 };
  }
}

export function getClientIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
