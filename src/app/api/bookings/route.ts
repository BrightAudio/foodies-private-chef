import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, calculateFees } from "@/lib/auth";
import { sanitizeText } from "@/lib/sanitize";
import { notifyBookingCreated } from "@/lib/notifications";
import { withErrorHandler } from "@/lib/api-error-handler";

// GET /api/bookings — get user's bookings
async function _GET(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);
  const skip = (page - 1) * limit;

  if (user.role === "CHEF") {
    const profile = await prisma.chefProfile.findUnique({ where: { userId: user.userId } });
    if (!profile) return NextResponse.json({ bookings: [], total: 0, page, limit });
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where: { chefProfileId: profile.id, ...(status ? { status } : {}) },
        include: {
          client: { select: { name: true, email: true, phone: true } },
          items: true,
          review: true,
          tip: true,
        },
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where: { chefProfileId: profile.id, ...(status ? { status } : {}) } }),
    ]);
    return NextResponse.json({ bookings: bookings.map(redactAddress), total, page, limit });
  } else {
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where: { clientId: user.userId, ...(status ? { status } : {}) },
        include: {
          chefProfile: {
            include: { user: { select: { name: true } } },
          },
          items: true,
          review: true,
          tip: true,
        },
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where: { clientId: user.userId, ...(status ? { status } : {}) } }),
    ]);
    return NextResponse.json({ bookings: bookings.map(redactAddress), total, page, limit });
  }
}

// Redact address unless job started or within 1 hour of booking time
function redactAddress(booking: Record<string, unknown>): Record<string, unknown> {
  const b = booking as { address: string; generalArea?: string | null; jobStatus: string; addressRevealedAt?: Date | null; date: Date; time: string };
  // If address has been revealed (chef started job), show it
  if (b.addressRevealedAt || b.jobStatus !== "SCHEDULED") {
    return booking;
  }
  // Reveal if within 1 hour of scheduled time
  const scheduled = new Date(b.date);
  const [hours, minutes] = b.time.split(":").map(Number);
  if (!isNaN(hours)) scheduled.setHours(hours, minutes || 0);
  const oneHourBefore = new Date(scheduled.getTime() - 60 * 60 * 1000);
  if (new Date() >= oneHourBefore) {
    return booking;
  }
  // Redact: replace address with general area
  return { ...booking, address: b.generalArea || "Address hidden until job start" };
}

// POST /api/bookings — create a booking
async function _POST(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chefProfileId, date, time, endTime, guestCount, specialRequests, address, generalArea, items } = await req.json();

  if (!chefProfileId || !date || !time || !guestCount || !address) {
    return NextResponse.json({ error: "Missing required booking fields" }, { status: 400 });
  }

  // Get chef to verify exists and is active
  const chef = await prisma.chefProfile.findUnique({ where: { id: chefProfileId } });
  if (!chef || !chef.isApproved || !chef.isActive) {
    return NextResponse.json({ error: "Chef not available" }, { status: 404 });
  }

  // Enforcement: chef must be fully compliant
  if (chef.activationStatus === "RESTRICTED") {
    return NextResponse.json({ error: "This chef is currently under compliance review" }, { status: 403 });
  }
  if (chef.activationStatus !== "ACTIVE" && chef.activationStatus !== "PENDING_COMPLIANCE") {
    return NextResponse.json({ error: "This chef has not completed onboarding" }, { status: 403 });
  }
  if (chef.insuranceStatus !== "verified") {
    return NextResponse.json({ error: "This chef's insurance is not yet verified. Booking unavailable." }, { status: 403 });
  }

  // Check chef availability — blocked dates
  const bookingDate = new Date(date);
  const dayStart = new Date(bookingDate.toISOString().split("T")[0]);
  const dayEnd = new Date(dayStart.getTime() + 86400000);

  const blocked = await prisma.chefAvailability.findFirst({
    where: {
      chefProfileId,
      date: { gte: dayStart, lt: dayEnd },
      isBlocked: true,
    },
  });
  if (blocked) {
    return NextResponse.json({ error: "Chef is not available on this date" }, { status: 409 });
  }

  // Check for existing booking on same date
  const existingBooking = await prisma.booking.findFirst({
    where: {
      chefProfileId,
      date: { gte: dayStart, lt: dayEnd },
      status: { in: ["PENDING", "CONFIRMED"] },
    },
  });
  if (existingBooking) {
    return NextResponse.json({ error: "Chef already has a booking on this date" }, { status: 409 });
  }

  // Calculate pricing
  let subtotal = chef.hourlyRate; // base rate
  const bookingItems: { name: string; price: number; quantity: number }[] = [];

  if (items && Array.isArray(items)) {
    for (const item of items) {
      subtotal += Number(item.price) * (Number(item.quantity) || 1);
      bookingItems.push({
        name: item.name,
        price: Number(item.price),
        quantity: Number(item.quantity) || 1,
      });
    }
  }

  const fees = calculateFees(subtotal);

  const booking = await prisma.booking.create({
    data: {
      clientId: user.userId,
      chefProfileId,
      date: new Date(date),
      time,
      endTime: endTime || null,
      guestCount: Number(guestCount),
      specialRequests: specialRequests ? sanitizeText(specialRequests) : null,
      address,
      generalArea: generalArea || null,
      subtotal: fees.subtotal,
      platformFee: fees.platformFee,
      clientServiceFee: fees.clientServiceFee,
      total: fees.total,
      items: bookingItems.length > 0
        ? { create: bookingItems }
        : undefined,
    },
    include: { items: true, chefProfile: { include: { user: { select: { name: true } } } } },
  });

  // Notify chef about new booking
  notifyBookingCreated(
    chef.userId,
    booking.chefProfile.user.name,
    booking.id
  ).catch(console.error);

  return NextResponse.json(booking, { status: 201 });
}


export const GET = withErrorHandler(_GET);
export const POST = withErrorHandler(_POST);