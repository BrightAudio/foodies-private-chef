import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { filterContactInfo } from "@/lib/antiPoaching";
import { sanitizeText } from "@/lib/sanitize";
import { notifyNewMessage } from "@/lib/notifications";

// GET /api/messages?bookingId=xxx — get messages for a booking
export async function GET(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookingId = req.nextUrl.searchParams.get("bookingId");
  if (!bookingId) {
    return NextResponse.json({ error: "bookingId required" }, { status: 400 });
  }

  // Verify the user is part of this booking
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { chefProfile: true },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const isClient = booking.clientId === user.userId;
  const isChef = booking.chefProfile.userId === user.userId;
  if (!isClient && !isChef && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Not authorized for this booking" }, { status: 403 });
  }

  const messages = await prisma.message.findMany({
    where: { bookingId },
    include: {
      sender: { select: { id: true, name: true, role: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(messages);
}

// POST /api/messages — send a message
export async function POST(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingId, content } = await req.json();

  if (!bookingId || !content?.trim()) {
    return NextResponse.json({ error: "bookingId and content required" }, { status: 400 });
  }

  // Verify the user is part of this booking
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { chefProfile: true },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const isClient = booking.clientId === user.userId;
  const isChef = booking.chefProfile.userId === user.userId;
  if (!isClient && !isChef) {
    return NextResponse.json({ error: "Not authorized for this booking" }, { status: 403 });
  }

  // Determine receiver
  const receiverId = isClient ? booking.chefProfile.userId : booking.clientId;

  // Sanitize + anti-poaching filter
  const sanitized = sanitizeText(content.trim());
  const { filtered, wasFiltered } = filterContactInfo(sanitized);

  const message = await prisma.message.create({
    data: {
      bookingId,
      senderId: user.userId,
      receiverId,
      content: filtered,
      isFiltered: wasFiltered,
    },
    include: {
      sender: { select: { id: true, name: true, role: true } },
    },
  });

  // Notify the receiver
  const sender = await prisma.user.findUnique({ where: { id: user.userId }, select: { name: true } });
  notifyNewMessage(receiverId, sender?.name || "Someone", bookingId).catch(console.error);

  return NextResponse.json(message, { status: 201 });
}
