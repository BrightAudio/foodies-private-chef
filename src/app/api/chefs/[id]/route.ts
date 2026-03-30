import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTierInfo } from "@/lib/tiers";

// GET /api/chefs/[id] — get chef details
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const chef = await prisma.chefProfile.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      specials: true,
      reviews: {
        include: { client: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!chef) {
    return NextResponse.json({ error: "Chef not found" }, { status: 404 });
  }

  const ratings = chef.reviews.map((r) => r.rating);
  const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  const tierInfo = getTierInfo(chef.tier);

  return NextResponse.json({
    ...chef,
    tierLabel: tierInfo.label,
    tierEmoji: tierInfo.emoji,
    avgRating: Math.round(avgRating * 10) / 10,
    reviewCount: ratings.length,
  });
}
