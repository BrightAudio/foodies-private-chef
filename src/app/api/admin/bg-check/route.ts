import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { notifyBgCheckUpdate } from "@/lib/notifications";

// POST /api/admin/bg-check — initiate or update external background check
// Improvement #18: Stub for Checkr/Sterling integration
export async function POST(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { chefProfileId, action } = await req.json();
  if (!chefProfileId || !action) {
    return NextResponse.json({ error: "chefProfileId and action required" }, { status: 400 });
  }

  const chef = await prisma.chefProfile.findUnique({
    where: { id: chefProfileId },
    include: { user: true },
  });
  if (!chef) {
    return NextResponse.json({ error: "Chef not found" }, { status: 404 });
  }

  if (action === "INITIATE") {
    // In production, this would call the Checkr/Sterling API:
    // const result = await checkrClient.createCandidate({ ... });
    // const invitation = await checkrClient.createInvitation({ candidateId: result.id });

    const externalId = `CHK_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await prisma.chefProfile.update({
      where: { id: chefProfileId },
      data: {
        bgCheckExternalId: externalId,
        bgCheckStatus: "PENDING",
        bgCheckSubmittedAt: new Date(),
        verificationStatus: "BG_CHECK_RUNNING",
      },
    });

    // Notify chef
    notifyBgCheckUpdate(chef.userId, "BG_CHECK_RUNNING").catch(console.error);

    return NextResponse.json({
      success: true,
      externalId,
      message: "Background check initiated. In production, this integrates with Checkr/Sterling API.",
    });
  }

  if (action === "CHECK_STATUS") {
    // In production: const status = await checkrClient.getReport(chef.bgCheckExternalId);
    return NextResponse.json({
      externalId: chef.bgCheckExternalId,
      bgCheckStatus: chef.bgCheckStatus,
      verificationStatus: chef.verificationStatus,
      message: "In production, this would query the external provider for real-time status.",
    });
  }

  return NextResponse.json({ error: "Invalid action. Use INITIATE or CHECK_STATUS" }, { status: 400 });
}
