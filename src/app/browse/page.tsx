"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import StarRating from "@/components/StarRating";
import { trackInterest } from "@/lib/tracking";

interface Chef {
  id: string;
  name: string;
  bio: string | null;
  specialtyDish: string;
  cuisineType: string | null;
  hourlyRate: number;
  profileImageUrl: string | null;
  avgRating: number;
  reviewCount: number;
  tier: string;
  tierLabel: string;
  tierEmoji: string;
  completedJobs: number;
  specials: { id: string; name: string }[];
  bgCheckPassed?: boolean;
  insuranceVerified?: boolean;
  trustScore?: number;
  boostActive?: boolean;
}

const TIER_CONFIG = {
  SOUS_CHEF: {
    label: "Sous Chef",
    emoji: "🔪",
    priceRange: "$40–$75/hr",
    description: "Up-and-coming culinary talent ready to impress",
    color: "border-blue-500/40 hover:border-blue-400",
    selectedColor: "border-blue-400 bg-blue-500/10",
    badge: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    accent: "text-blue-400",
  },
  CHEF: {
    label: "Chef",
    emoji: "👨‍🍳",
    priceRange: "$75–$120/hr",
    description: "Experienced professionals with proven track records",
    color: "border-gold/40 hover:border-gold",
    selectedColor: "border-gold bg-gold/10",
    badge: "bg-gold/10 text-gold border border-gold/20",
    accent: "text-gold",
  },
  MASTER_CHEF: {
    label: "Master Chef",
    emoji: "⭐",
    priceRange: "$120–$200/hr",
    description: "Elite culinary artists for extraordinary experiences",
    color: "border-purple-500/40 hover:border-purple-400",
    selectedColor: "border-purple-400 bg-purple-500/10",
    badge: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
    accent: "text-purple-400",
  },
};

type TierKey = keyof typeof TIER_CONFIG;
type Step = "tier" | "event" | "chefs";

export default function BrowseChefs() {
  const [step, setStep] = useState<Step>("tier");
  const [selectedTier, setSelectedTier] = useState<TierKey | null>(null);
  const [eventDetails, setEventDetails] = useState({ date: "", time: "", guests: "", cuisine: "" });
  const [chefs, setChefs] = useState<Chef[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("rating");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true);
      fetchFavorites(token);
    }
  }, []);

  const fetchFavorites = async (token: string) => {
    try {
      const res = await fetch("/api/favorites", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setFavorites(new Set(data.map((f: { chefProfileId: string }) => f.chefProfileId)));
      }
    } catch { /* ignore */ }
  };

  const toggleFavorite = async (e: React.MouseEvent, chefId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/login"; return; }
    if (favorites.has(chefId)) {
      await fetch("/api/favorites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ chefProfileId: chefId }),
      });
      setFavorites((prev) => { const n = new Set(prev); n.delete(chefId); return n; });
    } else {
      await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ chefProfileId: chefId }),
      });
      setFavorites((prev) => new Set(prev).add(chefId));
      // Track favorite as strong interest signal
      const chef = chefs.find(c => c.id === chefId);
      trackInterest({ signalType: "FAVORITE", chefProfileId: chefId, cuisineType: chef?.cuisineType || undefined });
    }
  };

  const handleTierSelect = (tier: TierKey) => {
    setSelectedTier(tier);
    setStep("event");
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTier) return;
    setLoading(true);
    setStep("chefs");
    if (eventDetails.cuisine) {
      trackInterest({ signalType: "SEARCH", cuisineType: eventDetails.cuisine });
    }
    try {
      const params = new URLSearchParams({ sort: sortBy, limit: "50", tier: selectedTier });
      if (eventDetails.cuisine) params.set("cuisine", eventDetails.cuisine);
      const res = await fetch(`/api/chefs?${params}`);
      const data = await res.json();
      setChefs(data.chefs || data);
    } catch { setChefs([]); } finally { setLoading(false); }
  };

  const refetchChefs = async () => {
    if (!selectedTier) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort: sortBy, limit: "50", tier: selectedTier });
      if (eventDetails.cuisine) params.set("cuisine", eventDetails.cuisine);
      const res = await fetch(`/api/chefs?${params}`);
      const data = await res.json();
      setChefs(data.chefs || data);
    } catch { setChefs([]); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (step === "chefs" && selectedTier) refetchChefs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);

  // Track search interest with debounce
  useEffect(() => {
    if (!search || search.length < 2) return;
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      trackInterest({ signalType: "SEARCH", cuisineType: search.trim(), dishKeyword: search.trim() });
    }, 800);
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
  }, [search]);

  const filtered = chefs.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.specialtyDish.toLowerCase().includes(search.toLowerCase()) ||
      (c.cuisineType || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 pt-28 pb-16">
        {/* Progress Steps */}
        <div className="flex items-center gap-3 mb-10">
          {[
            { key: "tier" as Step, label: "1. Choose Tier" },
            { key: "event" as Step, label: "2. Event Details" },
            { key: "chefs" as Step, label: "3. Pick a Chef" },
          ].map((s, i) => (
            <div key={s.key} className="flex items-center gap-3">
              {i > 0 && <div className="w-8 h-px bg-dark-border" />}
              <button
                onClick={() => {
                  if (s.key === "tier") setStep("tier");
                  else if (s.key === "event" && selectedTier) setStep("event");
                  else if (s.key === "chefs" && selectedTier && chefs.length > 0) setStep("chefs");
                }}
                className={`text-xs font-medium tracking-wider uppercase px-3 py-1.5 border transition-colors ${
                  step === s.key
                    ? "border-gold text-gold bg-gold/5"
                    : "border-dark-border text-cream-muted/50 hover:text-cream-muted"
                }`}
              >
                {s.label}
              </button>
            </div>
          ))}
        </div>

        {/* Step 1: Choose Tier */}
        {step === "tier" && (
          <>
            <p className="text-gold text-xs font-medium tracking-[0.25em] uppercase mb-3">Step 1</p>
            <h1 className="text-4xl font-bold mb-4 tracking-tight">Choose Your Experience</h1>
            <p className="text-cream-muted/70 mb-10 text-sm">Select the level of chef that fits your occasion and budget.</p>

            <div className="grid md:grid-cols-3 gap-6">
              {(Object.entries(TIER_CONFIG) as [TierKey, typeof TIER_CONFIG[TierKey]][]).map(([key, tier]) => (
                <button
                  key={key}
                  onClick={() => handleTierSelect(key)}
                  className={`text-left bg-dark-card border-2 p-8 transition-all duration-300 hover:scale-[1.02] ${
                    selectedTier === key ? tier.selectedColor : tier.color
                  }`}
                >
                  <div className="text-5xl mb-4">{tier.emoji}</div>
                  <h2 className={`text-2xl font-bold mb-2 ${tier.accent}`}>{tier.label}</h2>
                  <p className="text-2xl font-semibold text-cream mb-3">{tier.priceRange}</p>
                  <p className="text-sm text-cream-muted/70 mb-6">{tier.description}</p>
                  <div className="flex items-center gap-2 text-xs text-cream-muted/50">
                    <span>✓ Background checked</span>
                    <span>·</span>
                    <span>✓ Insured</span>
                    <span>·</span>
                    <span>✓ Secure payment</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 2: Event Details */}
        {step === "event" && selectedTier && (
          <>
            <p className="text-gold text-xs font-medium tracking-[0.25em] uppercase mb-3">Step 2</p>
            <h1 className="text-4xl font-bold mb-4 tracking-tight">Tell Us About Your Event</h1>
            <p className="text-cream-muted/70 mb-10 text-sm">
              We&apos;ll match you with {TIER_CONFIG[selectedTier].label} chefs ({TIER_CONFIG[selectedTier].priceRange}) available for your event.
            </p>

            <form onSubmit={handleEventSubmit} className="max-w-xl space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Event Date</label>
                  <input
                    type="date"
                    value={eventDetails.date}
                    onChange={(e) => setEventDetails({ ...eventDetails, date: e.target.value })}
                    className="w-full border border-dark-border rounded-none px-4 py-3 bg-dark-card text-cream focus:border-gold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Start Time</label>
                  <input
                    type="time"
                    value={eventDetails.time}
                    onChange={(e) => setEventDetails({ ...eventDetails, time: e.target.value })}
                    className="w-full border border-dark-border rounded-none px-4 py-3 bg-dark-card text-cream focus:border-gold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Number of Guests</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  placeholder="e.g. 8"
                  value={eventDetails.guests}
                  onChange={(e) => setEventDetails({ ...eventDetails, guests: e.target.value })}
                  className="w-full border border-dark-border rounded-none px-4 py-3 bg-dark-card text-cream placeholder:text-cream-muted/40 focus:border-gold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Preferred Cuisine (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Italian, Japanese, French..."
                  value={eventDetails.cuisine}
                  onChange={(e) => setEventDetails({ ...eventDetails, cuisine: e.target.value })}
                  className="w-full border border-dark-border rounded-none px-4 py-3 bg-dark-card text-cream placeholder:text-cream-muted/40 focus:border-gold"
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setStep("tier")}
                  className="px-6 py-3 border border-dark-border text-cream-muted hover:text-cream hover:border-cream-muted transition-colors text-sm"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-gold text-dark font-bold text-sm tracking-wider uppercase hover:bg-gold-light transition-colors"
                >
                  Find Chefs →
                </button>
              </div>
            </form>
          </>
        )}

        {/* Step 3: Matched Chefs */}
        {step === "chefs" && selectedTier && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gold text-xs font-medium tracking-[0.25em] uppercase mb-3">Step 3</p>
                <h1 className="text-4xl font-bold tracking-tight">
                  {TIER_CONFIG[selectedTier].emoji} {TIER_CONFIG[selectedTier].label} Chefs
                </h1>
              </div>
              <button
                onClick={() => setStep("event")}
                className="px-4 py-2 border border-dark-border text-cream-muted hover:text-cream hover:border-cream-muted transition-colors text-xs"
              >
                ← Change Details
              </button>
            </div>
            <p className="text-cream-muted/70 mb-8 text-sm">
              {TIER_CONFIG[selectedTier].priceRange} · {eventDetails.date && new Date(eventDetails.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              {eventDetails.guests && ` · ${eventDetails.guests} guests`}
              {eventDetails.cuisine && ` · ${eventDetails.cuisine}`}
            </p>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-8">
              <input
                type="text"
                placeholder="Search by name or specialty..."
                className="border border-dark-border rounded-none px-5 py-3 flex-1 min-w-64 bg-dark-card text-cream placeholder:text-cream-muted/40 focus:border-gold"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="border border-dark-border rounded-none px-5 py-3 bg-dark-card text-cream focus:border-gold"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="rating">Sort by Rating</option>
                <option value="price">Sort by Price</option>
              </select>
            </div>

            {loading ? (
              <div className="text-center py-20 text-cream-muted">Finding chefs for you...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-cream-muted text-lg">No {TIER_CONFIG[selectedTier].label} chefs found.</p>
                <p className="text-cream-muted/50 mt-2">Try adjusting your search or selecting a different tier.</p>
                <button
                  onClick={() => setStep("tier")}
                  className="mt-6 px-6 py-3 border border-gold text-gold hover:bg-gold hover:text-dark transition-colors text-sm"
                >
                  Browse Other Tiers
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filtered.map((chef) => (
                  <Link
                    key={chef.id}
                    href={`/chef/${chef.id}?date=${eventDetails.date}&time=${eventDetails.time}&guests=${eventDetails.guests}`}
                    className="bg-dark-card border border-dark-border hover:border-gold/30 transition-all duration-300 overflow-hidden group"
                  >
                    <div className="h-52 bg-gradient-to-br from-dark-card to-dark-hover flex items-center justify-center relative overflow-hidden">
                      {chef.profileImageUrl ? (
                        <Image src={chef.profileImageUrl} alt={chef.name} fill className="object-cover" sizes="400px" />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gold/10 flex items-center justify-center">
                          <span className="text-4xl">👨‍🍳</span>
                        </div>
                      )}
                      <div className="absolute top-4 right-4 bg-dark/80 backdrop-blur-sm px-3 py-1 text-gold text-sm font-semibold">
                        From ${chef.hourlyRate}/hr
                      </div>
                      {isLoggedIn && (
                        <button
                          onClick={(e) => toggleFavorite(e, chef.id)}
                          className="absolute top-4 left-4 text-2xl transition-transform hover:scale-110"
                        >
                          {favorites.has(chef.id) ? "❤️" : "🤍"}
                        </button>
                      )}
                    </div>
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl font-semibold group-hover:text-gold transition-colors tracking-tight">
                          {chef.name}
                        </h2>
                        <span className={`text-[10px] font-bold px-2 py-0.5 tracking-wider uppercase ${TIER_CONFIG[selectedTier].badge}`}>
                          {chef.tierEmoji} {chef.tierLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-4">
                        <StarRating rating={chef.avgRating} size="sm" />
                        <span className="text-sm text-cream-muted">
                          {chef.avgRating} ({chef.reviewCount})
                        </span>
                        {chef.completedJobs > 0 && (
                          <span className="text-xs text-cream-muted/50">· {chef.completedJobs} bookings</span>
                        )}
                      </div>

                      {/* Trust Badges */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {chef.bgCheckPassed && (
                          <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 font-medium">✓ Background Checked</span>
                        )}
                        {chef.insuranceVerified && (
                          <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 font-medium">🛡️ Insured</span>
                        )}
                        {chef.bgCheckPassed && chef.insuranceVerified && chef.completedJobs >= 5 && (
                          <span className="text-[10px] bg-gold/10 text-gold border border-gold/20 px-2 py-0.5 font-medium">⭐ Foodies Verified</span>
                        )}
                        {chef.boostActive && (
                          <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 font-medium">🔥 Featured</span>
                        )}
                      </div>

                      <p className="text-sm text-cream-muted mb-4">
                        {chef.cuisineType && (
                          <span className="text-gold text-xs font-medium tracking-wider uppercase">{chef.cuisineType}</span>
                        )}
                        {chef.cuisineType && <br />}
                        <span className="text-cream-muted/60 text-xs">Specialty:</span> {chef.specialtyDish}
                      </p>

                      {chef.specials.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-4 border-t border-dark-border">
                          {chef.specials.map((s) => (
                            <span
                              key={s.id}
                              className="text-xs bg-gold/10 text-gold-light px-3 py-1"
                            >
                              {s.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
