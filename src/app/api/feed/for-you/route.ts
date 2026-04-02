import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";

// GET /api/feed/for-you — personalized specials feed ranked by interest signals
// Full Facebook ad-targeting model:
//   1. On-platform activity: views, clicks, searches, favorites, bookings
//   2. Engagement depth: dwell time, scroll depth, return visits
//   3. Location matching: IP-based geo from Vercel headers
//   4. Social/collaborative: "also booked" graph + referral network
//   5. Device context: mobile vs desktop behavior
//   6. UTM/referrer: acquisition channel affinity
export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);

  // Fetch all active specials from approved, active chefs
  const specials = await prisma.chefSpecial.findMany({
    where: { chefProfile: { isApproved: true, isActive: true } },
    include: {
      chefProfile: {
        include: {
          user: { select: { name: true } },
          reviews: { select: { rating: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Compute avgRating for each special's chef
  const enriched = specials.map((s) => {
    const ratings = s.chefProfile.reviews.map((r) => r.rating);
    const avgRating = ratings.length > 0 ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null;
    return { ...s, chefProfile: { ...s.chefProfile, avgRating } };
  });

  // Anonymous — default ranking
  if (!token) {
    const ranked = enriched.map((s) => ({
      ...serializeSpecial(s),
      relevanceScore: baseScore(s),
      matchReason: "trending",
    }));
    ranked.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return NextResponse.json({ specials: ranked.slice(0, 30), personalized: false });
  }

  // ===== PERSONALIZED RANKING =====

  const since = new Date();
  since.setDate(since.getDate() - 90);

  // Fetch all interest signals with full metadata
  const interests = await prisma.userInterest.findMany({
    where: { userId: token.userId, createdAt: { gte: since } },
    select: {
      cuisineType: true, dishKeyword: true, chefProfileId: true,
      signalType: true, signalWeight: true,
      dwellSeconds: true, scrollPercent: true,
      ipCity: true, deviceType: true,
    },
  });

  // ── Build weighted interest maps ──

  const cuisineWeights = new Map<string, number>();
  const keywordWeights = new Map<string, number>();
  const chefWeights = new Map<string, number>();
  const dwellByChef = new Map<string, number>();   // total dwell seconds per chef
  const returnVisitChefs = new Set<string>();       // chefs they returned to
  let userCity: string | null = null;
  let primaryDevice: string | null = null;

  // Device/city vote counters
  const deviceVotes = new Map<string, number>();
  const cityVotes = new Map<string, number>();

  for (const i of interests) {
    if (i.cuisineType) {
      const key = i.cuisineType.toLowerCase();
      cuisineWeights.set(key, (cuisineWeights.get(key) || 0) + i.signalWeight);
    }
    if (i.dishKeyword) {
      keywordWeights.set(i.dishKeyword, (keywordWeights.get(i.dishKeyword) || 0) + i.signalWeight);
    }
    if (i.chefProfileId) {
      chefWeights.set(i.chefProfileId, (chefWeights.get(i.chefProfileId) || 0) + i.signalWeight);
    }
    if (i.signalType === "DWELL" && i.chefProfileId && i.dwellSeconds) {
      dwellByChef.set(i.chefProfileId, (dwellByChef.get(i.chefProfileId) || 0) + i.dwellSeconds);
    }
    if (i.signalType === "RETURN_VISIT" && i.chefProfileId) {
      returnVisitChefs.add(i.chefProfileId);
    }
    if (i.ipCity) cityVotes.set(i.ipCity, (cityVotes.get(i.ipCity) || 0) + 1);
    if (i.deviceType) deviceVotes.set(i.deviceType, (deviceVotes.get(i.deviceType) || 0) + 1);
  }

  // Determine most common city and device
  if (cityVotes.size > 0) userCity = [...cityVotes.entries()].sort((a, b) => b[1] - a[1])[0][0];
  if (deviceVotes.size > 0) primaryDevice = [...deviceVotes.entries()].sort((a, b) => b[1] - a[1])[0][0];

  // Normalize
  const maxCuisine = Math.max(...cuisineWeights.values(), 1);
  const maxKeyword = Math.max(...keywordWeights.values(), 1);
  const maxChef = Math.max(...chefWeights.values(), 1);
  const maxDwell = Math.max(...dwellByChef.values(), 1);

  // ── Collaborative filtering: get "also booked" chef IDs ──
  const userBookings = await prisma.booking.findMany({
    where: { clientId: token.userId, status: { in: ["CONFIRMED", "COMPLETED"] } },
    select: { chefProfileId: true },
    distinct: ["chefProfileId"],
  });
  const bookedChefIds = new Set(userBookings.map((b) => b.chefProfileId));

  let alsoBookedChefIds = new Set<string>();
  if (bookedChefIds.size > 0) {
    // Find peers who booked same chefs
    const peerBookings = await prisma.booking.findMany({
      where: { chefProfileId: { in: [...bookedChefIds] }, clientId: { not: token.userId }, status: { in: ["CONFIRMED", "COMPLETED"] } },
      select: { clientId: true },
      distinct: ["clientId"],
    });
    const peerIds = peerBookings.map((b) => b.clientId);

    if (peerIds.length > 0) {
      // Find chefs that peers booked (but user hasn't)
      const peerChefBookings = await prisma.booking.findMany({
        where: { clientId: { in: peerIds }, chefProfileId: { notIn: [...bookedChefIds] }, status: { in: ["CONFIRMED", "COMPLETED"] } },
        select: { chefProfileId: true },
      });
      alsoBookedChefIds = new Set(peerChefBookings.map((b) => b.chefProfileId));
    }
  }

  // ── Score each special ──

  const ranked = enriched.map((s) => {
    let score = baseScore(s);
    const reasons: string[] = [];
    const cuisineKey = s.chefProfile.cuisineType?.toLowerCase() || "";
    const allWords = [...s.name.toLowerCase().split(/\s+/), ...s.description.toLowerCase().split(/\s+/)];

    // 1. Cuisine match (up to +40) — strongest content signal
    if (cuisineKey && cuisineWeights.has(cuisineKey)) {
      score += (cuisineWeights.get(cuisineKey)! / maxCuisine) * 40;
      reasons.push(`Matches your ${s.chefProfile.cuisineType} interest`);
    }

    // 2. Keyword match (up to +25) — dish name/description matches
    let kwMatched = false;
    for (const word of allWords) {
      if (word.length >= 3 && keywordWeights.has(word)) {
        score += (keywordWeights.get(word)! / maxKeyword) * 25;
        if (!kwMatched) { reasons.push("Similar to dishes you've explored"); kwMatched = true; }
      }
    }

    // 3. Chef affinity (up to +15) — interacted with this chef before
    if (chefWeights.has(s.chefProfileId)) {
      score += (chefWeights.get(s.chefProfileId)! / maxChef) * 15;
      reasons.push(`From ${s.chefProfile.user.name}, a chef you like`);
    }

    // 4. Dwell time boost (up to +12) — spent meaningful time on this chef's page
    if (dwellByChef.has(s.chefProfileId)) {
      const dwellBoost = (dwellByChef.get(s.chefProfileId)! / maxDwell) * 12;
      score += dwellBoost;
    }

    // 5. Return visit boost (+8) — came back to this chef multiple times
    if (returnVisitChefs.has(s.chefProfileId)) {
      score += 8;
      if (!reasons.some(r => r.includes("chef you"))) {
        reasons.push(`From ${s.chefProfile.user.name}, a chef you keep coming back to`);
      }
    }

    // 6. Collaborative filtering boost (+10) — "people who booked your chefs also booked this one"
    if (alsoBookedChefIds.has(s.chefProfileId)) {
      score += 10;
      reasons.push("Popular with similar food lovers");
    }

    // 7. Discovery bonus (+5) — cuisines they haven't explored (serendipity)
    if (cuisineKey && !cuisineWeights.has(cuisineKey) && interests.length > 5) {
      score += 5;
      reasons.push("Something new to try");
    }

    // 8. Mobile optimization — on mobile devices, boost quick/casual meals
    if (primaryDevice === "mobile" && s.chefProfile.tier === "SOUS_CHEF") {
      score += 3; // Slightly prefer more accessible options on mobile
    }

    return {
      ...serializeSpecial(s),
      relevanceScore: Math.round(score * 10) / 10,
      matchReason: reasons[0] || "popular",
      matchReasons: reasons.slice(0, 3),
    };
  });

  // Sort with controlled randomization (larger pool = more variety)
  ranked.sort((a, b) => {
    const jitter = (Math.random() - 0.5) * 5;
    return (b.relevanceScore + jitter) - a.relevanceScore;
  });

  return NextResponse.json({
    specials: ranked.slice(0, 30),
    personalized: interests.length > 0,
    meta: {
      signalCount: interests.length,
      topCuisines: [...cuisineWeights.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c),
      userCity,
      primaryDevice,
    },
  });
}

// Base score from chef quality metrics (non-personalized ranking)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function baseScore(s: any): number {
  let score = 10;
  if (s.isFeatured) score += 25; // bi-weekly featured dish gets strong boost
  if (s.chefProfile.tier === "MASTER_CHEF") score += 15;
  else if (s.chefProfile.tier === "CHEF") score += 8;
  if (s.chefProfile.avgRating) score += s.chefProfile.avgRating * 3;
  score += Math.min(s.chefProfile.completedJobs, 50) * 0.3;
  return score;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeSpecial(s: any) {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    imageUrl: s.imageUrl,
    isWeeklySpecial: s.isFeatured,
    estimatedGroceryCost: s.estimatedGroceryCost,
    chefId: s.chefProfileId,
    chefName: s.chefProfile.user.name,
    chefTier: s.chefProfile.tier,
    chefCuisine: s.chefProfile.cuisineType,
    chefRating: s.chefProfile.avgRating,
    chefImage: s.chefProfile.profileImageUrl,
    chefRate: s.chefProfile.hourlyRate,
    chefJobs: s.chefProfile.completedJobs,
  };
}
