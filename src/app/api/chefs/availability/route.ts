import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { withErrorHandler } from "@/lib/api-error-handler";

// GET /api/chefs/availability?chefProfileId=xxx&month=2026-04
async function _GET(req: NextRequest) {
  const chefProfileId = req.nextUrl.searchParams.get("chefProfileId");
  const month = req.nextUrl.searchParams.get("month"); // YYYY-MM

  if (!chefProfileId) {
    return NextResponse.json({ error: "chefProfileId required" }, { status: 400 });
  }

  // Default to current month + next month
  let startDate: Date;
  let endDate: Date;
  if (month) {
    const [y, m] = month.split("-").map(Number);
    startDate = new Date(y, m - 1, 1);
    endDate = new Date(y, m, 0, 23, 59, 59);
  } else {
    startDate = new Date();
    startDate.setDate(1);
    endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 2);
    endDate.setDate(0);
  }

  const availability = await prisma.chefAvailability.findMany({
    where: {
      chefProfileId,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: "asc" },
  });

  // Also get booked dates
  const bookings = await prisma.booking.findMany({
    where: {
      chefProfileId,
      date: { gte: startDate, lte: endDate },
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    select: { date: true, time: true },
  });

  return NextResponse.json({
    blocked: availability.filter((a) => a.isBlocked).map((a) => ({
      id: a.id,
      date: a.date.toISOString().split("T")[0],
      note: a.note,
    })),
    booked: bookings.map((b) => ({
      date: b.date.toISOString().split("T")[0],
      time: b.time,
    })),
  });
}

// POST /api/chefs/availability — set availability (chef only)
async function _POST(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.chefProfile.findUnique({ where: { userId: user.userId } });
  if (!profile) {
    return NextResponse.json({ error: "No chef profile" }, { status: 403 });
  }

  const { dates, isBlocked, note } = await req.json();

  if (!dates || !Array.isArray(dates) || dates.length === 0) {
    return NextResponse.json({ error: "dates array required" }, { status: 400 });
  }

  if (dates.length > 90) {
    return NextResponse.json({ error: "Max 90 dates at a time" }, { status: 400 });
  }

  // Upsert each date
  const results = [];
  for (const dateStr of dates) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) continue;

    // Check if exists
    const existing = await prisma.chefAvailability.findFirst({
      where: {
        chefProfileId: profile.id,
        date: {
          gte: new Date(date.toISOString().split("T")[0]),
          lt: new Date(new Date(date.toISOString().split("T")[0]).getTime() + 86400000),
        },
      },
    });

    if (existing) {
      const updated = await prisma.chefAvailability.update({
        where: { id: existing.id },
        data: { isBlocked: isBlocked !== false, note: note || null },
      });
      results.push(updated);
    } else {
      const created = await prisma.chefAvailability.create({
        data: {
          chefProfileId: profile.id,
          date,
          isBlocked: isBlocked !== false,
          note: note || null,
        },
      });
      results.push(created);
    }
  }

  return NextResponse.json(results, { status: 201 });
}

// DELETE /api/chefs/availability — remove blocked date
async function _DELETE(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.chefProfile.findUnique({ where: { userId: user.userId } });
  if (!profile) {
    return NextResponse.json({ error: "No chef profile" }, { status: 403 });
  }

  const { availabilityId } = await req.json();
  if (!availabilityId) {
    return NextResponse.json({ error: "availabilityId required" }, { status: 400 });
  }

  const entry = await prisma.chefAvailability.findUnique({ where: { id: availabilityId } });
  if (!entry || entry.chefProfileId !== profile.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.chefAvailability.delete({ where: { id: availabilityId } });
  return NextResponse.json({ success: true });
}


export const GET = withErrorHandler(_GET);
export const POST = withErrorHandler(_POST);
export const DELETE = withErrorHandler(_DELETE);