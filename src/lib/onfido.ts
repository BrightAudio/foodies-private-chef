// Stripe Identity — ID Verification Integration
// Document + selfie verification via Stripe Identity (~$1.50/check)
// Replaces Onfido — uses existing Stripe account, no separate API key needed

import { stripe, isStripeEnabled } from "./stripe";
import type Stripe from "stripe";

export function isIdVerificationEnabled(): boolean {
  return isStripeEnabled();
}

// Keep legacy export name so existing imports don't break
export const isOnfidoEnabled = isIdVerificationEnabled;

/** Create a Stripe Identity VerificationSession for a chef */
export async function createVerificationSession(data: {
  firstName: string;
  lastName: string;
  email: string;
  chefProfileId: string;
  returnUrl: string;
}): Promise<{ id: string; url: string | null; clientSecret: string | null }> {
  if (!stripe) throw new Error("Stripe not configured");
  const session = await stripe.identity.verificationSessions.create({
    type: "document",
    options: {
      document: {
        require_matching_selfie: true,
      },
    },
    metadata: {
      chefProfileId: data.chefProfileId,
      email: data.email,
      name: `${data.firstName} ${data.lastName}`,
      platform: "foodies",
    },
    return_url: data.returnUrl,
  });
  return {
    id: session.id,
    url: session.url,
    clientSecret: session.client_secret,
  };
}

/** Retrieve a VerificationSession to check status */
export async function getVerificationSession(sessionId: string): Promise<{
  id: string;
  status: string; // requires_input | processing | verified | canceled
  lastError: string | null;
}> {
  if (!stripe) throw new Error("Stripe not configured");
  const session = await stripe.identity.verificationSessions.retrieve(sessionId);
  return {
    id: session.id,
    status: session.status,
    lastError: (session.last_error as Stripe.Identity.VerificationSession.LastError | null)?.reason ?? null,
  };
}

/** Map Stripe Identity status to our internal verification status */
export function mapIdentityStatus(status: string): string {
  switch (status) {
    case "verified": return "VERIFIED";
    case "processing": return "PENDING";
    case "requires_input": return "PENDING";
    case "canceled": return "FAILED";
    default: return "PENDING";
  }
}

// Legacy export aliases so existing imports continue to work
export const mapOnfidoResult = (_result: string | null, status: string): string => mapIdentityStatus(status);
