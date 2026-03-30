import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";

// GET /api/notifications/stream — SSE endpoint for real-time notifications
export async function GET(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial unread count
      const unreadCount = await prisma.notification.count({
        where: { userId: user.userId, isRead: false },
      });
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "init", unreadCount })}\n\n`));

      // Poll every 5 seconds for new notifications
      let lastCheck = new Date();
      const interval = setInterval(async () => {
        if (closed) { clearInterval(interval); return; }
        try {
          const newNotifications = await prisma.notification.findMany({
            where: { userId: user.userId, createdAt: { gt: lastCheck } },
            orderBy: { createdAt: "desc" },
          });
          lastCheck = new Date();
          if (newNotifications.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "new", notifications: newNotifications })}\n\n`));
          }
          // Heartbeat
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          // Connection may have closed
          clearInterval(interval);
        }
      }, 5000);

      // Clean up on abort
      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
