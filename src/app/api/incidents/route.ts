import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { logAuditAction } from "@/lib/auditLog";
import { withErrorHandler } from "@/lib/api-error-handler";

// POST /api/incidents — Create an incident report
async function _POST(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reportedUserId, bookingId, type, severity, description, evidence } = await req.json();

  if (!type || !description?.trim()) {
    return NextResponse.json({ error: "type and description required" }, { status: 400 });
  }

  const validTypes = ["SAFETY", "FOOD_QUALITY", "PROPERTY_DAMAGE", "HARASSMENT", "NO_SHOW", "OTHER"];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: `Invalid type. Must be one of: ${validTypes.join(", ")}` }, { status: 400 });
  }

  const validSeverities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
  const sev = validSeverities.includes(severity) ? severity : "MEDIUM";

  const report = await prisma.incidentReport.create({
    data: {
      reporterId: user.userId,
      reportedUserId: reportedUserId || null,
      bookingId: bookingId || null,
      type,
      severity: sev,
      description: description.trim(),
      evidence: evidence ? JSON.stringify(evidence) : null,
    },
  });

  // ENFORCEMENT: High/Critical severity → restrict the reported chef
  if ((sev === "HIGH" || sev === "CRITICAL") && reportedUserId) {
    const reportedChef = await prisma.chefProfile.findUnique({
      where: { userId: reportedUserId },
    });
    if (reportedChef) {
      await prisma.chefProfile.update({
        where: { userId: reportedUserId },
        data: { activationStatus: "RESTRICTED" },
      });
      await logAuditAction({
        adminUserId: "SYSTEM",
        action: "CHEF_RESTRICTED",
        targetType: "CHEF",
        targetId: reportedUserId,
        details: { reason: `Auto-restricted due to ${sev} severity incident report (${type})`, incidentId: report.id },
        ipAddress: "system",
      });
    }
  }

  return NextResponse.json(report, { status: 201 });
}

// GET /api/incidents — List incidents (admin sees all, users see their own)
async function _GET(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get("status");
  const where: Record<string, unknown> = {};

  if (user.role !== "ADMIN") {
    where.reporterId = user.userId;
  }
  if (status) {
    where.status = status;
  }

  const incidents = await prisma.incidentReport.findMany({
    where,
    include: {
      reporter: { select: { id: true, name: true, email: true } },
      reportedUser: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(incidents);
}


export const POST = withErrorHandler(_POST);
export const GET = withErrorHandler(_GET);