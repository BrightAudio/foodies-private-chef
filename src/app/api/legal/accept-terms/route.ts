import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";

// POST /api/legal/accept-terms — Accept Terms of Service + liability waiver
export async function POST(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { termsType, signature } = await req.json();
  const validTypes = ["CLIENT_TOS", "LIABILITY_WAIVER", "CHEF_NON_COMPETE", "CHEF_ANTI_POACHING"];

  if (!termsType || !validTypes.includes(termsType)) {
    return NextResponse.json({ error: `termsType must be one of: ${validTypes.join(", ")}` }, { status: 400 });
  }

  if (!signature?.trim()) {
    return NextResponse.json({ error: "Digital signature (full name) is required" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";
  const now = new Date();

  // Update user or chef profile based on terms type
  if (termsType === "CLIENT_TOS") {
    await prisma.user.update({
      where: { id: user.userId },
      data: { termsAcceptedAt: now },
    });
  } else if (termsType === "LIABILITY_WAIVER") {
    await prisma.user.update({
      where: { id: user.userId },
      data: { liabilityWaiverAt: now },
    });
  } else if (termsType === "CHEF_NON_COMPETE") {
    await prisma.chefProfile.updateMany({
      where: { userId: user.userId },
      data: { chefNonCompeteAt: now },
    });
  } else if (termsType === "CHEF_ANTI_POACHING") {
    await prisma.chefProfile.updateMany({
      where: { userId: user.userId },
      data: { antiPoachingAcceptedAt: now },
    });
  }

  // Log consent for legal records
  const chefProfile = await prisma.chefProfile.findUnique({ where: { userId: user.userId } });

  if (chefProfile) {
    await prisma.consentLog.create({
      data: {
        chefProfileId: chefProfile.id,
        consentType: termsType,
        consentText: `User accepted ${termsType} terms`,
        signature: signature.trim(),
        ipAddress: ip,
        userAgent,
      },
    });
  }

  return NextResponse.json({
    accepted: true,
    termsType,
    timestamp: now.toISOString(),
  });
}

// GET /api/legal/accept-terms — Check which terms the user has accepted
export async function GET(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { termsAcceptedAt: true, liabilityWaiverAt: true, role: true },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const result: Record<string, string | null> = {
    clientTos: dbUser.termsAcceptedAt?.toISOString() || null,
    liabilityWaiver: dbUser.liabilityWaiverAt?.toISOString() || null,
  };

  if (dbUser.role === "CHEF") {
    const chef = await prisma.chefProfile.findUnique({
      where: { userId: user.userId },
      select: { termsAcceptedAt: true, antiPoachingAcceptedAt: true, chefNonCompeteAt: true },
    });
    result.chefTerms = chef?.termsAcceptedAt?.toISOString() || null;
    result.antiPoaching = chef?.antiPoachingAcceptedAt?.toISOString() || null;
    result.nonCompete = chef?.chefNonCompeteAt?.toISOString() || null;
  }

  return NextResponse.json(result);
}
