import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { mapIdentityStatus } from "@/lib/onfido";
import { notifyBgCheckUpdate } from "@/lib/notifications";

// POST /api/webhooks/onfido — Stripe Identity verification webhook
// Note: Route path kept as /onfido for backward compatibility; handles Stripe identity.verification_session events
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature") || "";

  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe webhook not configured" }, { status: 503 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe Identity webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (
    event.type === "identity.verification_session.verified" ||
    event.type === "identity.verification_session.requires_input" ||
    event.type === "identity.verification_session.canceled"
  ) {
    const session = event.data.object as { id: string; status: string; metadata?: Record<string, string> };
    const sessionId = session.id;
    const status = session.status;
    const mappedStatus = mapIdentityStatus(status);

    // Find chef by Stripe Identity session ID (stored in bgCheckExternalId)
    const chef = await prisma.chefProfile.findFirst({
      where: { bgCheckExternalId: sessionId },
    });

    if (!chef) {
      console.warn(`Stripe Identity webhook: no chef found for session ${sessionId}`);
      return NextResponse.json({ received: true });
    }

    const updateData: Record<string, unknown> = {
      idVerificationStatus: mappedStatus,
      bgCheckWebhookStatus: `stripe_identity:${status}`,
    };

    if (mappedStatus === "VERIFIED") {
      updateData.verificationStatus = "IDENTITY_VERIFIED";
    } else if (mappedStatus === "FAILED") {
      updateData.verificationStatus = "FLAGGED";
    }

    await prisma.chefProfile.update({
      where: { id: chef.id },
      data: updateData,
    });

    notifyBgCheckUpdate(chef.userId, mappedStatus === "VERIFIED" ? "IDENTITY_VERIFIED" : "FLAGGED").catch(console.error);
  }

  return NextResponse.json({ received: true });
}
