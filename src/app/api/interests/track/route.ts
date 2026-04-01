import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";

// Signal weights — how strongly each action indicates interest
const SIGNAL_WEIGHTS: Record<string, number> = {
  VIEW_CHEF: 1,
  VIEW_SPECIAL: 1.5,
  CLICK_SPECIAL: 2,
  SEARCH: 2,
  FAVORITE: 3,
  BOOK: 5,
  DWELL: 0.5, // per 10 seconds of time on page
};

// POST /api/interests/track — record a user interest signal (fire-and-forget from client)
export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return NextResponse.json({ ok: true }); // Silently ignore anonymous users
  }

  const body = await req.json();
  const { signalType, cuisineType, dishKeyword, chefProfileId } = body;

  if (!signalType || !SIGNAL_WEIGHTS[signalType]) {
    return NextResponse.json({ ok: true }); // Ignore invalid signals silently
  }

  const weight = SIGNAL_WEIGHTS[signalType] || 1;

  await prisma.userInterest.create({
    data: {
      userId: token.userId,
      signalType,
      signalWeight: weight,
      cuisineType: cuisineType?.trim() || null,
      dishKeyword: dishKeyword?.trim()?.toLowerCase() || null,
      chefProfileId: chefProfileId || null,
    },
  });

  return NextResponse.json({ ok: true });
}

// GET /api/interests/profile — get user's interest profile (top cuisines + keywords)
export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return NextResponse.json({ cuisines: [], keywords: [] });
  }

  // Get weighted interest signals from last 90 days
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const interests = await prisma.userInterest.findMany({
    where: { userId: token.userId, createdAt: { gte: since } },
    select: { cuisineType: true, dishKeyword: true, signalWeight: true },
  });

  // Aggregate by cuisine
  const cuisineMap = new Map<string, number>();
  const keywordMap = new Map<string, number>();

  for (const i of interests) {
    if (i.cuisineType) {
      cuisineMap.set(i.cuisineType, (cuisineMap.get(i.cuisineType) || 0) + i.signalWeight);
    }
    if (i.dishKeyword) {
      keywordMap.set(i.dishKeyword, (keywordMap.get(i.dishKeyword) || 0) + i.signalWeight);
    }
  }

  // Sort by weight descending
  const cuisines = [...cuisineMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, weight]) => ({ name, weight }));

  const keywords = [...keywordMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name, weight]) => ({ name, weight }));

  return NextResponse.json({ cuisines, keywords });
}
