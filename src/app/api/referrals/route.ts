import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import crypto from "crypto";
import { withErrorHandler } from "@/lib/api-error-handler";

const REFERRAL_CREDIT_AMOUNT = Number(process.env.REFERRAL_CREDIT_AMOUNT) || 25;

// GET /api/referrals — get user's referral code + stats
async function _GET(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { referralCode: true, referralCredits: true },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Generate referral code if none exists
  let referralCode = dbUser.referralCode;
  if (!referralCode) {
    referralCode = `FOOD-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    await prisma.user.update({
      where: { id: user.userId },
      data: { referralCode },
    });
  }

  const referralsSent = await prisma.referral.count({
    where: { referrerId: user.userId },
  });
  const referralsCredited = await prisma.referral.count({
    where: { referrerId: user.userId, status: "CREDITED" },
  });

  return NextResponse.json({
    referralCode,
    referralCredits: dbUser.referralCredits,
    referralsSent,
    referralsCredited,
    creditPerReferral: REFERRAL_CREDIT_AMOUNT,
  });
}

// POST /api/referrals — apply a referral code (called during signup)
async function _POST(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { referralCode } = await req.json();
  if (!referralCode) {
    return NextResponse.json({ error: "Referral code required" }, { status: 400 });
  }

  // Check if user already has a referrer
  const currentUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { referredByUserId: true },
  });
  if (currentUser?.referredByUserId) {
    return NextResponse.json({ error: "Referral already applied" }, { status: 409 });
  }

  // Find referrer
  const referrer = await prisma.user.findUnique({
    where: { referralCode },
    select: { id: true },
  });
  if (!referrer) {
    return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });
  }
  if (referrer.id === user.userId) {
    return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 });
  }

  // Create referral record + update user
  await prisma.$transaction([
    prisma.referral.create({
      data: {
        referrerId: referrer.id,
        referredUserId: user.userId,
        type: user.role === "CHEF" ? "CHEF_REFERRAL" : "CLIENT_REFERRAL",
        status: "PENDING",
        creditAmount: REFERRAL_CREDIT_AMOUNT,
      },
    }),
    prisma.user.update({
      where: { id: user.userId },
      data: { referredByUserId: referrer.id },
    }),
  ]);

  return NextResponse.json({ message: "Referral applied! Credits will be issued after first booking." });
}


export const GET = withErrorHandler(_GET);
export const POST = withErrorHandler(_POST);