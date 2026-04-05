import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { sanitizeText } from "@/lib/sanitize";
import { createNotification } from "@/lib/notifications";

// GET /api/admin-chat — list user's chats (or all chats for admin)
export async function GET(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const chatId = searchParams.get("chatId");

  // Get specific chat with messages
  if (chatId) {
    const chat = await prisma.adminChat.findUnique({
      where: { id: chatId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        user: { select: { name: true, role: true } },
        admin: { select: { name: true } },
      },
    });
    if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    // Only chat participant or admin can view
    if (chat.userId !== user.userId && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(chat);
  }

  // List chats
  if (user.role === "ADMIN") {
    const chats = await prisma.adminChat.findMany({
      include: {
        user: { select: { name: true, role: true } },
        admin: { select: { name: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(chats);
  }

  const chats = await prisma.adminChat.findMany({
    where: { userId: user.userId },
    include: {
      admin: { select: { name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(chats);
}

// POST /api/admin-chat — create new chat or send message
export async function POST(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { chatId, subject, content } = await req.json();

  // Send message to existing chat
  if (chatId && content) {
    const chat = await prisma.adminChat.findUnique({ where: { id: chatId } });
    if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    if (chat.userId !== user.userId && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const message = await prisma.adminChatMessage.create({
      data: { chatId, senderId: user.userId, content: sanitizeText(content) },
    });
    await prisma.adminChat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });

    // Notify the other party
    if (user.role === "ADMIN" && chat.userId !== user.userId) {
      await createNotification({
        userId: chat.userId,
        type: "MESSAGE",
        title: "Admin Support Reply",
        body: "An admin has replied to your support chat.",
        data: { link: "/support" },
      }).catch(console.error);
    } else if (chat.adminId && chat.adminId !== user.userId) {
      await createNotification({
        userId: chat.adminId,
        type: "MESSAGE",
        title: "New Support Message",
        body: `A user sent a message in support chat.`,
        data: { link: "/admin?tab=support" },
      }).catch(console.error);
    }

    // If no admin assigned yet, notify all admins
    if (!chat.adminId) {
      const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
      for (const admin of admins) {
        await createNotification({
          userId: admin.id,
          type: "MESSAGE",
          title: "⚡ New Support Chat Pending",
          body: `A user needs help. Please log in to respond.`,
          data: { link: "/admin?tab=support" },
        }).catch(console.error);
      }
    }

    return NextResponse.json(message, { status: 201 });
  }

  // Create new chat
  if (!subject || !content) {
    return NextResponse.json({ error: "Subject and message required" }, { status: 400 });
  }

  // Auto-assign to an admin if possible (find any admin)
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
  const assignedAdmin = admins.length > 0 ? admins[0] : null;

  const chat = await prisma.adminChat.create({
    data: {
      userId: user.userId,
      adminId: assignedAdmin?.id || null,
      subject: sanitizeText(subject),
      status: assignedAdmin ? "ASSIGNED" : "OPEN",
      messages: {
        create: { senderId: user.userId, content: sanitizeText(content) },
      },
    },
    include: { messages: true },
  });

  // Notify all admins about new chat
  for (const admin of admins) {
    await createNotification({
      userId: admin.id,
      type: "MESSAGE",
      title: "⚡ New Support Chat",
      body: `A user started a support chat: "${subject}"`,
      data: { link: "/admin?tab=support" },
    }).catch(console.error);
  }

  return NextResponse.json(chat, { status: 201 });
}

// PATCH /api/admin-chat — update chat (admin: assign, resolve, close)
export async function PATCH(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { chatId, action } = await req.json();
  if (!chatId || !action) {
    return NextResponse.json({ error: "chatId and action required" }, { status: 400 });
  }

  const chat = await prisma.adminChat.findUnique({ where: { id: chatId } });
  if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 });

  if (action === "assign") {
    const updated = await prisma.adminChat.update({
      where: { id: chatId },
      data: { adminId: user.userId, status: "ASSIGNED" },
    });
    return NextResponse.json(updated);
  }

  if (action === "resolve") {
    const updated = await prisma.adminChat.update({
      where: { id: chatId },
      data: { status: "RESOLVED" },
    });
    await createNotification({
      userId: chat.userId,
      type: "MESSAGE",
      title: "Support Chat Resolved",
      body: "Your support chat has been marked as resolved.",
      data: { link: "/support" },
    }).catch(console.error);
    return NextResponse.json(updated);
  }

  if (action === "close") {
    const updated = await prisma.adminChat.update({
      where: { id: chatId },
      data: { status: "CLOSED" },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
