import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";

// GET /api/favorites — get user's favorite chefs
export async function GET(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const favorites = await prisma.favoriteChef.findMany({
    where: { userId: user.userId },
    include: {
      chefProfile: {
        include: {
          user: { select: { name: true } },
          specials: { select: { id: true, name: true } },
          reviews: { select: { rating: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = favorites.map((f) => {
    const ratings = f.chefProfile.reviews.map((r) => r.rating);
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    return {
      favoriteId: f.id,
      chefProfileId: f.chefProfileId,
      name: f.chefProfile.user.name,
      specialtyDish: f.chefProfile.specialtyDish,
      cuisineType: f.chefProfile.cuisineType,
      hourlyRate: f.chefProfile.hourlyRate,
      profileImageUrl: f.chefProfile.profileImageUrl,
      tier: f.chefProfile.tier,
      avgRating: Math.round(avgRating * 10) / 10,
      reviewCount: ratings.length,
      specials: f.chefProfile.specials,
      addedAt: f.createdAt,
    };
  });

  return NextResponse.json(result);
}

// POST /api/favorites — add a favorite chef
export async function POST(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chefProfileId } = await req.json();
  if (!chefProfileId) {
    return NextResponse.json({ error: "chefProfileId required" }, { status: 400 });
  }

  // Check chef exists
  const chef = await prisma.chefProfile.findUnique({ where: { id: chefProfileId } });
  if (!chef) {
    return NextResponse.json({ error: "Chef not found" }, { status: 404 });
  }

  // Check not already favorited
  const existing = await prisma.favoriteChef.findUnique({
    where: { userId_chefProfileId: { userId: user.userId, chefProfileId } },
  });
  if (existing) {
    return NextResponse.json({ error: "Already in favorites" }, { status: 409 });
  }

  const favorite = await prisma.favoriteChef.create({
    data: { userId: user.userId, chefProfileId },
  });

  return NextResponse.json(favorite, { status: 201 });
}

// DELETE /api/favorites — remove a favorite chef
export async function DELETE(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chefProfileId } = await req.json();
  if (!chefProfileId) {
    return NextResponse.json({ error: "chefProfileId required" }, { status: 400 });
  }

  await prisma.favoriteChef.deleteMany({
    where: { userId: user.userId, chefProfileId },
  });

  return NextResponse.json({ success: true });
}
