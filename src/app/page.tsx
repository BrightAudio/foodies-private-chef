"use client";
import Link from "next/link";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import FeaturedTrucks from "@/components/FeaturedTrucks";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function Home() {
  usePageTitle("");
  const [user] = useState<{ name: string; role: string } | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  return (
    <>
      <Navbar />
      <main id="main-content">
        {/* Hero */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          {/* Background gradient effects */}
          <div className="absolute inset-0 bg-dark" />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gold/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

          <div className="relative max-w-5xl mx-auto px-4 text-center pt-20">
            <div className="inline-block mb-8 px-4 py-1.5 border border-gold/30 text-gold text-xs font-medium tracking-[0.2em] uppercase">
              Vetted &amp; Insured Private Chefs
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight leading-[1.1]">
              Book a Private Chef
              <br />
              <span className="text-gold">Experience</span>
            </h1>

            <p className="text-xl md:text-2xl text-cream-muted mb-12 max-w-2xl mx-auto leading-relaxed font-light">
              Vetted chefs. In-home dining. Elevated experiences.
            </p>

            <div className="flex gap-6 justify-center">
              <Link
                href="/browse"
                className="bg-gold text-dark px-10 py-4 font-semibold text-sm tracking-[0.15em] uppercase hover:bg-gold-light transition-colors"
              >
                Browse Chefs
              </Link>
              {!user && (
                <Link
                  href="/register?role=CHEF"
                  className="border border-gold/40 text-gold px-10 py-4 font-semibold text-sm tracking-[0.15em] uppercase hover:bg-gold/10 transition-colors"
                >
                  Become a Chef
                </Link>
              )}
            </div>

            {/* Trust indicators */}
            <div className="flex justify-center gap-10 mt-20 text-cream-muted text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gold">✓</span> ServSafe Certified
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gold">✓</span> Liability Insured
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gold">✓</span> Background Verified
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-32 border-t border-dark-border">
          <div className="max-w-7xl mx-auto px-4">
            <p className="text-gold text-xs font-medium tracking-[0.25em] uppercase text-center mb-4">
              The Process
            </p>
            <h2 className="text-4xl font-bold text-center mb-20 tracking-tight">How It Works</h2>

            <div className="grid md:grid-cols-3 gap-12">
              {[
                { num: "01", title: "Browse Chefs", desc: "Explore curated profiles, specialties, ratings, and pricing. Find the perfect chef for your occasion." },
                { num: "02", title: "Book Your Experience", desc: "Select your date, guest count, and menu preferences. Your chef handles every detail." },
                { num: "03", title: "Enjoy In-Home Dining", desc: "Savor a restaurant-caliber meal in the comfort of your home. Then rate your experience." },
              ].map((step) => (
                <div key={step.title} className="text-center group">
                  <div className="text-gold text-5xl font-light mb-6 opacity-40 group-hover:opacity-100 transition-opacity">{step.num}</div>
                  <h3 className="text-xl font-semibold mb-4 tracking-tight">{step.title}</h3>
                  <p className="text-cream-muted leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Chef CTA — only show when not signed in */}
        {!user && (
          <section className="py-32 border-t border-dark-border relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gold/3 rounded-full blur-3xl" />
            <div className="relative max-w-3xl mx-auto px-4 text-center">
              <p className="text-gold text-xs font-medium tracking-[0.25em] uppercase mb-4">
                For Chefs
              </p>
              <h2 className="text-4xl font-bold mb-6 tracking-tight">Join Foodies: Private Chef Services</h2>
              <p className="text-lg text-cream-muted mb-4 leading-relaxed">
                Set your own rates, showcase your signature dishes, and connect with clients
                seeking an elevated private dining experience.
              </p>
              <p className="text-sm text-cream-muted/60 mb-10">
                Requirements: ServSafe certification, general liability insurance, food product liability insurance, and a background check.
              </p>
              <Link
                href="/chef/onboarding"
                className="inline-block bg-gold text-dark px-10 py-4 font-semibold text-sm tracking-[0.15em] uppercase hover:bg-gold-light transition-colors"
              >
                Apply Now
              </Link>
            </div>
          </section>
        )}

        {/* Featured Food Trucks */}
        <FeaturedTrucks />

        {/* Safety & Trust Section */}
        <section className="py-32 border-t border-dark-border">
          <div className="max-w-7xl mx-auto px-4">
            <p className="text-gold text-xs font-medium tracking-[0.25em] uppercase text-center mb-4">
              Your Safety, Our Priority
            </p>
            <h2 className="text-4xl font-bold text-center mb-20 tracking-tight">Built on Trust</h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { icon: "🔒", title: "Address Privacy", desc: "Your address is hidden until the chef starts the job. Only a general area is shared beforehand." },
                { icon: "🛡️", title: "Background Verified", desc: "Every chef passes a comprehensive background check including criminal history and identity verification." },
                { icon: "📋", title: "Fully Insured", desc: "All chefs carry ServSafe certification, general liability, and food product liability insurance." },
                { icon: "💬", title: "Secure Messaging", desc: "All communication stays inside Foodies. Contact info is automatically filtered for safety." },
              ].map((item) => (
                <div key={item.title} className="bg-dark-card border border-dark-border p-8 text-center hover:border-gold/20 transition-colors">
                  <div className="text-3xl mb-4">{item.icon}</div>
                  <h3 className="text-lg font-semibold mb-3 tracking-tight">{item.title}</h3>
                  <p className="text-sm text-cream-muted leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-dark-border py-12">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-cream-muted">&copy; {new Date().getFullYear()} Foodies: Private Chef Services</p>
            <div className="flex gap-6">
              <Link href="/terms" className="text-sm text-cream-muted hover:text-gold transition-colors">
                Terms of Service
              </Link>
              <Link href="/browse" className="text-sm text-cream-muted hover:text-gold transition-colors">
                Browse Chefs
              </Link>
              <Link href="/food-trucks" className="text-sm text-cream-muted hover:text-gold transition-colors">
                Food Trucks
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
