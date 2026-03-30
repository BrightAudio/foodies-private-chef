import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import {
  isStripeEnabled,
  createConnectAccount,
  createAccountLink,
  getConnectAccountStatus,
  createDashboardLink,
} from "@/lib/stripe";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// POST /api/stripe/connect — Create Stripe Connect Express account for chef
export async function POST(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user || user.role !== "CHEF") {
    return NextResponse.json({ error: "Only chefs can create payment accounts" }, { status: 403 });
  }

  if (!isStripeEnabled()) {
    return NextResponse.json({ error: "Payments not configured" }, { status: 503 });
  }

  const chef = await prisma.chefProfile.findUnique({
    where: { userId: user.userId },
    include: { user: { select: { email: true, name: true } } },
  });

  if (!chef) {
    return NextResponse.json({ error: "Chef profile not found" }, { status: 404 });
  }

  // If already has a Connect account, return onboarding link
  if (chef.stripeConnectAccountId) {
    if (chef.stripeConnectOnboarded) {
      // Already onboarded — return dashboard link
      const loginLink = await createDashboardLink(chef.stripeConnectAccountId);
      return NextResponse.json({
        alreadyOnboarded: true,
        dashboardUrl: loginLink.url,
      });
    }

    // Not yet onboarded — return new onboarding link
    const accountLink = await createAccountLink(
      chef.stripeConnectAccountId,
      `${APP_URL}/chef/dashboard?stripe=refresh`,
      `${APP_URL}/chef/dashboard?stripe=success`
    );
    return NextResponse.json({ onboardingUrl: accountLink.url });
  }

  // Create new Connect account
  const account = await createConnectAccount(chef.user.email, chef.user.name);

  await prisma.chefProfile.update({
    where: { id: chef.id },
    data: { stripeConnectAccountId: account.id },
  });

  // Create onboarding link
  const accountLink = await createAccountLink(
    account.id,
    `${APP_URL}/chef/dashboard?stripe=refresh`,
    `${APP_URL}/chef/dashboard?stripe=success`
  );

  return NextResponse.json({
    connectAccountId: account.id,
    onboardingUrl: accountLink.url,
  });
}

// GET /api/stripe/connect — Check Connect account status
export async function GET(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isStripeEnabled()) {
    return NextResponse.json({ error: "Payments not configured" }, { status: 503 });
  }

  const chef = await prisma.chefProfile.findUnique({
    where: { userId: user.userId },
  });

  if (!chef?.stripeConnectAccountId) {
    return NextResponse.json({ hasAccount: false, onboarded: false });
  }

  const status = await getConnectAccountStatus(chef.stripeConnectAccountId);

  // Update onboarded status if changed
  if (status.chargesEnabled && status.detailsSubmitted && !chef.stripeConnectOnboarded) {
    await prisma.chefProfile.update({
      where: { id: chef.id },
      data: { stripeConnectOnboarded: true },
    });
  }

  return NextResponse.json({
    hasAccount: true,
    onboarded: status.chargesEnabled && status.detailsSubmitted,
    chargesEnabled: status.chargesEnabled,
    payoutsEnabled: status.payoutsEnabled,
    detailsSubmitted: status.detailsSubmitted,
  });
}
