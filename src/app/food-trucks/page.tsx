"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { usePageTitle } from "@/hooks/usePageTitle";

interface MenuItem {
  id: string;
  name: string;
  price: number;
}

interface FoodTruck {
  id: string;
  name: string;
  description: string;
  cuisineType: string;
  imageUrl: string | null;
  location: string;
  schedule: string | null;
  priceRange: string;
  isFeatured: boolean;
  owner: { name: string };
  menuItems: MenuItem[];
}

export default function FoodTrucksPage() {
  usePageTitle("Food Trucks");
  const [trucks, setTrucks] = useState<FoodTruck[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cuisineFilter, setCuisineFilter] = useState("");

  useEffect(() => {
    fetchTrucks();
  }, []);

  const fetchTrucks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/food-trucks");
      if (res.ok) {
        const data = await res.json();
        setTrucks(data);
      }
    } catch (e) {
      console.error("Failed to fetch food trucks:", e);
    }
    setLoading(false);
  };

  const filtered = trucks.filter(
    (t) =>
      (t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.cuisineType.toLowerCase().includes(search.toLowerCase()) ||
        t.location.toLowerCase().includes(search.toLowerCase())) &&
      (cuisineFilter === "" || t.cuisineType.toLowerCase().includes(cuisineFilter.toLowerCase()))
  );

  const cuisineTypes = [...new Set(trucks.map((t) => t.cuisineType))];

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 pt-28 pb-16">
        <p className="text-gold text-xs font-medium tracking-[0.25em] uppercase mb-3">Street Food</p>
        <h1 className="text-4xl font-bold mb-4 tracking-tight">Food Trucks</h1>
        <p className="text-cream-muted mb-10 max-w-2xl">
          Discover local food trucks serving up incredible flavors. From gourmet tacos to artisan desserts.
        </p>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-10">
          <input
            type="text"
            placeholder="Search trucks, cuisine, or location..."
            className="border border-dark-border rounded-none px-5 py-3 flex-1 min-w-64 bg-dark-card text-cream placeholder:text-cream-muted/40 focus:border-gold"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="border border-dark-border rounded-none px-5 py-3 bg-dark-card text-cream focus:border-gold"
            value={cuisineFilter}
            onChange={(e) => setCuisineFilter(e.target.value)}
          >
            <option value="">All Cuisines</option>
            {cuisineTypes.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-20 text-cream-muted">Loading food trucks...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🚚</p>
            <p className="text-cream-muted text-lg">No food trucks found.</p>
            <p className="text-cream-muted/50 mt-2">Check back soon for new additions.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((truck) => (
              <Link
                key={truck.id}
                href={`/food-trucks/${truck.id}`}
                className="bg-dark-card border border-dark-border hover:border-gold/30 transition-all duration-300 overflow-hidden group"
              >
                <div className="h-52 bg-gradient-to-br from-dark-card to-dark-hover flex items-center justify-center relative overflow-hidden">
                  {truck.imageUrl ? (
                    <Image src={truck.imageUrl} alt={truck.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="400px" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gold/10 flex items-center justify-center">
                      <span className="text-4xl">🚚</span>
                    </div>
                  )}
                  {truck.isFeatured && (
                    <div className="absolute top-4 left-4 bg-gold text-dark px-3 py-1 text-xs font-bold tracking-wider uppercase">
                      Featured
                    </div>
                  )}
                  <div className="absolute top-4 right-4 bg-dark/80 backdrop-blur-sm px-3 py-1 text-gold text-sm font-semibold">
                    {truck.priceRange}
                  </div>
                </div>
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-2 group-hover:text-gold transition-colors tracking-tight">
                    {truck.name}
                  </h2>

                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs bg-gold/10 text-gold-light px-3 py-1">
                      {truck.cuisineType}
                    </span>
                  </div>

                  <p className="text-sm text-cream-muted mb-4 line-clamp-2">
                    {truck.description}
                  </p>

                  <div className="flex items-center gap-2 text-sm text-cream-muted/70">
                    <span className="text-gold">📍</span>
                    {truck.location}
                  </div>

                  {truck.schedule && (
                    <div className="flex items-center gap-2 text-sm text-cream-muted/50 mt-1">
                      <span className="text-gold">🕐</span>
                      {truck.schedule}
                    </div>
                  )}

                  {truck.menuItems.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-4 mt-4 border-t border-dark-border">
                      {truck.menuItems.slice(0, 3).map((item) => (
                        <span key={item.id} className="text-xs bg-dark-hover text-cream-muted px-3 py-1">
                          {item.name} — ${item.price}
                        </span>
                      ))}
                      {truck.menuItems.length > 3 && (
                        <span className="text-xs text-cream-muted/50 px-2 py-1">
                          +{truck.menuItems.length - 3} more
                        </span>
                      )}
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
