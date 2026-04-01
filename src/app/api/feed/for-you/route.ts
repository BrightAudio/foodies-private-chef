import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";

// GET /api/feed/for-you — personalized specials feed ranked by interest signals
// Acts like Facebook's ad targeting: surfaces dishes matching user's browsing/booking patterns
export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);

  // Fetch all active specials from approved, active chefs
  const specials = await prisma.chefSpecial.findMany({
    where: {
      chefProfile: {
        isApproved: true,
        isActive: true,
      },
    },
    include: {
      chefProfile: {
        select: {
          id: true,
          tier: true,
          cuisineType: true,
          specialtyDish: true,
          avgRating: true,
          completedJobs: true,
          hourlyRate: true,
          profileImageUrl: true,
          user: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // If no logged-in user, return specials with default ranking (weekly first, then recency + rating)
  if (!token) {
    const ranked = specials.map((s) => ({
      ...serializeSpecial(s),
      relevanceScore: baseScore(s),
      matchReason: "trending",
    }));
    ranked.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return NextResponse.json({ specials: ranked.slice(0, 30), personalized: false });
  }

  // Get user's interest profile (last 90 days)
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const interests = await prisma.userInterest.findMany({
    where: { userId: token.userId, createdAt: { gte: since } },
    select: { cuisineType: true, dishKeyword: true, chefProfileId: true, signalWeight: true },
  });

  // Build interest maps
  const cuisineWeights = new Map<string, number>();
  const keywordWeights = new Map<string, number>();
  const chefWeights = new Map<string, number>();

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
  }

  // Normalize weights (0-1 range)
  const maxCuisine = Math.max(...cuisineWeights.values(), 1);
  const maxKeyword = Math.max(...keywordWeights.values(), 1);
  const maxChef = Math.max(...chefWeights.values(), 1);

  // Score each special based on user interests
  const ranked = specials.map((s) => {
    let score = baseScore(s);
    const reasons: string[] = [];
    const cuisineKey = s.chefProfile.cuisineType?.toLowerCase() || "";
    const nameWords = s.name.toLowerCase().split(/\s+/);
    const descWords = s.description.toLowerCase().split(/\s+/);
    const allWords = [...nameWords, ...descWords];

    // Cuisine match (strongest signal — like Facebook matching ad category to browsing)
    if (cuisineKey && cuisineWeights.has(cuisineKey)) {
      const cuisineBoost = (cuisineWeights.get(cuisineKey)! / maxCuisine) * 40;
      score += cuisineBoost;
      reasons.push(`Matches your ${s.chefProfile.cuisineType} interest`);
    }

    // Keyword match (dish name/description words match searched/viewed keywords)
    for (const word of allWords) {
      if (word.length >= 3 && keywordWeights.has(word)) {
        const keywordBoost = (keywordWeights.get(word)! / maxKeyword) * 25;
        score += keywordBoost;
        if (!reasons.some((r) => r.includes("keyword"))) {
          reasons.push("Similar to dishes you've explored");
        }
      }
    }

    // Chef affinity (interacted with this chef before)
    if (chefWeights.has(s.chefProfileId)) {
      const chefBoost = (chefWeights.get(s.chefProfileId)! / maxChef) * 15;
      score += chefBoost;
      reasons.push(`From ${s.chefProfile.user.name}, a chef you like`);
    }

    // Diversity bonus: slightly boost cuisines they haven't engaged with much (discovery)
    if (cuisineKey && !cuisineWeights.has(cuisineKey) && interests.length > 5) {
      score += 5;
      reasons.push("Something new to try");
    }

    return {
      ...serializeSpecial(s),
      relevanceScore: Math.round(score * 10) / 10,
      matchReason: reasons[0] || "popular",
    };
  });

  // Sort by relevance score, add slight randomization to keep it fresh
  ranked.sort((a, b) => {
    const jitter = (Math.random() - 0.5) * 5; // Small random factor for variety
    return (b.relevanceScore + jitter) - a.relevanceScore;
  });

  return NextResponse.json({
    specials: ranked.slice(0, 30),
    personalized: interests.length > 0,
  });
}

// Base score from chef quality metrics (non-personalized ranking)
function baseScore(s: {
  isWeeklySpecial: boolean;
  chefProfile: { tier: string; avgRating: number | null; completedJobs: number };
}): number {
  let score = 10;
  if (s.isWeeklySpecial) score += 20;
  if (s.chefProfile.tier === "MASTER_CHEF") score += 15;
  else if (s.chefProfile.tier === "CHEF") score += 8;
  if (s.chefProfile.avgRating) score += s.chefProfile.avgRating * 3;
  score += Math.min(s.chefProfile.completedJobs, 50) * 0.3;
  return score;
}

function serializeSpecial(s: {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  isWeeklySpecial: boolean;
  estimatedGroceryCost: number | null;
  chefProfileId: string;
  chefProfile: {
    id: string;
    tier: string;
    cuisineType: string | null;
    specialtyDish: string | null;
    avgRating: number | null;
    completedJobs: number;
    hourlyRate: number;
    profileImageUrl: string | null;
    user: { name: string };
  };
}) {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    imageUrl: s.imageUrl,
    isWeeklySpecial: s.isWeeklySpecial,
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
