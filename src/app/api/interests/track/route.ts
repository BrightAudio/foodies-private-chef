import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";

// Signal weights — how strongly each action indicates interest
// Mirrors Facebook's engagement scoring: passive signals < active < transactional
const SIGNAL_WEIGHTS: Record<string, number> = {
  VIEW_CHEF: 1,
  VIEW_SPECIAL: 1.5,
  CLICK_SPECIAL: 2,
  SEARCH: 2,
  FAVORITE: 3,
  BOOK: 5,
  DWELL: 0.5,          // base — dynamically adjusted by duration
  SCROLL_DEPTH: 0.3,   // per 25% milestone
  RETURN_VISIT: 4,     // came back to same chef = very strong signal
};

// POST /api/interests/track — record a user interest signal (fire-and-forget from client)
// Captures device, location (Vercel headers), referrer, UTM — like Meta Pixel
export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return NextResponse.json({ ok: true }); // Silently ignore anonymous users
  }

  const body = await req.json();
  const {
    signalType, cuisineType, dishKeyword, chefProfileId,
    sessionId, deviceType, referrer, pageUrl,
    utmSource, utmMedium, utmCampaign,
    dwellSeconds, scrollPercent,
  } = body;

  if (!signalType || !SIGNAL_WEIGHTS[signalType]) {
    return NextResponse.json({ ok: true }); // Ignore invalid signals silently
  }

  // Dynamic weight calculation
  let weight = SIGNAL_WEIGHTS[signalType];
  if (signalType === "DWELL" && dwellSeconds) {
    // Longer dwell = stronger signal. 0.5 base + 0.1 per 10s, cap at 3.0
    weight = Math.min(0.5 + (dwellSeconds / 100), 3.0);
  }
  if (signalType === "SCROLL_DEPTH" && scrollPercent) {
    // Deeper scroll = stronger signal: 25%→0.3, 50%→0.6, 75%→0.9, 100%→1.2
    weight = 0.3 * (scrollPercent / 25);
  }

  // Geo from Vercel edge — free IP geolocation, no third-party API needed
  const ipCity = req.headers.get("x-vercel-ip-city") || null;
  const ipRegion = req.headers.get("x-vercel-ip-country-region") || null;
  const ipCountry = req.headers.get("x-vercel-ip-country") || null;

  await prisma.userInterest.create({
    data: {
      userId: token.userId,
      signalType,
      signalWeight: weight,
      cuisineType: cuisineType?.trim() || null,
      dishKeyword: dishKeyword?.trim()?.toLowerCase() || null,
      chefProfileId: chefProfileId || null,
      // Device & context metadata
      ipCity: ipCity ? decodeURIComponent(ipCity) : null,
      ipRegion,
      ipCountry,
      deviceType: deviceType || null,
      referrer: referrer?.substring(0, 500) || null,
      utmSource: utmSource || null,
      utmMedium: utmMedium || null,
      utmCampaign: utmCampaign || null,
      pageUrl: pageUrl?.substring(0, 200) || null,
      sessionId: sessionId || null,
      dwellSeconds: dwellSeconds ? Math.round(dwellSeconds) : null,
      scrollPercent: scrollPercent ? Math.round(scrollPercent) : null,
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
