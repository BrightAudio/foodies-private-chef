import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { withErrorHandler } from "@/lib/api-error-handler";

const BOOST_PRICE_CENTS = Number(process.env.BOOST_PRICE_CENTS) || 1999; // $19.99/week
const BOOST_DURATION_DAYS = 7;

// GET /api/chefs/boost — get current boost status
async function _GET(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user || user.role !== "CHEF") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.chefProfile.findUnique({
    where: { userId: user.userId },
    select: { boostActive: true, boostExpiresAt: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const isActive = profile.boostActive && profile.boostExpiresAt && new Date(profile.boostExpiresAt) > new Date();

  return NextResponse.json({
    boostActive: isActive,
    boostExpiresAt: profile.boostExpiresAt,
    pricePerWeek: BOOST_PRICE_CENTS / 100,
    durationDays: BOOST_DURATION_DAYS,
  });
}

// POST /api/chefs/boost — activate boost (would integrate with Stripe in production)
async function _POST(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user || user.role !== "CHEF") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.chefProfile.findUnique({
    where: { userId: user.userId },
    select: { id: true, activationStatus: true, boostActive: true, boostExpiresAt: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (profile.activationStatus !== "ACTIVE") {
    return NextResponse.json({ error: "Must be fully active to boost your profile" }, { status: 403 });
  }

  // Extend boost if already active
  const now = new Date();
  const currentExpiry = profile.boostActive && profile.boostExpiresAt && new Date(profile.boostExpiresAt) > now
    ? new Date(profile.boostExpiresAt)
    : now;
  const newExpiry = new Date(currentExpiry.getTime() + BOOST_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.chefProfile.update({
    where: { userId: user.userId },
    data: {
      boostActive: true,
      boostExpiresAt: newExpiry,
    },
  });

  return NextResponse.json({
    message: "Profile boosted! You'll appear at the top of search results.",
    boostExpiresAt: newExpiry,
    charged: BOOST_PRICE_CENTS / 100,
  });
}


export const GET = withErrorHandler(_GET);
export const POST = withErrorHandler(_POST);