import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { logAuditAction } from "@/lib/auditLog";
import { notifyBgCheckUpdate } from "@/lib/notifications";

// PATCH /api/admin/chefs/[id] — approve/deactivate chef, manage verification
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getTokenFromRequest(req);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { isApproved, isActive, bgCheckStatus, tier, verificationStatus, idVerificationStatus } = await req.json();

  const updateData: Record<string, unknown> = {};
  if (typeof isApproved === "boolean") updateData.isApproved = isApproved;
  if (typeof isActive === "boolean") updateData.isActive = isActive;

  if (bgCheckStatus && ["CLEARED", "FAILED", "PENDING", "NOT_SUBMITTED"].includes(bgCheckStatus)) {
    updateData.bgCheckStatus = bgCheckStatus;
    if (bgCheckStatus === "CLEARED") {
      updateData.bgCheckClearedAt = new Date();
    }
  }

  if (tier && ["SOUS_CHEF", "CHEF", "MASTER_CHEF"].includes(tier)) {
    updateData.tier = tier;
    updateData.tierOverride = true;
  }

  if (verificationStatus && ["NOT_STARTED", "INFO_SUBMITTED", "IDENTITY_VERIFIED", "BG_CHECK_RUNNING", "APPROVED", "FLAGGED", "REJECTED"].includes(verificationStatus)) {
    updateData.verificationStatus = verificationStatus;
    // Auto-approve when verification status is set to APPROVED
    if (verificationStatus === "APPROVED") {
      updateData.isApproved = true;
    }
    if (verificationStatus === "REJECTED") {
      updateData.isApproved = false;
    }
  }

  if (idVerificationStatus && ["NOT_SUBMITTED", "PENDING", "VERIFIED", "FAILED"].includes(idVerificationStatus)) {
    updateData.idVerificationStatus = idVerificationStatus;
  }

  const updated = await prisma.chefProfile.update({
    where: { id },
    data: updateData,
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  // Audit log the admin action
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  logAuditAction({
    adminUserId: user.userId,
    action: "CHEF_PROFILE_UPDATE",
    targetType: "ChefProfile",
    targetId: id,
    details: updateData,
    ipAddress: ip,
  }).catch(console.error);

  // Notify chef of verification/bg check changes
  if (verificationStatus || bgCheckStatus) {
    notifyBgCheckUpdate(
      updated.user.id,
      verificationStatus || bgCheckStatus
    ).catch(console.error);
  }

  return NextResponse.json(updated);
}
