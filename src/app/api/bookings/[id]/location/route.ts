import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { withErrorHandler } from "@/lib/api-error-handler";

// POST /api/bookings/[id]/location — Silent location check-in (chef only)
async function _POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { latitude, longitude, accuracy, checkinType } = await req.json();

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const validTypes = ["ARRIVAL", "PERIODIC", "DEPARTURE"];
  if (!validTypes.includes(checkinType)) {
    return NextResponse.json({ error: "Invalid checkin type" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { chefProfile: true },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (booking.chefProfile.userId !== user.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Only record during active job statuses
  if (!["EN_ROUTE", "ARRIVED", "IN_PROGRESS", "COMPLETED"].includes(booking.jobStatus)) {
    return NextResponse.json({ ok: true }); // silently ignore
  }

  await prisma.locationCheckin.create({
    data: {
      bookingId: id,
      userId: user.userId,
      latitude,
      longitude,
      accuracy: accuracy ?? null,
      checkinType,
    },
  });

  return NextResponse.json({ ok: true });
}

// GET /api/bookings/[id]/location — Admin: view location evidence for disputes
async function _GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getTokenFromRequest(req);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;

  const checkins = await prisma.locationCheckin.findMany({
    where: { bookingId: id },
    orderBy: { createdAt: "asc" },
  });

  if (checkins.length === 0) {
    return NextResponse.json({ checkins: [], summary: null });
  }

  const first = checkins[0];
  const last = checkins[checkins.length - 1];
  const durationMinutes = Math.round((last.createdAt.getTime() - first.createdAt.getTime()) / 60000);

  return NextResponse.json({
    checkins,
    summary: {
      totalCheckins: checkins.length,
      firstCheckin: first.createdAt,
      lastCheckin: last.createdAt,
      durationMinutes,
      arrivalRecorded: checkins.some((c) => c.checkinType === "ARRIVAL"),
      departureRecorded: checkins.some((c) => c.checkinType === "DEPARTURE"),
    },
  });
}


export const POST = withErrorHandler(_POST);
export const GET = withErrorHandler(_GET);