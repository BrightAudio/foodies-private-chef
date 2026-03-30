"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

interface FeaturedTruck {
  id: string;
  name: string;
  description: string;
  cuisineType: string;
  imageUrl: string | null;
  location: string;
  priceRange: string;
}

export default function FeaturedTrucks() {
  const [trucks, setTrucks] = useState<FeaturedTruck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/food-trucks?featured=true")
      .then((r) => r.json())
      .then((data) => {
        setTrucks(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || trucks.length === 0) return null;

  return (
    <section className="py-32 border-t border-dark-border">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="text-gold text-xs font-medium tracking-[0.25em] uppercase mb-4">
              Street Food
            </p>
            <h2 className="text-4xl font-bold tracking-tight">Featured Food Trucks</h2>
          </div>
          <Link
            href="/food-trucks"
            className="text-gold text-sm font-medium tracking-wider uppercase hover:text-gold-light transition-colors"
          >
            View All →
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {trucks.slice(0, 6).map((truck) => (
            <Link
              key={truck.id}
              href={`/food-trucks/${truck.id}`}
              className="bg-dark-card border border-dark-border hover:border-gold/30 transition-all duration-300 overflow-hidden group"
            >
              <div className="h-48 bg-gradient-to-br from-dark-card to-dark-hover flex items-center justify-center relative overflow-hidden">
                {truck.imageUrl ? (
                  <Image
                    src={truck.imageUrl}
                    alt={truck.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="400px"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center">
                    <span className="text-3xl">🚚</span>
                  </div>
                )}
                <div className="absolute top-4 left-4 bg-gold text-dark px-3 py-1 text-xs font-bold tracking-wider uppercase">
                  Featured
                </div>
                <div className="absolute top-4 right-4 bg-dark/80 backdrop-blur-sm px-3 py-1 text-gold text-sm font-semibold">
                  {truck.priceRange}
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-2 group-hover:text-gold transition-colors tracking-tight">
                  {truck.name}
                </h3>
                <span className="inline-block text-xs bg-gold/10 text-gold-light px-3 py-1 mb-3">
                  {truck.cuisineType}
                </span>
                <p className="text-sm text-cream-muted line-clamp-2 mb-3">{truck.description}</p>
                <div className="flex items-center gap-2 text-sm text-cream-muted/70">
                  <span className="text-gold">📍</span>
                  {truck.location}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
