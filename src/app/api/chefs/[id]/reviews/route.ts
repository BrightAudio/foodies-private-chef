import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";

// POST /api/chefs/[id]/reviews — leave a review
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: chefProfileId } = await params;
  const { bookingId, rating, comment } = await req.json();

  if (!bookingId || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "bookingId and rating (1-5) are required" }, { status: 400 });
  }

  // Verify booking belongs to this client and chef, and is completed
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.clientId !== user.userId || booking.chefProfileId !== chefProfileId) {
    return NextResponse.json({ error: "Invalid booking" }, { status: 400 });
  }
  if (booking.status !== "COMPLETED") {
    return NextResponse.json({ error: "Can only review completed bookings" }, { status: 400 });
  }

  // Check for existing review
  const existing = await prisma.review.findUnique({ where: { bookingId } });
  if (existing) {
    return NextResponse.json({ error: "Already reviewed" }, { status: 409 });
  }

  const review = await prisma.review.create({
    data: {
      bookingId,
      clientId: user.userId,
      chefProfileId,
      rating: Math.round(rating),
      comment: comment || null,
    },
  });

  return NextResponse.json(review, { status: 201 });
}
