import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCheckrWebhook, mapCheckrStatus } from "@/lib/checkr";
import { notifyBgCheckUpdate } from "@/lib/notifications";

// POST /api/webhooks/checkr — Checkr webhook handler
// Receives background check status updates in real-time
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-checkr-signature") || "";

  // Verify webhook signature
  if (process.env.CHECKR_WEBHOOK_SECRET && !verifyCheckrWebhook(body, signature)) {
    console.error("Checkr webhook signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, data } = event;

  // report.completed — background check finished
  if (type === "report.completed" || type === "report.updated") {
    const candidateId = data?.object?.candidate_id;
    const reportStatus = data?.object?.status; // clear | consider | suspended
    const reportId = data?.object?.id;

    if (!candidateId || !reportStatus) {
      return NextResponse.json({ received: true });
    }

    const mappedStatus = mapCheckrStatus(reportStatus);

    // Find chef by Checkr candidate ID
    const chef = await prisma.chefProfile.findFirst({
      where: { bgCheckExternalId: candidateId },
    });

    if (!chef) {
      console.warn(`Checkr webhook: no chef found for candidate ${candidateId}`);
      return NextResponse.json({ received: true });
    }

    const updateData: Record<string, unknown> = {
      bgCheckStatus: mappedStatus,
      bgCheckWebhookStatus: reportStatus,
      bgCheckReportId: reportId,
    };

    if (mappedStatus === "CLEAR") {
      updateData.bgCheckClearedAt = new Date();
      updateData.verificationStatus = "APPROVED";
      updateData.isApproved = true;
    } else if (mappedStatus === "CONSIDER") {
      updateData.verificationStatus = "FLAGGED";
    } else if (mappedStatus === "SUSPENDED") {
      updateData.verificationStatus = "FLAGGED";
      updateData.isApproved = false;
      updateData.isActive = false;
    }

    await prisma.chefProfile.update({
      where: { id: chef.id },
      data: updateData,
    });

    // Notify the chef
    notifyBgCheckUpdate(chef.userId, mappedStatus).catch(console.error);
  }

  return NextResponse.json({ received: true });
}
