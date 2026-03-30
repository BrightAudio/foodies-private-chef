import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { calculateCancellationFee } from "@/lib/cancellation";
import { notifyBookingCancelled } from "@/lib/notifications";
import { isStripeEnabled, refundPayment } from "@/lib/stripe";

// POST /api/bookings/[id]/cancel — cancel a booking with cancellation policy + Stripe refund
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      client: { select: { name: true, email: true, id: true } },
      chefProfile: { include: { user: { select: { name: true, id: true } } } },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const isClient = booking.clientId === user.userId;
  const isAdmin = user.role === "ADMIN";

  if (!isClient && !isAdmin) {
    return NextResponse.json({ error: "Only clients or admins can cancel" }, { status: 403 });
  }

  if (booking.status === "CANCELLED") {
    return NextResponse.json({ error: "Booking already cancelled" }, { status: 400 });
  }

  if (booking.status === "COMPLETED") {
    return NextResponse.json({ error: "Cannot cancel completed booking" }, { status: 400 });
  }

  // Calculate cancellation fee
  const cancellation = calculateCancellationFee(booking.date, booking.time, booking.total);

  // Process Stripe refund if payment was captured
  if (isStripeEnabled() && booking.stripePaymentIntentId && cancellation.refundAmount > 0) {
    if (booking.paymentStatus === "CAPTURED" || booking.paymentStatus === "RELEASED") {
      try {
        await refundPayment(
          booking.stripePaymentIntentId,
          Math.round(cancellation.refundAmount * 100) // Refund amount in cents
        );
      } catch (err) {
        console.error("Stripe refund failed:", err);
        // Continue with cancellation — admin can process refund manually
      }
    }
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelledBy: user.userId,
      cancellationFeePercent: cancellation.feePercent,
      cancellationFee: cancellation.fee,
      refundAmount: cancellation.refundAmount,
      paymentStatus: cancellation.refundAmount > 0 ? "REFUNDED" : booking.paymentStatus,
    },
  });

  // Notify the other party
  const cancellerName = isClient ? booking.client.name : "Admin";
  const chefUserId = booking.chefProfile.user.id;
  notifyBookingCancelled(chefUserId, cancellerName, id).catch(console.error);
  if (!isClient) {
    notifyBookingCancelled(booking.clientId, cancellerName, id).catch(console.error);
  }

  return NextResponse.json({
    booking: updated,
    cancellation: {
      feePercent: cancellation.feePercent,
      fee: cancellation.fee,
      refundAmount: cancellation.refundAmount,
      policy: cancellation.policy,
    },
  });
}

// GET /api/bookings/[id]/cancel — preview cancellation fee
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const booking = await prisma.booking.findUnique({ where: { id } });

  if (!booking || (booking.clientId !== user.userId && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const cancellation = calculateCancellationFee(booking.date, booking.time, booking.total);
  return NextResponse.json(cancellation);
}
