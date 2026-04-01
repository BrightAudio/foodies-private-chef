"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { trackInterest, extractDishKeywords, useScrollTracker } from "@/lib/tracking";

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
  matchReasons?: string[];
}

interface FeedMeta {
  signalCount: number;
  topCuisines: string[];
  userCity: string | null;
  primaryDevice: string | null;
}

interface AlsoBookedChef {
  id: string;
  name: string;
  tier: string;
  cuisine: string | null;
  rating: number | null;
  jobs: number;
  rate: number;
  image: string | null;
  sharedBookers: number;
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
  const [meta, setMeta] = useState<FeedMeta | null>(null);
  const [alsoBooked, setAlsoBooked] = useState<AlsoBookedChef[]>([]);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      const token = localStorage.getItem("token");
      if (token) {
        headers.Authorization = `Bearer ${token}`;
        // Fetch collaborative filtering in parallel
        fetch("/api/feed/also-booked", { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.ok ? r.json() : { chefs: [] })
          .then(data => setAlsoBooked(data.chefs || []))
          .catch(() => {});
      }
      const res = await fetch("/api/feed/for-you", { headers });
      if (res.ok) {
        const data = await res.json();
        setSpecials(data.specials);
        setPersonalized(data.personalized);
        if (data.meta) setMeta(data.meta);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Track scroll depth on the feed (how far they scroll = engagement depth)
  useEffect(() => {
    if (loading || specials.length === 0) return;
    const cleanup = useScrollTracker({});
    return cleanup;
  }, [loading, specials.length]);

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
          {meta && personalized && meta.topCuisines.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-[10px] text-cream-muted/50 tracking-wider uppercase">Your tastes:</span>
              {meta.topCuisines.map((c) => (
                <span key={c} className="text-[10px] px-2 py-0.5 border border-gold/20 bg-gold/5 text-gold tracking-wider uppercase">
                  {c}
                </span>
              ))}
              <span className="text-[10px] text-cream-muted/30 ml-1">
                {meta.signalCount} signals analyzed
              </span>
            </div>
          )}
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
              const allReasons = special.matchReasons?.length ? special.matchReasons : [special.matchReason];

              const getReasonStyle = (reason: string) =>
                REASON_BADGES[reason] ||
                (reason.includes("interest")
                  ? { bg: "bg-gold/10 border-gold/20", text: "text-gold" }
                  : reason.includes("chef you")
                    ? { bg: "bg-purple-500/10 border-purple-500/20", text: "text-purple-400" }
                    : reason.includes("explored")
                      ? { bg: "bg-blue-500/10 border-blue-500/20", text: "text-blue-400" }
                      : reason.includes("similar food")
                        ? { bg: "bg-pink-500/10 border-pink-500/20", text: "text-pink-400" }
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
                          {/* Match reason badges */}
                          <div className="flex flex-wrap items-center gap-1.5 mb-3">
                            {allReasons.map((reason, ri) => {
                              const style = getReasonStyle(reason);
                              return (
                                <span key={ri} className={`text-[10px] font-medium tracking-wider uppercase px-2 py-0.5 border ${style.bg} ${style.text}`}>
                                  {reason}
                                </span>
                              );
                            })}
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

        {/* Also Booked section — collaborative filtering */}
        {alsoBooked.length > 0 && (
          <div className="mt-16">
            <h2 className="text-xl font-bold tracking-tight mb-2">Chefs Others Also Loved</h2>
            <p className="text-cream-muted text-xs mb-6">Clients with similar taste also booked these chefs</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {alsoBooked.map((chef) => {
                const t = TIER_LABELS[chef.tier] || TIER_LABELS.CHEF;
                return (
                  <Link key={chef.id} href={`/chef/${chef.id}`} className="block group">
                    <div className="bg-dark-card border border-dark-border hover:border-pink-500/30 transition-all p-5 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-dark-bg border border-dark-border overflow-hidden flex-shrink-0">
                        {chef.image ? (
                          <Image src={chef.image} alt={chef.name} width={48} height={48} className="object-cover w-full h-full" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg opacity-50">👨‍🍳</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm group-hover:text-gold transition-colors truncate">{chef.name}</p>
                        <div className="flex items-center gap-2 text-xs text-cream-muted mt-0.5">
                          <span className={t.color}>{t.emoji} {t.label}</span>
                          {chef.cuisine && <><span className="opacity-30">·</span><span>{chef.cuisine}</span></>}
                        </div>
                        <p className="text-[10px] text-pink-400/70 mt-1">
                          {chef.sharedBookers} client{chef.sharedBookers !== 1 ? "s" : ""} with similar taste
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-gold">${chef.rate}/hr</p>
                        {chef.rating && <p className="text-xs text-cream-muted">★ {chef.rating.toFixed(1)}</p>}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
