import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { sendPaymentReceiptEmail } from "@/lib/email";

// POST /api/payments/webhook — Stripe webhook handler
// Handles platform events (STRIPE_WEBHOOK_SECRET) and connected-account events (STRIPE_CONNECT_WEBHOOK_SECRET)
//   1. payment_intent.amount_capturable_updated → payment authorized (escrow hold)
//   2. payment_intent.succeeded → payment captured (escrow released)
//   3. charge.refunded → refund processed
//   4. payout.paid → chef received their money
//   5. payout.failed → chef payout failed
//   6. account.updated → Connect account status changes
export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // Try platform secret first, then connected-accounts secret
  const secrets = [
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET,
  ].filter(Boolean) as string[];

  if (secrets.length === 0) {
    return NextResponse.json({ error: "No webhook secrets configured" }, { status: 500 });
  }

  let event;
  for (const secret of secrets) {
    try {
      event = stripe.webhooks.constructEvent(body, sig, secret);
      break;
    } catch {
      // Try next secret
    }
  }

  if (!event) {
    console.error("Webhook signature verification failed with all secrets");
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
        const booking = await prisma.booking.update({
          where: { id: bookingId },
          data: {
            paymentStatus: "RELEASED",
            payoutStatus: "RELEASED",
            payoutReleasedAt: new Date(),
          },
          include: {
            client: { select: { email: true, name: true } },
            chefProfile: { include: { user: { select: { name: true } } } },
          },
        });

        // Send payment receipt email
        try {
          await sendPaymentReceiptEmail({
            clientEmail: booking.client.email,
            clientName: booking.client.name,
            chefName: booking.chefProfile.user.name,
            date: new Date(booking.date).toLocaleDateString(),
            subtotal: booking.subtotal,
            platformFee: booking.platformFee,
            total: booking.total,
            bookingId: booking.id,
          });
        } catch (emailErr) {
          console.error("Failed to send receipt email:", emailErr);
        }
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

    // Chef payout failed (bad bank details, etc.)
    case "payout.failed": {
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
            data: { payoutStatus: "FAILED" },
          });
          console.error(`Payout failed for chef ${chef.id}, account ${connectAccountId}, reason: ${payout.failure_message}`);
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

    // Dispute opened by cardholder
    case "charge.dispute.created": {
      const dispute = event.data.object;
      const paymentIntentId =
        typeof dispute.payment_intent === "string"
          ? dispute.payment_intent
          : dispute.payment_intent?.id;

      if (paymentIntentId) {
        const booking = await prisma.booking.findFirst({
          where: { stripePaymentIntentId: paymentIntentId },
        });
        if (booking) {
          await prisma.booking.update({
            where: { id: booking.id },
            data: { paymentStatus: "DISPUTED" },
          });
          console.error(
            `DISPUTE opened: booking=${booking.id}, pi=${paymentIntentId}, reason=${dispute.reason}, amount=${dispute.amount}`
          );
        }
      }
      break;
    }

    // Stripe Issuing — transaction created (grocery card spending)
    case "issuing_transaction.created": {
      const txn = event.data.object as {
        amount: number;
        card: string;
        merchant_data?: { name?: string; category?: string };
        metadata?: Record<string, string>;
      };
      // amount is in cents, negative for purchases
      const spentCents = Math.abs(txn.amount);
      const spentDollars = spentCents / 100;
      const stripeCardId = txn.card;

      if (stripeCardId) {
        const card = await prisma.groceryCard.findFirst({
          where: { stripeCardId },
        });
        if (card && card.status === "ACTIVE") {
          const newSpent = card.spent + spentDollars;
          const status = newSpent >= card.budget ? "DEPLETED" : "ACTIVE";
          await prisma.groceryCard.update({
            where: { id: card.id },
            data: { spent: newSpent, status },
          });
          console.log(`Issuing txn: card=${card.id}, amount=$${spentDollars}, merchant=${txn.merchant_data?.name || "unknown"}, total_spent=$${newSpent.toFixed(2)}`);
        }
      }
      break;
    }

    default:
      // Unhandled event type
      // eslint-disable-next-line no-console
      console.log(`Unhandled Stripe event: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
