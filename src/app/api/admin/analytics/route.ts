import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";

// GET /api/admin/analytics — admin analytics dashboard data
export async function GET(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    totalChefs,
    approvedChefs,
    totalBookings,
    completedBookings,
    cancelledBookings,
    recentBookings,
    allCompletedBookings,
    totalTips,
    recentUsers,
    pendingVerifications,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.chefProfile.count(),
    prisma.chefProfile.count({ where: { isApproved: true } }),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: "COMPLETED" } }),
    prisma.booking.count({ where: { status: "CANCELLED" } }),
    prisma.booking.findMany({
      where: { createdAt: { gte: ninetyDaysAgo } },
      select: { createdAt: true, total: true, status: true, platformFee: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.booking.findMany({
      where: { status: "COMPLETED" },
      select: { total: true, platformFee: true, subtotal: true },
    }),
    prisma.tip.aggregate({ _sum: { amount: true } }),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.chefProfile.count({ where: { verificationStatus: { in: ["INFO_SUBMITTED", "BG_CHECK_RUNNING", "FLAGGED"] } } }),
  ]);

  // Revenue calculations
  const totalRevenue = allCompletedBookings.reduce((sum, b) => sum + b.total, 0);
  const platformRevenue = allCompletedBookings.reduce((sum, b) => sum + b.platformFee, 0);
  const chefPayouts = allCompletedBookings.reduce((sum, b) => sum + b.subtotal, 0);

  // Monthly breakdown for last 90 days
  const monthlyData: Record<string, { bookings: number; revenue: number; platformFee: number }> = {};
  for (const b of recentBookings) {
    const key = `${b.createdAt.getFullYear()}-${String(b.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyData[key]) monthlyData[key] = { bookings: 0, revenue: 0, platformFee: 0 };
    monthlyData[key].bookings++;
    if (b.status === "COMPLETED") {
      monthlyData[key].revenue += b.total;
      monthlyData[key].platformFee += b.platformFee;
    }
  }

  // ===== ENGAGEMENT / INTEREST SIGNALS =====
  const [totalSignals, recentSignals, signalsByType, topCuisines, topDishes, topCities, deviceBreakdown, activeTrackedUsers] = await Promise.all([
    prisma.userInterest.count(),
    prisma.userInterest.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.userInterest.groupBy({ by: ["signalType"], _count: { id: true }, orderBy: { _count: { id: "desc" } } }),
    prisma.userInterest.groupBy({ by: ["cuisineType"], where: { cuisineType: { not: null } }, _count: { id: true }, orderBy: { _count: { id: "desc" } }, take: 10 }),
    prisma.userInterest.groupBy({ by: ["dishKeyword"], where: { dishKeyword: { not: null } }, _count: { id: true }, orderBy: { _count: { id: "desc" } }, take: 10 }),
    prisma.userInterest.groupBy({ by: ["ipCity"], where: { ipCity: { not: null } }, _count: { id: true }, orderBy: { _count: { id: "desc" } }, take: 10 }),
    prisma.userInterest.groupBy({ by: ["deviceType"], where: { deviceType: { not: null } }, _count: { id: true }, orderBy: { _count: { id: "desc" } } }),
    prisma.userInterest.groupBy({ by: ["userId"], _count: { id: true } }),
  ]);

  // Top chefs by revenue
  const topChefs = await prisma.chefProfile.findMany({
    where: { isApproved: true },
    include: {
      user: { select: { name: true } },
      bookings: { where: { status: "COMPLETED" }, select: { subtotal: true } },
      reviews: { select: { rating: true } },
    },
    take: 10,
  });

  const topChefsData = topChefs
    .map((c) => ({
      name: c.user.name,
      tier: c.tier,
      revenue: c.bookings.reduce((s, b) => s + b.subtotal, 0),
      jobs: c.completedJobs,
      avgRating: c.reviews.length > 0 ? Math.round((c.reviews.reduce((s, r) => s + r.rating, 0) / c.reviews.length) * 10) / 10 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return NextResponse.json({
    overview: {
      totalUsers,
      totalChefs,
      approvedChefs,
      totalBookings,
      completedBookings,
      cancelledBookings,
      completionRate: totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0,
      recentUsers,
      pendingVerifications,
    },
    revenue: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      platformRevenue: Math.round(platformRevenue * 100) / 100,
      chefPayouts: Math.round(chefPayouts * 100) / 100,
      totalTips: totalTips._sum.amount || 0,
    },
    monthlyData: Object.entries(monthlyData).map(([month, data]) => ({ month, ...data })),
    topChefs: topChefsData,
    engagement: {
      totalSignals,
      recentSignals,
      trackedUsers: activeTrackedUsers.length,
      avgSignalsPerUser: activeTrackedUsers.length > 0 ? Math.round(totalSignals / activeTrackedUsers.length) : 0,
      signalsByType: signalsByType.map((s) => ({ type: s.signalType, count: s._count.id })),
      topCuisines: topCuisines.map((c) => ({ name: c.cuisineType!, count: c._count.id })),
      topDishes: topDishes.map((d) => ({ name: d.dishKeyword!, count: d._count.id })),
      topCities: topCities.map((c) => ({ name: c.ipCity!, count: c._count.id })),
      deviceBreakdown: deviceBreakdown.map((d) => ({ type: d.deviceType!, count: d._count.id })),
    },
  });
}
