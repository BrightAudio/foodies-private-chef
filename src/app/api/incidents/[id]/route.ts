import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { logAuditAction } from "@/lib/auditLog";
import { withErrorHandler } from "@/lib/api-error-handler";

// PATCH /api/incidents/[id] — Admin: Update incident status
async function _PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getTokenFromRequest(req);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { status, adminNotes } = await req.json();

  const validStatuses = ["OPEN", "INVESTIGATING", "RESOLVED", "DISMISSED"];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: `Invalid status. Must be: ${validStatuses.join(", ")}` }, { status: 400 });
  }

  const incident = await prisma.incidentReport.findUnique({ where: { id } });
  if (!incident) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (status) updateData.status = status;
  if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
  if (status === "RESOLVED" || status === "DISMISSED") {
    updateData.resolvedAt = new Date();
    updateData.resolvedBy = user.userId;
  }

  const updated = await prisma.incidentReport.update({
    where: { id },
    data: updateData,
  });

  const ip = req.headers.get("x-forwarded-for") || "unknown";
  logAuditAction({
    adminUserId: user.userId,
    action: "UPDATE_INCIDENT",
    targetType: "USER",
    targetId: id,
    details: { status, adminNotes },
    ipAddress: ip,
  }).catch(console.error);

  return NextResponse.json(updated);
}


export const PATCH = withErrorHandler(_PATCH);