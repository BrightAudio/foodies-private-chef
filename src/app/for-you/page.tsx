"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { trackInterest, extractDishKeywords } from "@/lib/tracking";

interface FeedSpecial {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  isWeeklySpecial: boolean;
  estimatedGroceryCost: number | null;
  chefId: string;
  chefName: string;
  chefTier: string;
  chefCuisine: string | null;
  chefRating: number | null;
  chefImage: string | null;
  chefRate: number;
  chefJobs: number;
  relevanceScore: number;
  matchReason: string;
}

const TIER_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  SOUS_CHEF: { label: "Sous Chef", emoji: "🔪", color: "text-blue-400" },
  CHEF: { label: "Chef", emoji: "👨‍🍳", color: "text-gold" },
  MASTER_CHEF: { label: "Master Chef", emoji: "⭐", color: "text-purple-400" },
};

const REASON_BADGES: Record<string, { bg: string; text: string }> = {
  trending: { bg: "bg-orange-500/10 border-orange-500/20", text: "text-orange-400" },
  popular: { bg: "bg-gold/10 border-gold/20", text: "text-gold" },
  "Something new to try": { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400" },
};

export default function ForYouPage() {
  const [specials, setSpecials] = useState<FeedSpecial[]>([]);
  const [loading, setLoading] = useState(true);
  const [personalized, setPersonalized] = useState(false);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      const token = localStorage.getItem("token");
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch("/api/feed/for-you", { headers });
      if (res.ok) {
        const data = await res.json();
        setSpecials(data.specials);
        setPersonalized(data.personalized);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const handleSpecialClick = (special: FeedSpecial) => {
    const keywords = extractDishKeywords(`${special.name} ${special.description}`);
    for (const kw of keywords) {
      trackInterest({ signalType: "CLICK_SPECIAL", dishKeyword: kw, chefProfileId: special.chefId, cuisineType: special.chefCuisine || undefined });
    }
  };

  return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-28 pb-16">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">For You</h1>
          <p className="text-cream-muted text-sm">
            {personalized
              ? "Dishes curated based on your tastes and interests"
              : "Trending dishes from top private chefs"}
          </p>
        </div>

        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-dark-card border border-dark-border animate-pulse h-48" />
            ))}
          </div>
        ) : specials.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-cream-muted text-lg mb-4">No specials available yet</p>
            <Link href="/browse" className="text-gold hover:text-gold-light text-sm font-medium tracking-wider uppercase">
              Browse Chefs →
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {specials.map((special, idx) => {
              const tier = TIER_LABELS[special.chefTier] || TIER_LABELS.CHEF;
              const reasonStyle =
                REASON_BADGES[special.matchReason] ||
                (special.matchReason.includes("interest")
                  ? { bg: "bg-gold/10 border-gold/20", text: "text-gold" }
                  : special.matchReason.includes("chef you like")
                    ? { bg: "bg-purple-500/10 border-purple-500/20", text: "text-purple-400" }
                    : special.matchReason.includes("explored")
                      ? { bg: "bg-blue-500/10 border-blue-500/20", text: "text-blue-400" }
                      : { bg: "bg-dark-border/50 border-dark-border", text: "text-cream-muted" });

              return (
                <Link
                  key={special.id}
                  href={`/chef/${special.chefId}`}
                  onClick={() => handleSpecialClick(special)}
                  className="block group"
                >
                  <div className="bg-dark-card border border-dark-border hover:border-gold/30 transition-all duration-300 overflow-hidden">
                    <div className="flex flex-col sm:flex-row">
                      {/* Image */}
                      <div className="relative w-full sm:w-56 h-48 sm:h-auto bg-dark-bg flex-shrink-0">
                        {special.imageUrl ? (
                          <Image
                            src={special.imageUrl}
                            alt={special.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl opacity-30">
                            🍽️
                          </div>
                        )}
                        {special.isWeeklySpecial && (
                          <div className="absolute top-3 left-3 bg-gold text-dark text-[10px] font-bold tracking-widest uppercase px-2 py-1">
                            Weekly Special
                          </div>
                        )}
                        {idx === 0 && personalized && (
                          <div className="absolute top-3 right-3 bg-dark-bg/80 backdrop-blur text-gold text-[10px] font-bold tracking-widest uppercase px-2 py-1 border border-gold/20">
                            Top Pick
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between">
                        <div>
                          {/* Match reason badge */}
                          <div className="flex items-center gap-2 mb-3">
                            <span className={`text-[10px] font-medium tracking-wider uppercase px-2 py-0.5 border ${reasonStyle.bg} ${reasonStyle.text}`}>
                              {special.matchReason}
                            </span>
                          </div>

                          <h3 className="text-lg font-semibold mb-1 group-hover:text-gold transition-colors">
                            {special.name}
                          </h3>
                          <p className="text-cream-muted text-sm line-clamp-2 mb-4">
                            {special.description}
                          </p>
                        </div>

                        {/* Chef info */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-dark-bg border border-dark-border overflow-hidden flex-shrink-0">
                              {special.chefImage ? (
                                <Image
                                  src={special.chefImage}
                                  alt={special.chefName}
                                  width={36}
                                  height={36}
                                  className="object-cover w-full h-full"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs opacity-50">
                                  👨‍🍳
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{special.chefName}</p>
                              <div className="flex items-center gap-2 text-xs text-cream-muted">
                                <span className={tier.color}>
                                  {tier.emoji} {tier.label}
                                </span>
                                {special.chefCuisine && (
                                  <>
                                    <span className="opacity-30">·</span>
                                    <span>{special.chefCuisine}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-sm font-semibold text-gold">${special.chefRate}/hr</p>
                            {special.chefRating && (
                              <p className="text-xs text-cream-muted">
                                ★ {special.chefRating.toFixed(1)} · {special.chefJobs} jobs
                              </p>
                            )}
                          </div>
                        </div>

                        {special.estimatedGroceryCost && (
                          <p className="text-xs text-cream-muted mt-3">
                            🛒 Estimated groceries: ~${special.estimatedGroceryCost.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
