import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { notifyBgCheckUpdate } from "@/lib/notifications";
import {
  isCheckrEnabled,
  createCandidate,
  createInvitation,
  getReport,
  mapCheckrStatus,
} from "@/lib/checkr";

// POST /api/admin/bg-check — Initiate, check status, or admin-override a background check
export async function POST(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { chefProfileId, action, overrideStatus } = await req.json();
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
    if (!isCheckrEnabled()) {
      return NextResponse.json({
        error: "Checkr API not configured. Set CHECKR_API_KEY in environment.",
      }, { status: 503 });
    }

    if (!chef.bgCheckFullName || !chef.bgCheckDOB) {
      return NextResponse.json({
        error: "Chef has not submitted background check info (name, DOB required)",
      }, { status: 400 });
    }

    // Parse name into first/last
    const nameParts = chef.bgCheckFullName.split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || firstName;

    // Parse city/state from address
    const addressParts = (chef.bgCheckAddress || "").split(",").map((s) => s.trim());
    const city = addressParts[0] || "Unknown";
    const state = addressParts[1] || "MI";

    // Create Checkr candidate
    const candidate = await createCandidate({
      firstName,
      lastName,
      email: chef.user.email,
      dob: chef.bgCheckDOB,
      ssn: chef.bgCheckSSNLast4 || "", // In production, decrypt and send full SSN
      city,
      state,
    });

    // Create invitation (triggers the actual check)
    const invitation = await createInvitation(candidate.id);

    await prisma.chefProfile.update({
      where: { id: chefProfileId },
      data: {
        bgCheckExternalId: candidate.id,
        bgCheckReportId: invitation.id,
        bgCheckStatus: "PENDING",
        bgCheckSubmittedAt: new Date(),
        verificationStatus: "BG_CHECK_RUNNING",
      },
    });

    notifyBgCheckUpdate(chef.userId, "BG_CHECK_RUNNING").catch(console.error);

    return NextResponse.json({
      success: true,
      candidateId: candidate.id,
      invitationId: invitation.id,
      message: "Background check initiated via Checkr",
    });
  }

  if (action === "CHECK_STATUS") {
    if (!chef.bgCheckReportId) {
      return NextResponse.json({
        bgCheckStatus: chef.bgCheckStatus,
        message: "No external report ID — check was not initiated via Checkr",
      });
    }

    if (!isCheckrEnabled()) {
      return NextResponse.json({
        bgCheckStatus: chef.bgCheckStatus,
        message: "Checkr API not configured — returning stored status",
      });
    }

    const report = await getReport(chef.bgCheckReportId);
    const mappedStatus = mapCheckrStatus(report.status);

    // Update if status changed
    if (mappedStatus !== chef.bgCheckStatus) {
      const updateData: Record<string, unknown> = {
        bgCheckStatus: mappedStatus,
        bgCheckWebhookStatus: report.status,
      };
      if (mappedStatus === "CLEAR") {
        updateData.bgCheckClearedAt = new Date();
        updateData.verificationStatus = "APPROVED";
      } else if (mappedStatus === "CONSIDER" || mappedStatus === "SUSPENDED") {
        updateData.verificationStatus = "FLAGGED";
      }

      await prisma.chefProfile.update({
        where: { id: chefProfileId },
        data: updateData,
      });

      notifyBgCheckUpdate(chef.userId, mappedStatus).catch(console.error);
    }

    return NextResponse.json({
      bgCheckStatus: mappedStatus,
      rawStatus: report.status,
      completedAt: report.completed_at,
    });
  }

  // ADMIN OVERRIDE — manually set bg check status (with audit)
  if (action === "OVERRIDE") {
    const validStatuses = ["CLEAR", "CONSIDER", "SUSPENDED", "FAILED"];
    if (!overrideStatus || !validStatuses.includes(overrideStatus)) {
      return NextResponse.json({ error: "overrideStatus must be CLEAR, CONSIDER, SUSPENDED, or FAILED" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { bgCheckStatus: overrideStatus };
    if (overrideStatus === "CLEAR") {
      updateData.bgCheckClearedAt = new Date();
      updateData.verificationStatus = "APPROVED";
      updateData.isApproved = true;
    } else {
      updateData.verificationStatus = "FLAGGED";
      updateData.isApproved = false;
    }

    await prisma.chefProfile.update({
      where: { id: chefProfileId },
      data: updateData,
    });

    // Audit the override
    const { logAuditAction } = await import("@/lib/auditLog");
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    logAuditAction({
      adminUserId: user.userId,
      action: "OVERRIDE_BG_CHECK",
      targetType: "CHEF",
      targetId: chefProfileId,
      details: { overrideStatus, previousStatus: chef.bgCheckStatus },
      ipAddress: ip,
    }).catch(console.error);

    notifyBgCheckUpdate(chef.userId, overrideStatus).catch(console.error);

    return NextResponse.json({
      success: true,
      bgCheckStatus: overrideStatus,
      message: `Admin override: background check status set to ${overrideStatus}`,
    });
  }

  return NextResponse.json({ error: "Invalid action. Use INITIATE, CHECK_STATUS, or OVERRIDE" }, { status: 400 });
}
