import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { sendBookingConfirmedToClient, sendBookingCompletedToClient } from "@/lib/email";
import { calculateTier, calculateTrustScore } from "@/lib/tiers";
import { notifyBookingConfirmed, notifyBookingCancelled, createNotification } from "@/lib/notifications";
import { capturePayment, isStripeEnabled } from "@/lib/stripe";

// PATCH /api/bookings/[id] — update booking status
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { status, jobStatus, chefLatitude, chefLongitude, declineReason } = await req.json();

  // Handle live location update (chef sends location while en route)
  if (chefLatitude !== undefined && chefLongitude !== undefined && !status && !jobStatus) {
    const booking = await prisma.booking.findUnique({ where: { id }, include: { chefProfile: true } });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (booking.chefProfile.userId !== user.userId && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const updated = await prisma.booking.update({
      where: { id },
      data: { chefLatitude: Number(chefLatitude), chefLongitude: Number(chefLongitude), chefLocationUpdatedAt: new Date() },
    });
    return NextResponse.json({ ok: true, chefLatitude: updated.chefLatitude, chefLongitude: updated.chefLongitude });
  }

  // Handle job status updates (Start Job, On the Way, Arrived)
  if (jobStatus) {
    const validJobStatuses = ["PREPARING", "EN_ROUTE", "ARRIVED", "IN_PROGRESS", "COMPLETED"];
    if (!validJobStatuses.includes(jobStatus)) {
      return NextResponse.json({ error: "Invalid job status" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { chefProfile: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const isChef = booking.chefProfile.userId === user.userId;
    if (!isChef && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only the assigned chef can update job status" }, { status: 403 });
    }

    const updateData: Record<string, unknown> = { jobStatus };
    // Reveal address when chef starts en route
    if (jobStatus === "EN_ROUTE" && !booking.addressRevealedAt) {
      updateData.addressRevealedAt = new Date();
    }
    // When chef sets PREPARING, also update booking status to PREPARING
    if (jobStatus === "PREPARING") {
      updateData.status = "PREPARING";
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        client: { select: { name: true, email: true } },
        chefProfile: { include: { user: { select: { name: true } } } },
      },
    });

    // Notify client of status changes
    if (jobStatus === "EN_ROUTE") {
      await createNotification({
        userId: updated.clientId,
        type: "BOOKING_CONFIRMED",
        title: "Your Chef is En Route! 🚗",
        body: `Chef ${updated.chefProfile.user.name} is on the way to your location.`,
        data: { bookingId: id, link: "/client/bookings" },
      }).catch(console.error);
    } else if (jobStatus === "ARRIVED") {
      await createNotification({
        userId: updated.clientId,
        type: "BOOKING_CONFIRMED",
        title: "Your Chef Has Arrived! ✅",
        body: `Chef ${updated.chefProfile.user.name} has arrived at your location.`,
        data: { bookingId: id, link: "/client/bookings" },
      }).catch(console.error);
    }

    return NextResponse.json(updated);
  }

  // Handle booking status updates
  if (!status) {
    return NextResponse.json({ error: "status or jobStatus required" }, { status: 400 });
  }

  const validStatuses = ["ACCEPTED", "DECLINED", "CONFIRMED", "COMPLETED", "PENDING_COMPLETION", "CONFIRM_COMPLETE", "CANCELLED"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { chefProfile: true },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const isChef = booking.chefProfile.userId === user.userId;
  const isClient = booking.clientId === user.userId;
  const isAdmin = user.role === "ADMIN";

  if (!isChef && !isClient && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Chef accepts booking → ACCEPTED (then auto-confirm)
  if (status === "ACCEPTED") {
    if (!isChef && !isAdmin) {
      return NextResponse.json({ error: "Only chefs can accept bookings" }, { status: 403 });
    }
    if (booking.status !== "PENDING") {
      return NextResponse.json({ error: "Can only accept pending bookings" }, { status: 400 });
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: "CONFIRMED" },
      include: {
        client: { select: { name: true, email: true } },
        chefProfile: { include: { user: { select: { name: true } } } },
      },
    });

    // Enforcement: verify chef insurance is still valid
    const chefForCheck = await prisma.chefProfile.findUnique({ where: { id: booking.chefProfileId } });
    if (chefForCheck?.insuranceStatus !== "verified") {
      return NextResponse.json({ error: "Cannot accept: chef insurance not verified" }, { status: 403 });
    }

    sendBookingConfirmedToClient({
      clientEmail: updated.client.email,
      clientName: updated.client.name,
      chefName: updated.chefProfile.user.name,
      date: updated.date.toLocaleDateString(),
      time: updated.time,
      address: updated.address,
      total: updated.total,
    }).catch(console.error);
    notifyBookingConfirmed(updated.clientId, updated.chefProfile.user.name, id).catch(console.error);

    return NextResponse.json(updated);
  }

  // ── Chef declines booking → DECLINED + track declines
  if (status === "DECLINED") {
    if (!isChef && !isAdmin) {
      return NextResponse.json({ error: "Only chefs can decline bookings" }, { status: 403 });
    }
    if (booking.status !== "PENDING") {
      return NextResponse.json({ error: "Can only decline pending bookings" }, { status: 400 });
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: "DECLINED", declinedAt: new Date(), declineReason: declineReason || null },
      include: {
        client: { select: { name: true, email: true } },
        chefProfile: { include: { user: { select: { name: true } } } },
      },
    });

    // Track decline count on chef profile
    const chefProfile = await prisma.chefProfile.update({
      where: { id: booking.chefProfileId },
      data: { declineCount: { increment: 1 }, lastDeclineAt: new Date() },
    });

    // Decline penalties: warn at 5, 10, restrict at 15, terminate at 20
    const newCount = chefProfile.declineCount;
    let warningLevel: string | null = null;
    if (newCount >= 20) {
      warningLevel = "TERMINATED";
      await prisma.chefProfile.update({
        where: { id: booking.chefProfileId },
        data: { isActive: false, activationStatus: "RESTRICTED", declineWarnings: { increment: 1 } },
      });
      await createNotification({
        userId: chefProfile.userId,
        type: "BG_CHECK_UPDATE",
        title: "Account Deactivated",
        body: "Your account has been deactivated due to excessive booking declines (20+). Please contact support.",
      }).catch(console.error);
    } else if (newCount >= 15) {
      warningLevel = "FINAL_WARNING";
      await prisma.chefProfile.update({
        where: { id: booking.chefProfileId },
        data: { activationStatus: "RESTRICTED", declineWarnings: { increment: 1 } },
      });
      await createNotification({
        userId: chefProfile.userId,
        type: "BG_CHECK_UPDATE",
        title: "⚠️ Final Warning — Excessive Declines",
        body: `You have declined ${newCount} bookings. Your account is now restricted. 5 more declines will result in termination.`,
      }).catch(console.error);
    } else if (newCount >= 10) {
      warningLevel = "WARNING";
      await prisma.chefProfile.update({
        where: { id: booking.chefProfileId },
        data: { declineWarnings: { increment: 1 } },
      });
      await createNotification({
        userId: chefProfile.userId,
        type: "BG_CHECK_UPDATE",
        title: "⚠️ Warning — High Decline Rate",
        body: `You have declined ${newCount} bookings. Continued declines may result in account restrictions.`,
      }).catch(console.error);
    } else if (newCount >= 5) {
      warningLevel = "NOTICE";
      await createNotification({
        userId: chefProfile.userId,
        type: "BG_CHECK_UPDATE",
        title: "Notice — Booking Decline Count",
        body: `You have declined ${newCount} bookings. Please consider accepting more bookings to maintain your standing.`,
      }).catch(console.error);
    }

    // Notify client their booking was declined
    await createNotification({
      userId: updated.clientId,
      type: "BOOKING_CANCELLED",
      title: "Booking Declined",
      body: `Chef ${updated.chefProfile.user.name} was unable to accept your booking.${declineReason ? ` Reason: ${declineReason}` : ""} Please try another chef.`,
      data: { bookingId: id, link: "/browse" },
    }).catch(console.error);

    return NextResponse.json({ ...updated, warningLevel });
  }

  // ── Chef marks job complete → PENDING_COMPLETION (awaiting client confirmation)
  if (status === "COMPLETED" || status === "PENDING_COMPLETION") {
    if (!isChef && !isAdmin) {
      return NextResponse.json({ error: "Only chefs or admins can mark complete" }, { status: 403 });
    }

    const autoConfirmAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const updated = await prisma.booking.update({
      where: { id },
      data: {
        status: "PENDING_COMPLETION",
        chefCompletedAt: new Date(),
        autoConfirmAt,
      },
      include: {
        client: { select: { name: true, email: true } },
        chefProfile: { include: { user: { select: { name: true } } } },
      },
    });

    await createNotification({
      userId: updated.clientId,
      type: "BOOKING_COMPLETED",
      title: "Confirm Your Experience",
      body: `${updated.chefProfile.user.name} has marked your booking as complete. Please confirm and leave a review!`,
      data: { link: "/client/bookings" },
    }).catch(console.error);

    return NextResponse.json(updated);
  }

  // ── Client confirms completion → COMPLETED (triggers payment release)
  if (status === "CONFIRM_COMPLETE") {
    if (!isClient && !isAdmin) {
      return NextResponse.json({ error: "Only the client or admin can confirm completion" }, { status: 403 });
    }
    if (booking.status !== "PENDING_COMPLETION") {
      return NextResponse.json({ error: "Booking is not pending completion" }, { status: 400 });
    }

    return await finalizeCompletion(id, booking);
  }

  if (status === "CANCELLED") {
    if (!isClient && !isAdmin) {
      return NextResponse.json({ error: "Only clients or admins can cancel" }, { status: 403 });
    }
  }

  if (status === "CONFIRMED") {
    if (!isChef && !isAdmin) {
      return NextResponse.json({ error: "Only chefs or admins can confirm" }, { status: 403 });
    }
    // Enforcement: verify chef insurance is still valid before confirming
    const chefForCheck = await prisma.chefProfile.findUnique({ where: { id: booking.chefProfileId } });
    if (chefForCheck?.insuranceStatus !== "verified") {
      return NextResponse.json({ error: "Cannot confirm: chef insurance not verified" }, { status: 403 });
    }
    if (chefForCheck?.activationStatus === "RESTRICTED") {
      return NextResponse.json({ error: "Cannot confirm: chef is under compliance review" }, { status: 403 });
    }
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { status },
    include: {
      client: { select: { name: true, email: true } },
      chefProfile: { include: { user: { select: { name: true } } } },
    },
  });

  // Send email notifications
  if (status === "CONFIRMED") {
    sendBookingConfirmedToClient({
      clientEmail: updated.client.email,
      clientName: updated.client.name,
      chefName: updated.chefProfile.user.name,
      date: updated.date.toLocaleDateString(),
      time: updated.time,
      address: updated.address,
      total: updated.total,
    }).catch(console.error);
    notifyBookingConfirmed(updated.clientId, updated.chefProfile.user.name, id).catch(console.error);
  }

  if (status === "CANCELLED") {
    const cancellerName = isClient ? updated.client.name : "Admin";
    notifyBookingCancelled(booking.chefProfile.userId, cancellerName, id).catch(console.error);
    if (!isClient) {
      notifyBookingCancelled(updated.clientId, cancellerName, id).catch(console.error);
    }
  }

  return NextResponse.json(updated);
}

// ── Shared completion logic: payment release, email, tier promotion ──
async function finalizeCompletion(bookingId: string, booking: { chefProfileId: string; clientId: string; stripePaymentIntentId: string | null; paymentStatus: string }) {
  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "COMPLETED", clientConfirmedAt: new Date() },
    include: {
      client: { select: { name: true, email: true } },
      chefProfile: { include: { user: { select: { name: true } } } },
    },
  });

  sendBookingCompletedToClient({
    clientEmail: updated.client.email,
    clientName: updated.client.name,
    chefName: updated.chefProfile.user.name,
  }).catch(console.error);

  // ESCROW RELEASE: Capture the held payment now that job is confirmed complete
  if (isStripeEnabled() && booking.stripePaymentIntentId && booking.paymentStatus === "CAPTURED") {
    try {
      await capturePayment(booking.stripePaymentIntentId);
      await prisma.booking.update({
        where: { id: bookingId },
        data: { paymentStatus: "RELEASED", payoutStatus: "RELEASED", payoutReleasedAt: new Date() },
      });
    } catch (err) {
      console.error("Failed to capture escrow payment:", err);
    }
  }

  // Auto-promote tier based on completed jobs + rating
  const chefProfile = await prisma.chefProfile.findUnique({
    where: { id: booking.chefProfileId },
    include: { reviews: { select: { rating: true } } },
  });
  if (chefProfile && !chefProfile.tierOverride) {
    const newCompletedJobs = chefProfile.completedJobs + 1;
    const ratings = chefProfile.reviews.map((r) => r.rating);
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    const newTier = calculateTier(newCompletedJobs, avgRating);
    const openIncidents = await prisma.incidentReport.count({
      where: { reportedUserId: chefProfile.userId, status: { in: ["OPEN", "INVESTIGATING"] } },
    });
    const trustScore = calculateTrustScore({
      avgRating,
      completedJobs: newCompletedJobs,
      bgCheckPassed: chefProfile.bgCheckStatus === "CLEAR",
      insuranceVerified: chefProfile.insuranceVerified,
      openIncidents,
      tier: newTier,
    });
    await prisma.chefProfile.update({
      where: { id: booking.chefProfileId },
      data: { completedJobs: newCompletedJobs, tier: newTier, trustScore },
    });
  }

  // Notify chef that client confirmed
  await createNotification({
    userId: updated.chefProfile.userId,
    type: "BOOKING_COMPLETED",
    title: "Booking Confirmed Complete",
    body: `${updated.client.name} confirmed your booking is complete. Payment has been released.`,
    data: { link: "/chef/dashboard" },
  }).catch(console.error);

  return NextResponse.json(updated);
}
