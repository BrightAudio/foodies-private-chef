import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { decrypt, maskSSN } from "@/lib/crypto";

// GET /api/admin/chefs — list all chef profiles (admin only)
export async function GET(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const chefs = await prisma.chefProfile.findMany({
    include: {
      user: { select: { name: true, email: true } },
      reviews: { select: { rating: true, comment: true, createdAt: true, client: { select: { name: true } } } },
      bookings: {
        where: { status: { in: ["COMPLETED", "PENDING_COMPLETION"] } },
        select: { subtotal: true, platformFee: true, total: true, completedAt: true, createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch incidents for all chefs in one query
  const allIncidents = await prisma.incidentReport.findMany({
    where: { reportedUserId: { in: chefs.map(c => c.userId) } },
    select: { reportedUserId: true, type: true, severity: true, status: true, description: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  const incidentsByUser = new Map<string, typeof allIncidents>();
  for (const inc of allIncidents) {
    const arr = incidentsByUser.get(inc.reportedUserId!) || [];
    arr.push(inc);
    incidentsByUser.set(inc.reportedUserId!, arr);
  }

  const result = chefs.map((chef) => {
    const ratings = chef.reviews.map((r) => r.rating);
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

    // Earnings breakdown for 1099
    const completedBookings = chef.bookings;
    const grossRevenue = completedBookings.reduce((s, b) => s + b.total, 0);
    const platformFees = completedBookings.reduce((s, b) => s + b.platformFee, 0);
    const chefEarnings = completedBookings.reduce((s, b) => s + (b.subtotal - b.platformFee), 0);

    // Year-to-date earnings (current year)
    const currentYear = new Date().getFullYear();
    const ytdBookings = completedBookings.filter(b => {
      const d = b.completedAt || b.createdAt;
      return d && new Date(d).getFullYear() === currentYear;
    });
    const ytdEarnings = ytdBookings.reduce((s, b) => s + (b.subtotal - b.platformFee), 0);
    const ytdPlatformFees = ytdBookings.reduce((s, b) => s + b.platformFee, 0);

    // Incidents (demerits)
    const incidents = incidentsByUser.get(chef.userId) || [];

    // Praise = 5-star reviews with comments
    const praise = chef.reviews
      .filter(r => r.rating >= 4 && r.comment)
      .map(r => ({ rating: r.rating, comment: r.comment, date: r.createdAt, clientName: r.client.name }));

    return {
      ...chef,
      reviews: undefined, // Don't send raw reviews array
      bookings: undefined, // Don't send raw bookings array
      // Decrypt PII for admin display (masked where sensitive)
      bgCheckMiddleName: chef.bgCheckMiddleName ? decrypt(chef.bgCheckMiddleName) : null,
      bgCheckDOB: chef.bgCheckDOB ? decrypt(chef.bgCheckDOB) : null,
      bgCheckSSNLast4: maskSSN(chef.bgCheckSSNLast4),
      bgCheckSSN: chef.bgCheckSSN ? `•••-••-${decrypt(chef.bgCheckSSN).slice(-4)}` : null,
      bgCheckAddress: chef.bgCheckAddress ? decrypt(chef.bgCheckAddress) : null,
      bgCheckPreviousAddress: chef.bgCheckPreviousAddress ? decrypt(chef.bgCheckPreviousAddress) : null,
      driversLicenseNumber: chef.driversLicenseNumber ? `••••${decrypt(chef.driversLicenseNumber).slice(-4)}` : null,
      avgRating: Math.round(avgRating * 10) / 10,
      reviewCount: ratings.length,
      // 1099 Earnings
      earnings: {
        totalJobs: completedBookings.length,
        grossRevenue: Math.round(grossRevenue * 100) / 100,
        platformFees: Math.round(platformFees * 100) / 100,
        chefEarnings: Math.round(chefEarnings * 100) / 100,
        ytdEarnings: Math.round(ytdEarnings * 100) / 100,
        ytdPlatformFees: Math.round(ytdPlatformFees * 100) / 100,
        ytdJobs: ytdBookings.length,
        needs1099: ytdEarnings >= 600,
      },
      // Demerits & Praise
      incidents,
      praise,
    };
  });

  return NextResponse.json(result);
}
