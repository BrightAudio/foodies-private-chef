import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { withErrorHandler } from "@/lib/api-error-handler";

// GET /api/admin/bookings — list all bookings (admin only)
async function _GET(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const bookings = await prisma.booking.findMany({
    include: {
      client: { select: { name: true, email: true, phone: true } },
      chefProfile: {
        select: {
          specialtyDish: true,
          hourlyRate: true,
          user: { select: { name: true, email: true, phone: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(bookings);
}


export const GET = withErrorHandler(_GET);