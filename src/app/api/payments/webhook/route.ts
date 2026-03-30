import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

// POST /api/payments/webhook — Stripe webhook handler
// Handles the full escrow lifecycle:
//   1. payment_intent.amount_capturable_updated → payment authorized (escrow hold)
//   2. payment_intent.succeeded → payment captured (escrow released)
//   3. charge.refunded → refund processed
//   4. payout.paid → chef received their money
//   5. account.updated → Connect account status changes
export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    // Payment authorized (escrow hold in place)
    case "payment_intent.amount_capturable_updated": {
      const pi = event.data.object;
      const bookingId = pi.metadata?.bookingId;
      if (bookingId) {
        await prisma.booking.update({
          where: { id: bookingId },
          data: { paymentStatus: "CAPTURED" },
        });
      }
      break;
    }

    // Payment successfully captured (escrow released after job completion)
    case "payment_intent.succeeded": {
      const pi = event.data.object;
      const bookingId = pi.metadata?.bookingId;
      if (bookingId) {
        await prisma.booking.update({
          where: { id: bookingId },
          data: {
            paymentStatus: "RELEASED",
            payoutStatus: "RELEASED",
            payoutReleasedAt: new Date(),
          },
        });
      }
      break;
    }

    // Refund processed
    case "charge.refunded": {
      const charge = event.data.object;
      const paymentIntentId =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;

      if (paymentIntentId) {
        const booking = await prisma.booking.findFirst({
          where: { stripePaymentIntentId: paymentIntentId },
        });
        if (booking) {
          await prisma.booking.update({
            where: { id: booking.id },
            data: { paymentStatus: "REFUNDED", status: "CANCELLED" },
          });
        }
      }
      break;
    }

    // Chef received their payout
    case "payout.paid": {
      // Stripe sends this when a payout to a Connect account succeeds
      // We can update all bookings for that connect account that are in RELEASED status
      const payout = event.data.object;
      const connectAccountId = event.account;
      if (connectAccountId) {
        const chef = await prisma.chefProfile.findFirst({
          where: { stripeConnectAccountId: connectAccountId },
        });
        if (chef) {
          await prisma.booking.updateMany({
            where: {
              chefProfileId: chef.id,
              payoutStatus: "RELEASED",
            },
            data: { payoutStatus: "PAID" },
          });
        }
      }
      break;
    }

    // Connect account updated (onboarding status changes)
    case "account.updated": {
      const account = event.data.object;
      if (account.charges_enabled && account.details_submitted) {
        await prisma.chefProfile.updateMany({
          where: { stripeConnectAccountId: account.id },
          data: { stripeConnectOnboarded: true },
        });
      }
      break;
    }

    default:
      // Unhandled event type — log for debugging
      console.log(`Unhandled Stripe event: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
