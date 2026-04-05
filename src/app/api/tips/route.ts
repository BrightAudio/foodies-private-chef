import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { withErrorHandler } from "@/lib/api-error-handler";

// POST /api/tips — leave a tip for a completed booking
async function _POST(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingId, amount, message } = await req.json();

  if (!bookingId || !amount || amount <= 0) {
    return NextResponse.json({ error: "bookingId and positive amount required" }, { status: 400 });
  }

  if (amount > 10000) {
    return NextResponse.json({ error: "Tip amount too large" }, { status: 400 });
  }

  // Verify booking belongs to user and is completed
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { chefProfile: { include: { user: true } } },
  });
  if (!booking || booking.clientId !== user.userId) {
    return NextResponse.json({ error: "Invalid booking" }, { status: 400 });
  }
  if (booking.status !== "COMPLETED") {
    return NextResponse.json({ error: "Can only tip on completed bookings" }, { status: 400 });
  }

  // Check no existing tip
  const existing = await prisma.tip.findUnique({ where: { bookingId } });
  if (existing) {
    return NextResponse.json({ error: "Tip already left for this booking" }, { status: 409 });
  }

  const tip = await prisma.tip.create({
    data: {
      bookingId,
      amount: Math.round(Number(amount) * 100) / 100,
      message: message?.trim() || null,
    },
  });

  // Notify the chef
  const { notifyTip } = await import("@/lib/notifications");
  const clientUser = await prisma.user.findUnique({ where: { id: user.userId } });
  notifyTip(
    booking.chefProfile.userId,
    clientUser?.name || "A client",
    tip.amount,
    bookingId
  ).catch(console.error);

  return NextResponse.json(tip, { status: 201 });
}


export const POST = withErrorHandler(_POST);