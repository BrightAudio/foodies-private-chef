import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "");

// In-memory sliding window rate limiter (per-deployment, edge-compatible)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();

  // Lazy cleanup: evict stale entries on access (edge-compatible, no setInterval)
  if (rateLimitMap.size > 500) {
    for (const [key, val] of rateLimitMap) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }

  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}

// Routes that require authentication
const PROTECTED_PREFIXES = [
  "/api/admin",
  "/api/bookings",
  "/api/chefs/earnings",
  "/api/chefs/boost",
  "/api/chefs/gallery",
  "/api/chefs/specials",
  "/api/chefs/availability",
  "/api/chefs/insurance",
  "/api/chefs/verification",
  "/api/stripe/connect",
  "/api/payments/create-intent",
  "/api/messages",
  "/api/notifications",
  "/api/social",
  "/api/client",
  "/api/tips",
  "/api/referrals",
  "/api/uploads",
];

async function verifyJWT(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { userId: string; role: string };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const path = req.nextUrl.pathname;

  // Security headers
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");

  // Rate limiting for API routes
  if (path.startsWith("/api/")) {
    const isAuth = path.startsWith("/api/auth/");
    const limit = isAuth ? 10 : 60; // tighter for auth
    const window = 60_000; // 1 minute
    if (!rateLimit(ip + ":" + (isAuth ? "auth" : "api"), limit, window)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  }

  // CSRF protection: block non-GET requests from different origins
  const isWebhook = path.startsWith("/api/webhooks/") || path === "/api/payments/webhook";
  if (!isWebhook && req.method !== "GET" && req.method !== "HEAD") {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
      }
    }
  }

  // Auth protection for sensitive API routes
  if (PROTECTED_PREFIXES.some(prefix => path.startsWith(prefix))) {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : req.cookies.get("token")?.value || null;
    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }
    // Admin-only routes
    if (path.startsWith("/api/admin") && payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|uploads/).*)",
  ],
};
