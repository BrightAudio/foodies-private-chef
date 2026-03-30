"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Navbar from "@/components/Navbar";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
}

interface FoodTruckDetail {
  id: string;
  name: string;
  description: string;
  cuisineType: string;
  imageUrl: string | null;
  location: string;
  schedule: string | null;
  priceRange: string;
  isFeatured: boolean;
  phone: string | null;
  website: string | null;
  owner: { name: string };
  menuItems: MenuItem[];
}

export default function FoodTruckDetailPage() {
  const { id } = useParams();
  const [truck, setTruck] = useState<FoodTruckDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetch(`/api/food-trucks/${id}`)
        .then((r) => r.json())
        .then((data) => {
          setTruck(data);
          setLoading(false);
        });
    }
  }, [id]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 pt-28 pb-16 text-center text-cream-muted">Loading...</div>
      </>
    );
  }

  if (!truck) {
    return (
      <>
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 pt-28 pb-16 text-center">
          <p className="text-cream-muted text-lg">Food truck not found.</p>
        </div>
      </>
    );
  }

  const availableItems = truck.menuItems.filter((i) => i.isAvailable);

  return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-28 pb-16">
        {/* Hero */}
        <div className="relative h-72 md:h-96 bg-dark-card border border-dark-border overflow-hidden mb-8">
          {truck.imageUrl ? (
            <Image src={truck.imageUrl} alt={truck.name} fill className="object-cover" sizes="900px" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-dark-card to-dark-hover">
              <span className="text-8xl">🚚</span>
            </div>
          )}
          {truck.isFeatured && (
            <div className="absolute top-4 left-4 bg-gold text-dark px-4 py-1.5 text-xs font-bold tracking-wider uppercase">
              Featured
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">{truck.name}</h1>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm bg-gold/10 text-gold-light px-3 py-1">{truck.cuisineType}</span>
              <span className="text-sm text-cream-muted">{truck.priceRange}</span>
              <span className="text-sm text-cream-muted/50">by {truck.owner.name}</span>
            </div>
            <p className="text-cream-muted max-w-2xl leading-relaxed">{truck.description}</p>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="bg-dark-card border border-dark-border p-5">
            <p className="text-xs font-medium tracking-wider uppercase text-cream-muted mb-1">Location</p>
            <p className="text-cream font-medium">📍 {truck.location}</p>
          </div>
          {truck.schedule && (
            <div className="bg-dark-card border border-dark-border p-5">
              <p className="text-xs font-medium tracking-wider uppercase text-cream-muted mb-1">Schedule</p>
              <p className="text-cream font-medium">🕐 {truck.schedule}</p>
            </div>
          )}
          {truck.phone && (
            <div className="bg-dark-card border border-dark-border p-5">
              <p className="text-xs font-medium tracking-wider uppercase text-cream-muted mb-1">Phone</p>
              <p className="text-cream font-medium">📞 {truck.phone}</p>
            </div>
          )}
          {truck.website && (
            <div className="bg-dark-card border border-dark-border p-5">
              <p className="text-xs font-medium tracking-wider uppercase text-cream-muted mb-1">Website</p>
              <a
                href={truck.website.startsWith("http") ? truck.website : `https://${truck.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold hover:text-gold-light font-medium transition-colors"
              >
                🌐 Visit Website
              </a>
            </div>
          )}
        </div>

        {/* Menu */}
        {availableItems.length > 0 && (
          <div>
            <p className="text-gold text-xs font-medium tracking-[0.25em] uppercase mb-3">What&apos;s Cooking</p>
            <h2 className="text-2xl font-bold tracking-tight mb-6">Menu</h2>
            <div className="grid gap-4">
              {availableItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-dark-card border border-dark-border p-5 flex items-center gap-5"
                >
                  {item.imageUrl ? (
                    <div className="relative w-20 h-20 flex-shrink-0 overflow-hidden">
                      <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="80px" />
                    </div>
                  ) : (
                    <div className="w-20 h-20 flex-shrink-0 bg-dark-hover flex items-center justify-center">
                      <span className="text-2xl">🍽️</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.name}</h3>
                    {item.description && (
                      <p className="text-sm text-cream-muted mt-1">{item.description}</p>
                    )}
                  </div>
                  <p className="text-lg font-bold text-gold">${item.price}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
