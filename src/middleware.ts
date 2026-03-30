import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Security headers
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // CSRF protection: block non-GET requests from different origins
  // Exempt webhook endpoints (they use signature verification instead)
  const isWebhook = req.nextUrl.pathname.startsWith("/api/webhooks/") ||
    req.nextUrl.pathname === "/api/payments/webhook";
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
        // Invalid origin header — block
        return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
      }
    }
  }

  return res;
}

export const config = {
  matcher: [
    // Match all routes except static files and images
    "/((?!_next/static|_next/image|favicon.ico|uploads/).*)",
  ],
};
