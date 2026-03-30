import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";

const INSURANCE_PROVIDER_URL = process.env.INSURANCE_PROVIDER_URL || "https://thimble.com/partner/foodies";

// POST /api/insurance/referral — record insurance referral click + get redirect URL
export async function POST(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { provider } = await req.json();

  await prisma.insuranceReferral.create({
    data: {
      userId: user.userId,
      provider: provider || "thimble",
      status: "clicked",
    },
  });

  return NextResponse.json({
    redirectUrl: INSURANCE_PROVIDER_URL,
    message: "Get insured through our partner for streamlined verification",
  });
}

// GET /api/insurance/referral — get user's referral history
export async function GET(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const referrals = await prisma.insuranceReferral.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ referrals });
}
