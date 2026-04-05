import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, calculateFees } from "@/lib/auth";
import { stripe as _stripe, isStripeEnabled, createEscrowPaymentIntent } from "@/lib/stripe";
import { sendBookingCreatedToChef } from "@/lib/email";

// POST /api/payments/create-intent
// Creates a booking + Stripe PaymentIntent with escrow (manual capture).
// Payment is authorized at booking time, captured only after job completion.
// Platform fee is automatically deducted; chef receives payout via Stripe Connect.
export async function POST(req: NextRequest) {
  try {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isStripeEnabled()) {
    return NextResponse.json({ error: "Payments not configured" }, { status: 503 });
  }

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }
  const { chefProfileId, date, time, endTime, guestCount, specialRequests, address, items } = body;

  if (!chefProfileId || !date || !time || !guestCount || !address) {
    return NextResponse.json({ error: "Missing required booking fields" }, { status: 400 });
  }

  // Validate date format and 24-hour minimum advance
  const bookingDate = new Date(date);
  if (isNaN(bookingDate.getTime())) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }
  const minBookingTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
  if (bookingDate < minBookingTime) {
    return NextResponse.json({ error: "Bookings must be at least 24 hours in advance" }, { status: 400 });
  }

  const chef = await prisma.chefProfile.findUnique({
    where: { id: chefProfileId },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!chef || !chef.isApproved || !chef.isActive) {
    return NextResponse.json({ error: "Chef not available" }, { status: 404 });
  }

  // Chef must have cleared background check
  if (chef.bgCheckStatus !== "CLEAR") {
    return NextResponse.json({ error: "Chef has not passed background check" }, { status: 403 });
  }

  // Chef must have completed Stripe Connect onboarding
  if (!chef.stripeConnectAccountId || !chef.stripeConnectOnboarded) {
    return NextResponse.json({ error: "Chef has not completed payment setup" }, { status: 403 });
  }

  // Calculate pricing
  let subtotal = chef.hourlyRate;
  const bookingItems: { name: string; price: number; quantity: number }[] = [];
  if (items && Array.isArray(items)) {
    for (const item of items) {
      subtotal += Number(item.price) * (Number(item.quantity) || 1);
      bookingItems.push({
        name: item.name,
        price: Number(item.price),
        quantity: Number(item.quantity) || 1,
      });
    }
  }
  const fees = calculateFees(subtotal);

  // Create booking in PENDING status with UNPAID payment
  const booking = await prisma.booking.create({
    data: {
      clientId: user.userId,
      chefProfileId,
      date: new Date(date),
      time,
      endTime: endTime || null,
      guestCount: Number(guestCount),
      specialRequests: specialRequests || null,
      address,
      subtotal: fees.subtotal,
      platformFee: fees.platformFee,
      total: fees.total,
      paymentStatus: "UNPAID",
      items: bookingItems.length > 0 ? { create: bookingItems } : undefined,
    },
  });

  // Create Stripe PaymentIntent with escrow (manual capture) and Connect destination
  const paymentIntent = await createEscrowPaymentIntent(
    Math.round(fees.total * 100), // amount in cents
    chef.stripeConnectAccountId,
    Math.round(fees.platformFee * 100), // platform fee in cents
    {
      bookingId: booking.id,
      chefProfileId,
      clientId: user.userId,
    }
  );

  // Store the PaymentIntent ID
  await prisma.booking.update({
    where: { id: booking.id },
    data: { stripePaymentIntentId: paymentIntent.id },
  });

  // Send email notification to chef
  const clientUser = await prisma.user.findUnique({ where: { id: user.userId } });
  sendBookingCreatedToChef({
    chefEmail: chef.user.email,
    chefName: chef.user.name,
    clientName: clientUser?.name || "A client",
    date: new Date(date).toLocaleDateString(),
    time,
    guestCount: Number(guestCount),
    total: fees.total,
    bookingId: booking.id,
  }).catch(console.error);

  return NextResponse.json({
    bookingId: booking.id,
    clientSecret: paymentIntent.client_secret,
    total: fees.total,
  });
  } catch (error) {
    console.error("Payment intent error:", error);
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}
