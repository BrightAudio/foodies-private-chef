import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { withErrorHandler } from "@/lib/api-error-handler";

// GET /api/chefs/earnings — get earnings report for the authenticated chef
async function _GET(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user || user.role !== "CHEF") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chef = await prisma.chefProfile.findUnique({
    where: { userId: user.userId },
    select: { id: true, userId: true },
  });
  if (!chef) {
    return NextResponse.json({ error: "Chef profile not found" }, { status: 404 });
  }

  const bookings = await prisma.booking.findMany({
    where: {
      chefProfileId: chef.id,
      status: { in: ["COMPLETED", "PENDING_COMPLETION"] },
    },
    select: {
      id: true,
      subtotal: true,
      platformFee: true,
      total: true,
      status: true,
      paymentStatus: true,
      payoutStatus: true,
      payoutReleasedAt: true,
      createdAt: true,
      chefCompletedAt: true,
      date: true,
      client: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });

  const now = new Date();
  const currentYear = now.getFullYear();

  // Group by year
  const byYear: Record<number, typeof bookings> = {};
  for (const b of bookings) {
    const year = new Date(b.chefCompletedAt || b.date || b.createdAt).getFullYear();
    (byYear[year] ??= []).push(b);
  }

  // Build yearly summaries
  const years = Object.keys(byYear)
    .map(Number)
    .sort((a, b) => b - a);

  const yearlyReports = years.map((year) => {
    const yBookings = byYear[year];
    const grossRevenue = yBookings.reduce((s, b) => s + b.total, 0);
    const platformFees = yBookings.reduce((s, b) => s + b.platformFee, 0);
    const chefEarnings = yBookings.reduce((s, b) => s + (b.subtotal - b.platformFee), 0);
    const totalJobs = yBookings.length;

    // Quarterly breakdown
    const quarters = [1, 2, 3, 4].map((q) => {
      const qBookings = yBookings.filter((b) => {
        const month = new Date(b.chefCompletedAt || b.date || b.createdAt).getMonth();
        return Math.floor(month / 3) + 1 === q;
      });
      return {
        quarter: q,
        jobs: qBookings.length,
        grossRevenue: qBookings.reduce((s, b) => s + b.total, 0),
        platformFees: qBookings.reduce((s, b) => s + b.platformFee, 0),
        chefEarnings: qBookings.reduce((s, b) => s + (b.subtotal - b.platformFee), 0),
      };
    });

    return {
      year,
      totalJobs,
      grossRevenue: Math.round(grossRevenue * 100) / 100,
      platformFees: Math.round(platformFees * 100) / 100,
      chefEarnings: Math.round(chefEarnings * 100) / 100,
      needs1099: chefEarnings >= 600,
      quarters,
    };
  });

  // Individual transactions for the current year
  const currentYearTransactions = (byYear[currentYear] || []).map((b) => ({
    id: b.id,
    date: b.chefCompletedAt || b.date || b.createdAt,
    clientName: b.client.name,
    grossAmount: b.total,
    platformFee: b.platformFee,
    netEarnings: Math.round((b.subtotal - b.platformFee) * 100) / 100,
    paymentStatus: b.paymentStatus,
    payoutStatus: b.payoutStatus,
    payoutReleasedAt: b.payoutReleasedAt,
  }));

  return NextResponse.json({
    yearlyReports,
    currentYearTransactions,
    currentYear,
  });
}


export const GET = withErrorHandler(_GET);