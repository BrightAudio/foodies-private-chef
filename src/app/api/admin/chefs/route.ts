import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";

// GET /api/admin/chefs — list all chef profiles (admin only)
export async function GET(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const chefs = await prisma.chefProfile.findMany({
    include: {
      user: { select: { name: true, email: true } },
      reviews: { select: { rating: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = chefs.map((chef) => {
    const ratings = chef.reviews.map((r) => r.rating);
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    return { ...chef, avgRating: Math.round(avgRating * 10) / 10, reviewCount: ratings.length };
  });

  return NextResponse.json(result);
}
