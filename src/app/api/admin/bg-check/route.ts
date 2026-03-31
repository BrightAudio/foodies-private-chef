import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { notifyBgCheckUpdate } from "@/lib/notifications";
import { isIdVerificationEnabled, createVerificationSession, getVerificationSession, mapIdentityStatus } from "@/lib/onfido";
import { isCheckrEnabled, createCandidate, createInvitation, getReport, mapCheckrStatus } from "@/lib/checkr";
import { isStripeEnabled, chargePlatformForBgCheck } from "@/lib/stripe";

// Background check costs (in cents) — paid from platform Stripe account
const IDENTITY_COST_CENTS = 150;  // ~$1.50 per Stripe Identity verification
const CHECKR_COST_CENTS = 1500;   // ~$15 per Checkr criminal check

// POST /api/admin/bg-check — Initiate ID verification, criminal check, check status, or admin-override
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

  // INITIATE_ID — Stripe Identity verification (~$1.50, document + selfie)
  if (action === "INITIATE_ID") {
    if (!isIdVerificationEnabled()) {
      return NextResponse.json({
        error: "Stripe not configured. Set STRIPE_SECRET_KEY in environment.",
      }, { status: 503 });
    }

    if (!chef.bgCheckFullName || !chef.bgCheckDOB) {
      return NextResponse.json({
        error: "Chef has not submitted verification info (name, DOB required)",
      }, { status: 400 });
    }

    const nameParts = chef.bgCheckFullName.split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || firstName;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const session = await createVerificationSession({
      firstName,
      lastName,
      email: chef.user.email,
      chefProfileId,
      returnUrl: `${appUrl}/chef/dashboard`,
    });

    // Charge platform Stripe account for ID verification cost
    let stripeChargeId: string | null = null;
    if (isStripeEnabled()) {
      const charge = await chargePlatformForBgCheck(
        IDENTITY_COST_CENTS,
        chefProfileId,
        `Stripe Identity verification for ${chef.bgCheckFullName}`
      );
      stripeChargeId = charge?.id ?? null;
    }

    await prisma.chefProfile.update({
      where: { id: chefProfileId },
      data: {
        bgCheckExternalId: session.id, // Stripe Identity session ID for webhook matching
        idVerificationStatus: "PENDING",
        verificationStatus: "IDENTITY_VERIFIED",
      },
    });

    notifyBgCheckUpdate(chef.userId, "IDENTITY_VERIFIED").catch(console.error);

    return NextResponse.json({
      success: true,
      provider: "stripe_identity",
      sessionId: session.id,
      verificationUrl: session.url,
      stripeChargeId,
      cost: "$" + (IDENTITY_COST_CENTS / 100).toFixed(2),
      message: "ID verification initiated via Stripe Identity — platform charged",
    });
  }

  // INITIATE_CRIMINAL — Checkr criminal background check (~$15)
  // INITIATE_CRIMINAL — Mark as pending manual review (Checkr API optional)
  if (action === "INITIATE" || action === "INITIATE_CRIMINAL") {
    if (!chef.bgCheckFullName || !chef.bgCheckDOB) {
      return NextResponse.json({
        error: "Chef has not submitted background check info (name, DOB required)",
      }, { status: 400 });
    }

    // If Checkr API is configured, use it; otherwise mark for manual review
    if (isCheckrEnabled()) {
      const { decrypt } = await import("@/lib/crypto");
      const nameParts = chef.bgCheckFullName.split(" ");
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ") || firstName;

      const candidate = await createCandidate({
        firstName,
        lastName,
        email: chef.user.email,
        dob: chef.bgCheckDOB ? decrypt(chef.bgCheckDOB) : "",
        ssn: chef.bgCheckSSNLast4 ? `000-00-${decrypt(chef.bgCheckSSNLast4)}` : "000-00-0000",
        city: chef.bgCheckCity || "Unknown",
        state: chef.bgCheckState || "MI",
      });

      const invitation = await createInvitation(candidate.id);

      let stripeChargeId: string | null = null;
      if (isStripeEnabled()) {
        const charge = await chargePlatformForBgCheck(
          CHECKR_COST_CENTS,
          chefProfileId,
          `Checkr criminal background check for ${chef.bgCheckFullName}`
        );
        stripeChargeId = charge?.id ?? null;
      }

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
        provider: "checkr",
        candidateId: candidate.id,
        invitationUrl: invitation.invitation_url,
        stripeChargeId,
        cost: "$" + (CHECKR_COST_CENTS / 100).toFixed(2),
        message: "Criminal background check initiated via Checkr — platform charged",
      });
    }

    // No Checkr API — mark for manual review
    await prisma.chefProfile.update({
      where: { id: chefProfileId },
      data: {
        bgCheckStatus: "PENDING",
        bgCheckSubmittedAt: new Date(),
        verificationStatus: "BG_CHECK_RUNNING",
      },
    });

    notifyBgCheckUpdate(chef.userId, "BG_CHECK_RUNNING").catch(console.error);

    return NextResponse.json({
      success: true,
      provider: "manual",
      message: "Criminal background check marked as pending — run check manually on Checkr dashboard, then use OVERRIDE to approve/reject",
    });
  }

  if (action === "CHECK_STATUS") {
    const result: Record<string, unknown> = {
      bgCheckStatus: chef.bgCheckStatus,
      idVerificationStatus: chef.idVerificationStatus,
    };

    // Check Checkr status if configured and we have an external ID
    if (chef.bgCheckExternalId && chef.bgCheckReportId && isCheckrEnabled()) {
      try {
        const report = await getReport(chef.bgCheckReportId);
        const mappedStatus = mapCheckrStatus(report.status);
        if (mappedStatus !== chef.bgCheckStatus) {
          const updateData: Record<string, unknown> = {
            bgCheckStatus: mappedStatus,
            bgCheckWebhookStatus: `checkr:${report.status}`,
          };
          if (mappedStatus === "CLEAR") {
            updateData.bgCheckClearedAt = new Date();
            updateData.verificationStatus = "APPROVED";
            updateData.isApproved = true;
          } else if (mappedStatus === "CONSIDER") {
            updateData.verificationStatus = "FLAGGED";
          }
          await prisma.chefProfile.update({ where: { id: chefProfileId }, data: updateData });
          notifyBgCheckUpdate(chef.userId, mappedStatus).catch(console.error);
        }
        result.bgCheckStatus = mappedStatus;
        result.checkrStatus = report.status;
      } catch (err) {
        result.checkrError = err instanceof Error ? err.message : "Failed to check Checkr status";
      }
    }

    // Check Stripe Identity status if we have a session ID
    if (chef.bgCheckExternalId && !chef.bgCheckReportId && isIdVerificationEnabled()) {
      try {
        const session = await getVerificationSession(chef.bgCheckExternalId);
        const mappedId = mapIdentityStatus(session.status);
        if (mappedId !== chef.idVerificationStatus) {
          await prisma.chefProfile.update({
            where: { id: chefProfileId },
            data: { idVerificationStatus: mappedId },
          });
        }
        result.idVerificationStatus = mappedId;
        result.identityStatus = session.status;
      } catch (err) {
        result.identityError = err instanceof Error ? err.message : "Failed to check Stripe Identity status";
      }
    }

    return NextResponse.json(result);
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
