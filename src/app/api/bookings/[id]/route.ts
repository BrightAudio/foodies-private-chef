import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { sendBookingConfirmedToClient, sendBookingCompletedToClient } from "@/lib/email";
import { calculateTier } from "@/lib/tiers";
import { notifyBookingConfirmed, notifyBookingCancelled } from "@/lib/notifications";

// PATCH /api/bookings/[id] — update booking status
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { status, jobStatus } = await req.json();

  // Handle job status updates (Start Job, On the Way, Arrived)
  if (jobStatus) {
    const validJobStatuses = ["EN_ROUTE", "ARRIVED", "IN_PROGRESS", "COMPLETED"];
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
    // Reveal address when chef starts the job
    if (jobStatus === "EN_ROUTE" && !booking.addressRevealedAt) {
      updateData.addressRevealedAt = new Date();
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        client: { select: { name: true, email: true } },
        chefProfile: { include: { user: { select: { name: true } } } },
      },
    });

    return NextResponse.json(updated);
  }

  // Handle booking status updates (Confirm, Complete, Cancel)
  if (!status) {
    return NextResponse.json({ error: "status or jobStatus required" }, { status: 400 });
  }

  const validStatuses = ["CONFIRMED", "COMPLETED", "CANCELLED"];
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

  // Chef can confirm/complete, client can cancel, admin can do anything
  const isChef = booking.chefProfile.userId === user.userId;
  const isClient = booking.clientId === user.userId;
  const isAdmin = user.role === "ADMIN";

  if (!isChef && !isClient && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (status === "CANCELLED" && !isClient && !isAdmin) {
    return NextResponse.json({ error: "Only clients or admins can cancel" }, { status: 403 });
  }

  if ((status === "CONFIRMED" || status === "COMPLETED") && !isChef && !isAdmin) {
    return NextResponse.json({ error: "Only chefs or admins can confirm/complete" }, { status: 403 });
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
    // In-app notification
    notifyBookingConfirmed(updated.clientId, updated.chefProfile.user.name, id).catch(console.error);
  }

  if (status === "CANCELLED") {
    const cancellerName = isClient ? updated.client.name : "Admin";
    notifyBookingCancelled(booking.chefProfile.userId, cancellerName, id).catch(console.error);
    if (!isClient) {
      notifyBookingCancelled(updated.clientId, cancellerName, id).catch(console.error);
    }
  }

  if (status === "COMPLETED") {
    sendBookingCompletedToClient({
      clientEmail: updated.client.email,
      clientName: updated.client.name,
      chefName: updated.chefProfile.user.name,
    }).catch(console.error);

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
      await prisma.chefProfile.update({
        where: { id: booking.chefProfileId },
        data: { completedJobs: newCompletedJobs, tier: newTier },
      });
    }
  }

  return NextResponse.json(updated);
}
