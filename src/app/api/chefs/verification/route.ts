import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { withErrorHandler } from "@/lib/api-error-handler";

// GET /api/chefs/verification — get current chef's verification status
async function _GET(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.chefProfile.findUnique({
    where: { userId: user.userId },
    select: {
      verificationStatus: true,
      bgCheckStatus: true,
      idVerificationStatus: true,
      isApproved: true,
      isActive: true,
      bgCheckSubmittedAt: true,
      bgCheckClearedAt: true,
      fcraConsentTimestamp: true,
      termsAcceptedAt: true,
      antiPoachingAcceptedAt: true,
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "No chef profile found" }, { status: 404 });
  }

  return NextResponse.json(profile);
}


export const GET = withErrorHandler(_GET);