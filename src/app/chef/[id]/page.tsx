"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import StarRating from "@/components/StarRating";
import { trackInterest, extractDishKeywords } from "@/lib/tracking";

const StripePayment = dynamic(() => import("@/components/StripePayment"), { ssr: false });

interface ChefDetail {
  id: string;
  userId: string;
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
  user: { name: string; email: string };
  specials: { id: string; name: string; description: string; imageUrl: string | null; isWeeklySpecial?: boolean; price?: number; estimatedGroceryCost?: number | null }[];
  reviews: { id: string; rating: number; comment: string | null; createdAt: string; client: { name: string } }[];
  bgCheckPassed?: boolean;
  insuranceVerified?: boolean;
  trustScore?: number;
}

const tierBadgeColors: Record<string, string> = {
  SOUS_CHEF: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  CHEF: "bg-gold/10 text-gold border border-gold/20",
  MASTER_CHEF: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
};

export default function ChefProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [chef, setChef] = useState<ChefDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [booking, setBooking] = useState({
    date: "",
    time: "",
    guestCount: "2",
    address: "",
    specialRequests: "",
  });
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [paymentStep, setPaymentStep] = useState(false);
  const [customDish, setCustomDish] = useState({ name: "", description: "" });
  const [showCustomDish, setShowCustomDish] = useState(false);

  useEffect(() => {
    fetch(`/api/chefs/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setChef(data);
        setLoading(false);
        // Track chef view
        trackInterest({ signalType: "VIEW_CHEF", chefProfileId: data.id, cuisineType: data.cuisineType || undefined });
        // Track interest in each special keyword
        data.specials?.forEach((s: { name: string }) => {
          extractDishKeywords(s.name).forEach((kw) => {
            trackInterest({ signalType: "VIEW_SPECIAL", dishKeyword: kw, cuisineType: data.cuisineType || undefined });
          });
        });
      });
  }, [id]);

  const toggleItem = (name: string) => {
    if (selectedItems.includes(name)) {
      setSelectedItems(selectedItems.filter((i) => i !== name));
    } else {
      setSelectedItems([...selectedItems, name]);
      // Track click on specific dish
      extractDishKeywords(name).forEach((kw) => {
        trackInterest({ signalType: "CLICK_SPECIAL", dishKeyword: kw, chefProfileId: id, cuisineType: chef?.cuisineType || undefined });
      });
    }
  };

  const subtotal = chef?.hourlyRate || 0;
  const clientServiceFee = Math.round(subtotal * 0.08 * 100) / 100;
  const total = Math.round((subtotal + clientServiceFee) * 100) / 100;

  const handleBook = async () => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/login"; return; }

    setSubmitting(true);
    setError("");

    const payload = {
      chefProfileId: id,
      ...booking,
      guestCount: Number(booking.guestCount),
      items: selectedItems,
    };

    try {
      // Try Stripe payment flow first
      const payRes = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (payRes.ok) {
        const payData = await payRes.json();
        setClientSecret(payData.clientSecret);
        setPaymentStep(true);
        setSubmitting(false);
        return;
      }

      // Fallback: Stripe not configured — create booking directly
      if (payRes.status === 503) {
        const res = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        // Submit custom dish request if filled
        if (showCustomDish && customDish.name.trim() && customDish.description.trim()) {
          await fetch("/api/dish-requests", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              bookingId: data.id,
              chefProfileId: id,
              dishName: customDish.name.trim(),
              description: customDish.description.trim(),
              guestCount: Number(booking.guestCount),
            }),
          });
        }

        setSuccess("Booking submitted! The chef will confirm shortly.");
        setBookingOpen(false);
        trackInterest({ signalType: "BOOK", chefProfileId: id as string, cuisineType: chef?.cuisineType || undefined });
        return;
      }

      const errData = await payRes.json();
      throw new Error(errData.error || "Booking failed");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <><Navbar /><div className="text-center py-32 text-cream-muted pt-28">Loading...</div></>;
  if (!chef) return <><Navbar /><div className="text-center py-32 text-cream-muted pt-28">Chef not found</div></>;

  return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-28 pb-16">
        {/* Chef Header */}
        <div className="bg-dark-card border border-dark-border p-8 mb-8">
          <div className="flex items-start gap-6">
            {chef.profileImageUrl ? (
              <div className="w-24 h-24 rounded-full overflow-hidden shrink-0 relative">
                <Image src={chef.profileImageUrl} alt={chef.user.name} fill className="object-cover" sizes="96px" />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                <span className="text-4xl">👨‍🍳</span>
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold tracking-tight">{chef.user.name}</h1>
                <span className={`text-xs font-bold px-3 py-1 tracking-wider uppercase ${tierBadgeColors[chef.tier] || tierBadgeColors.SOUS_CHEF}`}>
                  {chef.tierEmoji} {chef.tierLabel}
                </span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <StarRating rating={chef.avgRating} />
                <span className="text-cream-muted">
                  {chef.avgRating} ({chef.reviewCount} reviews)
                </span>
                <span className="text-xs text-cream-muted/50">{chef.completedJobs} jobs completed</span>
                <span className="text-2xl font-bold text-gold ml-auto">
                  ${chef.hourlyRate}/hr
                </span>
              </div>
              <p className="text-cream-muted mb-2">
                {chef.cuisineType && (
                  <span className="text-gold text-xs font-medium tracking-wider uppercase">{chef.cuisineType}</span>
                )}
                {chef.cuisineType && <br />}
                <span className="text-cream-muted/60 text-xs">Specialty:</span> {chef.specialtyDish}
              </p>
              {chef.bio && <p className="text-cream-muted/70 mt-3 leading-relaxed">{chef.bio}</p>}

              {/* Trust Badges */}
              <div className="flex flex-wrap gap-2 mt-4">
                {chef.bgCheckPassed && (
                  <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 font-medium">✓ Background Checked</span>
                )}
                {chef.insuranceVerified && (
                  <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 font-medium">🛡️ Insured</span>
                )}
                {chef.bgCheckPassed && chef.insuranceVerified && chef.completedJobs >= 5 && (
                  <span className="text-xs bg-gold/10 text-gold border border-gold/20 px-3 py-1 font-medium">⭐ Foodies Verified</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Specials */}
        {chef.specials.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 tracking-tight">Chef&apos;s Specials</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {[...chef.specials].sort((a, b) => (b.isWeeklySpecial ? 1 : 0) - (a.isWeeklySpecial ? 1 : 0)).map((special) => (
                <div key={special.id} className={`bg-dark-card border overflow-hidden transition-colors relative ${
                  special.isWeeklySpecial ? "border-gold/60 ring-1 ring-gold/30 hover:border-gold" : "border-dark-border hover:border-gold/30"
                }`}>
                  {special.isWeeklySpecial && (
                    <div className="absolute top-2 left-2 bg-gold text-dark px-3 py-1 text-xs font-bold uppercase tracking-wider z-10">
                      ⭐ Weekly Special
                    </div>
                  )}
                  {special.imageUrl && (
                    <div className="h-36 relative">
                      <Image src={special.imageUrl} alt={special.name} fill className="object-cover" sizes="300px" />
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="font-semibold text-lg mb-1">{special.name}</h3>
                    <p className="text-cream-muted text-sm mb-3 leading-relaxed">{special.description}</p>
                    {special.price != null && special.price > 0 && <p className="text-gold font-bold">${special.price.toFixed(2)}</p>}
                    {special.estimatedGroceryCost != null && special.estimatedGroceryCost > 0 && (
                      <p className="text-cream-muted text-xs mt-1">🛒 Groceries: ~${special.estimatedGroceryCost.toFixed(2)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trust Banner */}
        <div className="bg-green-500/5 border border-green-500/15 px-6 py-3 mb-8 flex items-center gap-3">
          <span className="text-green-400 text-lg">🔒</span>
          <p className="text-green-400/80 text-sm">All chefs are vetted and payments are securely held in escrow until your experience is complete.</p>
        </div>

        {/* Book button */}
        {success ? (
          <div className="bg-gold/10 border border-gold/30 text-gold p-6 text-center mb-8">
            <p className="text-lg font-medium">{success}</p>
          </div>
        ) : (
          <button
            onClick={() => setBookingOpen(!bookingOpen)}
            className="w-full bg-gold text-dark py-4 font-semibold text-sm tracking-[0.15em] uppercase hover:bg-gold-light transition-colors mb-8"
          >
            {bookingOpen ? "Close Booking Form" : `Book ${chef.user.name}`}
          </button>
        )}

        {/* Booking Form */}
        {bookingOpen && (
          <div className="bg-dark-card border border-dark-border p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6 tracking-tight">Reserve Your Experience</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Date *</label>
                <input type="date" className="w-full border border-dark-border bg-dark px-4 py-3 text-cream" value={booking.date} onChange={(e) => setBooking({ ...booking, date: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Time *</label>
                <input type="time" className="w-full border border-dark-border bg-dark px-4 py-3 text-cream" value={booking.time} onChange={(e) => setBooking({ ...booking, time: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Guest Count *</label>
                <input type="number" min="1" className="w-full border border-dark-border bg-dark px-4 py-3 text-cream" value={booking.guestCount} onChange={(e) => setBooking({ ...booking, guestCount: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Location *</label>
                <input type="text" className="w-full border border-dark-border bg-dark px-4 py-3 text-cream" placeholder="Your address" value={booking.address} onChange={(e) => setBooking({ ...booking, address: e.target.value })} />
              </div>
            </div>

            {chef.specials.length > 0 && (
              <div className="mb-6">
                <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-3">Which dishes interest you?</label>
                <div className="flex flex-wrap gap-3">
                  {chef.specials.map((s) => {
                    const selected = selectedItems.includes(s.name);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleItem(s.name)}
                        className={`px-5 py-2.5 border text-sm font-medium transition-all ${selected ? "bg-gold text-dark border-gold" : "bg-transparent text-cream border-dark-border hover:border-gold/40"}`}
                      >
                        {s.name} {selected ? "✓" : "+"}
                      </button>
                    );
                  })}
                </div>
                <p className="text-cream-muted/40 text-[10px] mt-2">Select dishes you&apos;d like — the chef will include groceries in their prep.</p>
              </div>
            )}

            {/* Custom Dish Request — Chef and Master Chef only */}
            {chef.tier !== "SOUS_CHEF" && (
              <div className="mb-6">
                {!showCustomDish ? (
                  <button
                    type="button"
                    onClick={() => setShowCustomDish(true)}
                    className="w-full border border-dashed border-gold/30 bg-gold/5 px-5 py-3 text-sm text-gold hover:bg-gold/10 transition-colors"
                  >
                    ✨ Request a Custom Dish
                  </button>
                ) : (
                  <div className="border border-gold/30 bg-gold/5 p-5 space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium tracking-wider uppercase text-gold">✨ Custom Dish Request</span>
                      <button type="button" onClick={() => { setShowCustomDish(false); setCustomDish({ name: "", description: "" }); }} className="text-cream-muted text-xs hover:text-cream">Cancel</button>
                    </div>
                    <input
                      type="text"
                      placeholder="Dish name (e.g. Lobster Thermidor)"
                      className="w-full border border-dark-border bg-dark px-4 py-3 text-cream text-sm"
                      value={customDish.name}
                      onChange={(e) => setCustomDish({ ...customDish, name: e.target.value })}
                    />
                    <textarea
                      placeholder="Describe what you&apos;d like — ingredients, style, dietary needs..."
                      className="w-full border border-dark-border bg-dark px-4 py-3 h-20 text-cream text-sm"
                      value={customDish.description}
                      onChange={(e) => setCustomDish({ ...customDish, description: e.target.value })}
                    />
                    <p className="text-cream-muted/60 text-[11px]">The chef will review your request and send a grocery list with estimated costs for your approval.</p>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Special Requests</label>
              <textarea className="w-full border border-dark-border bg-dark px-4 py-3 h-20 text-cream" placeholder="Dietary restrictions, allergies, preferences..." value={booking.specialRequests} onChange={(e) => setBooking({ ...booking, specialRequests: e.target.value })} />
            </div>

            {/* Price breakdown */}
            <div className="bg-dark border border-dark-border p-6 mt-6 mb-6">
              <h3 className="font-semibold mb-4 text-sm tracking-wider uppercase text-cream-muted">Price Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-cream-muted">Chef fee — {chef.user.name}</span>
                  <span>${chef.hourlyRate}</span>
                </div>
                {selectedItems.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-cream-muted">Selected dishes</span>
                    <span className="text-cream-muted text-xs">{selectedItems.join(", ")}</span>
                  </div>
                )}
                <div className="flex justify-between text-cream-muted/50">
                  <span>Service fee (8%)</span>
                  <span>${clientServiceFee}</span>
                </div>
                <p className="text-cream-muted/30 text-[10px]">Service fee helps cover platform operations, escrow, and customer support.</p>
                <div className="flex justify-between font-bold text-lg border-t border-dark-border pt-3 mt-3 text-gold">
                  <span>Total</span>
                  <span>${total}</span>
                </div>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            {paymentStep && clientSecret ? (
              <div className="mt-6">
                <h3 className="font-semibold mb-4 text-sm tracking-wider uppercase text-cream-muted">Payment</h3>
                <StripePayment
                  clientSecret={clientSecret}
                  total={total}
                  onSuccess={() => {
                    setSuccess("Payment successful! Your booking is confirmed.");
                    setBookingOpen(false);
                    setPaymentStep(false);
                    trackInterest({ signalType: "BOOK", chefProfileId: id as string, cuisineType: chef?.cuisineType || undefined });
                  }}
                  onError={(msg) => setError(msg)}
                />
              </div>
            ) : (
              <button
                onClick={handleBook}
                disabled={submitting || !booking.date || !booking.time || !booking.address}
                className="w-full bg-gold text-dark py-4 font-semibold text-sm tracking-[0.15em] uppercase hover:bg-gold-light transition-colors disabled:opacity-40"
              >
                {submitting ? "Confirming..." : `Confirm Booking — $${total}`}
              </button>
            )}
          </div>
        )}

        {/* Reviews */}
        <div>
          <h2 className="text-2xl font-bold mb-6 tracking-tight">Reviews ({chef.reviewCount})</h2>
          {chef.reviews.length === 0 ? (
            <p className="text-cream-muted">No reviews yet.</p>
          ) : (
            <div className="space-y-4">
              {chef.reviews.map((review) => (
                <div key={review.id} className="bg-dark-card border border-dark-border p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <StarRating rating={review.rating} size="sm" />
                    <span className="font-medium">{review.client.name}</span>
                    <span className="text-cream-muted/50 text-sm">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {review.comment && <p className="text-cream-muted leading-relaxed">{review.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
