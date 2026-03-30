"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import StarRating from "@/components/StarRating";

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
}

const tierBadgeColors: Record<string, string> = {
  SOUS_CHEF: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  CHEF: "bg-gold/10 text-gold border border-gold/20",
  MASTER_CHEF: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
};

export default function BrowseChefs() {
  const [chefs, setChefs] = useState<Chef[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("rating");
  const [cuisineFilter, setCuisineFilter] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    fetchChefs();
  }, [sortBy]);

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
    }
  };

  const fetchChefs = async () => {
    setLoading(true);
    const res = await fetch(`/api/chefs?sort=${sortBy}&limit=50`);
    const data = await res.json();
    setChefs(data.chefs || data);
    setLoading(false);
  };

  const filtered = chefs.filter(
    (c) =>
      (c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.specialtyDish.toLowerCase().includes(search.toLowerCase()) ||
      (c.cuisineType || "").toLowerCase().includes(search.toLowerCase())) &&
      (!cuisineFilter || (c.cuisineType || "").toLowerCase().includes(cuisineFilter.toLowerCase())) &&
      (!maxPrice || c.hourlyRate <= Number(maxPrice))
  );

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 pt-28 pb-16">
        <p className="text-gold text-xs font-medium tracking-[0.25em] uppercase mb-3">Our Chefs</p>
        <h1 className="text-4xl font-bold mb-10 tracking-tight">Browse Private Chefs</h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-10">
          <input
            type="text"
            placeholder="Search by name or cuisine..."
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
          <select
            className="border border-dark-border rounded-none px-5 py-3 bg-dark-card text-cream focus:border-gold"
            value={cuisineFilter}
            onChange={(e) => setCuisineFilter(e.target.value)}
          >
            <option value="">All Cuisines</option>
            {Array.from(new Set(chefs.map((c) => c.cuisineType).filter(Boolean))).map((ct) => (
              <option key={ct} value={ct!}>{ct}</option>
            ))}
          </select>
          <select
            className="border border-dark-border rounded-none px-5 py-3 bg-dark-card text-cream focus:border-gold"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          >
            <option value="">Any Price</option>
            <option value="60">Up to $60/hr</option>
            <option value="100">Up to $100/hr</option>
            <option value="125">Up to $125/hr</option>
            <option value="200">Up to $200/hr</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-20 text-cream-muted">Loading chefs...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-cream-muted text-lg">No chefs found.</p>
            <p className="text-cream-muted/50 mt-2">Check back soon or adjust your search.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((chef) => (
              <Link
                key={chef.id}
                href={`/chef/${chef.id}`}
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
                    <span className={`text-[10px] font-bold px-2 py-0.5 tracking-wider uppercase ${tierBadgeColors[chef.tier] || tierBadgeColors.SOUS_CHEF}`}>
                      {chef.tierEmoji} {chef.tierLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <StarRating rating={chef.avgRating} size="sm" />
                    <span className="text-sm text-cream-muted">
                      {chef.avgRating} ({chef.reviewCount})
                    </span>
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
      </div>
    </>
  );
}
