import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("STRIPE_SECRET_KEY not set — Stripe payments will be disabled");
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-03-25.dahlia" })
  : null;

export function isStripeEnabled(): boolean {
  return stripe !== null;
}

// ── Stripe Connect helpers ──

/** Create a Stripe Connect Express account for a chef */
export async function createConnectAccount(email: string, name: string): Promise<Stripe.Account> {
  if (!stripe) throw new Error("Stripe not configured");
  return stripe.accounts.create({
    type: "express",
    email,
    business_type: "individual",
    individual: { first_name: name.split(" ")[0], last_name: name.split(" ").slice(1).join(" ") || name },
    capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
    metadata: { platform: "foodies" },
  });
}

/** Generate an onboarding link for Stripe Connect Express */
export async function createAccountLink(accountId: string, refreshUrl: string, returnUrl: string): Promise<Stripe.AccountLink> {
  if (!stripe) throw new Error("Stripe not configured");
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });
}

/** Check if a Connect account is fully onboarded and charges-enabled */
export async function getConnectAccountStatus(accountId: string): Promise<{
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}> {
  if (!stripe) throw new Error("Stripe not configured");
  const account = await stripe.accounts.retrieve(accountId);
  return {
    chargesEnabled: account.charges_enabled ?? false,
    payoutsEnabled: account.payouts_enabled ?? false,
    detailsSubmitted: account.details_submitted ?? false,
  };
}

/**
 * Create a PaymentIntent with escrow (manual capture).
 * Payment is authorized but NOT captured until job completion.
 */
export async function createEscrowPaymentIntent(
  amountCents: number,
  chefConnectAccountId: string,
  platformFeeCents: number,
  metadata: Record<string, string>
): Promise<Stripe.PaymentIntent> {
  if (!stripe) throw new Error("Stripe not configured");
  return stripe.paymentIntents.create({
    amount: amountCents,
    currency: "usd",
    capture_method: "manual", // Escrow: authorize only, capture later
    application_fee_amount: platformFeeCents,
    transfer_data: { destination: chefConnectAccountId },
    metadata,
  });
}

/** Capture a previously authorized PaymentIntent (release from escrow) */
export async function capturePayment(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  if (!stripe) throw new Error("Stripe not configured");
  return stripe.paymentIntents.capture(paymentIntentId);
}

/** Issue a refund for a PaymentIntent */
export async function refundPayment(paymentIntentId: string, amountCents?: number): Promise<Stripe.Refund> {
  if (!stripe) throw new Error("Stripe not configured");
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    ...(amountCents ? { amount: amountCents } : {}),
  });
}

/** Create a login link for a chef's Stripe Express dashboard */
export async function createDashboardLink(accountId: string): Promise<Stripe.LoginLink> {
  if (!stripe) throw new Error("Stripe not configured");
  return stripe.accounts.createLoginLink(accountId);
}
