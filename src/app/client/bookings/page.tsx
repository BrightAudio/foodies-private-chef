"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import StarRating from "@/components/StarRating";
import StarInput from "@/components/StarInput";

interface Booking {
  id: string;
  date: string;
  time: string;
  guestCount: number;
  address: string;
  generalArea: string | null;
  subtotal: number;
  platformFee: number;
  total: number;
  status: string;
  jobStatus: string;
  addressRevealedAt: string | null;
  paymentStatus: string;
  chefProfileId: string;
  chefProfile: {
    id: string;
    specialtyDish: string;
    user: { name: string };
  };
  items: { name: string; price: number; quantity: number }[];
  review: { rating: number; comment: string | null } | null;
  tip: { amount: number; message: string | null } | null;
}

export default function ClientBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tippingId, setTippingId] = useState<string | null>(null);
  const [tipAmount, setTipAmount] = useState("");
  const [tipMessage, setTipMessage] = useState("");
  const [cancelPreview, setCancelPreview] = useState<{ id: string; feePercent: number; fee: number; refundAmount: number; policy: string } | null>(null);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [incidentType, setIncidentType] = useState("SAFETY");
  const [incidentSeverity, setIncidentSeverity] = useState("MEDIUM");
  const [incidentDescription, setIncidentDescription] = useState("");

  // Dish request state
  interface DishReq {
    id: string;
    dishName: string;
    description: string;
    status: string;
    groceryItems: string | null;
    estimatedGroceryCost: number | null;
    chefNotes: string | null;
    bookingId: string;
  }
  const [dishRequests, setDishRequests] = useState<DishReq[]>([]);

  useEffect(() => {
    fetchBookings();
    fetchDishRequests();
  }, []);

  const fetchDishRequests = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("/api/dish-requests", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setDishRequests(await res.json());
    } catch { /* ignore */ }
  };

  const respondToDishRequest = async (requestId: string, action: "approve" | "reject") => {
    const token = localStorage.getItem("token");
    if (!token) return;
    await fetch("/api/dish-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ requestId, action }),
    });
    fetchDishRequests();
  };

  const fetchBookings = async () => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/login"; return; }
    const res = await fetch("/api/bookings?limit=50", { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setBookings(data.bookings || data);
    setLoading(false);
  };

  const cancelBooking = async (id: string) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/bookings/${id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setCancelPreview(null);
      fetchBookings();
    }
  };

  const previewCancel = async (id: string) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/bookings/${id}/cancel`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setCancelPreview({ id, ...data });
      }
    } catch { /* ignore */ }
  };

  const submitTip = async (bookingId: string) => {
    const token = localStorage.getItem("token");
    if (!tipAmount || Number(tipAmount) <= 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bookingId, amount: Number(tipAmount), message: tipMessage || undefined }),
      });
      if (!res.ok) { const d = await res.json(); alert(d.error); return; }
      setTippingId(null);
      setTipAmount("");
      setTipMessage("");
      fetchBookings();
    } finally {
      setSubmitting(false);
    }
  };

  const submitReview = async (bookingId: string, chefProfileId: string) => {
    const token = localStorage.getItem("token");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/chefs/${chefProfileId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bookingId, rating: reviewRating, comment: reviewComment }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error);
        return;
      }
      setReviewingId(null);
      setReviewRating(5);
      setReviewComment("");
      fetchBookings();
    } finally {
      setSubmitting(false);
    }
  };

  const submitIncident = async (bookingId: string, chefUserId?: string) => {
    const token = localStorage.getItem("token");
    if (!incidentDescription.trim()) { alert("Please describe the issue"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          bookingId,
          reportedUserId: chefUserId || undefined,
          type: incidentType,
          severity: incidentSeverity,
          description: incidentDescription.trim(),
        }),
      });
      if (!res.ok) { const d = await res.json(); alert(d.error); return; }
      setReportingId(null);
      setIncidentDescription("");
      setIncidentType("SAFETY");
      setIncidentSeverity("MEDIUM");
      alert("Report submitted. Our team will review it shortly.");
    } finally { setSubmitting(false); }
  };

  const statusColors: Record<string, string> = {
    PENDING: "bg-gold/10 text-gold",
    CONFIRMED: "bg-blue-500/10 text-blue-400",
    PENDING_COMPLETION: "bg-amber-500/10 text-amber-400",
    COMPLETED: "bg-emerald-500/10 text-emerald-400",
    CANCELLED: "bg-red-500/10 text-red-400",
  };

  const jobStatusMessages: Record<string, string> = {
    SCHEDULED: "Your chef will be on their way soon",
    EN_ROUTE: "🚗 Your chef is on the way!",
    ARRIVED: "✅ Your chef has arrived",
    IN_PROGRESS: "🍳 Your chef is cooking",
    COMPLETED: "✨ Experience complete",
  };

  const confirmCompletion = async (bookingId: string) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "CONFIRM_COMPLETE" }),
      });
      if (res.ok) {
        fetchBookings();
        setReviewingId(bookingId); // Auto-prompt review
      } else {
        const data = await res.json();
        alert(data.error || "Failed to confirm");
      }
    } catch { alert("Failed to confirm completion"); }
  };

  return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-28 pb-16">
        <h1 className="text-3xl font-bold mb-6 tracking-tight">My Bookings</h1>

        {loading ? (
          <p className="text-cream-muted">Loading...</p>
        ) : bookings.length === 0 ? (
          <div className="text-center py-16 bg-dark-card border border-dark-border">
            <p className="text-cream-muted text-lg mb-4">No bookings yet.</p>
            <Link href="/browse" className="text-gold font-medium hover:text-gold-light transition-colors">
              Browse Chefs →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => (
              <div key={b.id} className="bg-dark-card border border-dark-border p-6">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <Link
                      href={`/chef/${b.chefProfileId}`}
                      className="font-semibold text-lg hover:text-gold transition-colors"
                    >
                      Chef {b.chefProfile.user.name}
                    </Link>
                    <p className="text-sm text-cream-muted">
                      {new Date(b.date).toLocaleDateString()} at {b.time} · {b.guestCount} guests
                    </p>
                    {b.status === "CONFIRMED" && b.jobStatus && b.jobStatus !== "SCHEDULED" && (
                      <p className="text-sm font-semibold mt-1 text-gold">
                        {jobStatusMessages[b.jobStatus] || b.jobStatus}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 text-xs font-bold tracking-wider ${statusColors[b.status]}`}>
                      {b.status}
                    </span>
                    {b.paymentStatus !== "UNPAID" && (
                      <span className={`inline-block px-2 py-0.5 text-xs font-bold tracking-wider mt-1 ${
                        b.paymentStatus === "PAID" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        b.paymentStatus === "REFUNDED" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                        "bg-gold/10 text-gold border border-gold/20"
                      }`}>
                        {b.paymentStatus}
                      </span>
                    )}
                    <p className="text-lg font-bold mt-1 text-gold">${b.total}</p>
                  </div>
                </div>

                {b.items.length > 0 && (
                  <p className="text-sm text-cream-muted mb-3">
                    {b.items.map((i) => i.name).join(", ")}
                  </p>
                )}

                {/* Review */}
                {b.review && (
                  <div className="bg-dark border border-dark-border p-4 mb-3">
                    <StarRating rating={b.review.rating} size="sm" />
                    {b.review.comment && <p className="text-sm text-cream-muted mt-1">{b.review.comment}</p>}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 flex-wrap items-center">
                  {b.status === "PENDING_COMPLETION" && (
                    <div className="w-full bg-amber-500/10 border border-amber-500/30 p-4 mb-2">
                      <p className="text-sm text-amber-300 mb-3">
                        Your chef has marked this experience as complete. Please confirm to release payment.
                      </p>
                      <button
                        onClick={() => confirmCompletion(b.id)}
                        className="bg-emerald-600 text-white px-6 py-2.5 text-sm font-semibold tracking-wider uppercase hover:bg-emerald-500 transition-colors"
                      >
                        ✅ Confirm Experience Complete
                      </button>
                    </div>
                  )}
                  {(b.status === "PENDING" || b.status === "CONFIRMED") && (
                    <button
                      onClick={() => previewCancel(b.id)}
                      className="text-red-400 text-sm font-medium hover:text-red-300 transition-colors"
                    >
                      Cancel Booking
                    </button>
                  )}
                  {b.status === "COMPLETED" && !b.review && (
                    <button
                      onClick={() => setReviewingId(b.id)}
                      className="bg-gold text-dark px-5 py-2 text-sm font-semibold tracking-wider uppercase hover:bg-gold-light transition-colors"
                    >
                      Leave a Review
                    </button>
                  )}
                  {b.status === "COMPLETED" && !b.tip && (
                    <button
                      onClick={() => setTippingId(b.id)}
                      className="border border-gold/30 text-gold px-5 py-2 text-sm font-semibold tracking-wider uppercase hover:bg-gold/10 transition-colors"
                    >
                      💰 Leave a Tip
                    </button>
                  )}
                  {b.tip && (
                    <span className="text-sm text-emerald-400">💰 Tipped ${b.tip.amount}</span>
                  )}
                  {b.status !== "CANCELLED" && b.status !== "COMPLETED" && b.status !== "PENDING_COMPLETION" && (
                    <a
                      href={`/messages/${b.id}`}
                      className="border border-dark-border px-4 py-2 text-sm font-medium text-cream-muted hover:border-gold/30 hover:text-cream transition-colors"
                    >
                      💬 Message Chef
                    </a>
                  )}
                  {(b.status === "COMPLETED" || b.status === "CANCELLED" || b.status === "PENDING_COMPLETION") && (
                    <button
                      onClick={() => { setReportingId(b.id); setIncidentDescription(""); }}
                      className="text-red-400/70 text-sm font-medium hover:text-red-300 transition-colors"
                    >
                      ⚠ Report Issue
                    </button>
                  )}
                </div>

                {/* Incident Report Form */}
                {reportingId === b.id && (
                  <div className="mt-4 bg-dark border border-red-500/20 p-6 space-y-4">
                    <h4 className="font-semibold text-red-400">Report an Issue</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Issue Type</label>
                        <select
                          value={incidentType}
                          onChange={(e) => setIncidentType(e.target.value)}
                          className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                        >
                          <option value="SAFETY">Safety Concern</option>
                          <option value="FOOD_QUALITY">Food Quality</option>
                          <option value="PROPERTY_DAMAGE">Property Damage</option>
                          <option value="HARASSMENT">Harassment</option>
                          <option value="NO_SHOW">No Show</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Severity</label>
                        <select
                          value={incidentSeverity}
                          onChange={(e) => setIncidentSeverity(e.target.value)}
                          className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="CRITICAL">Critical</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Description</label>
                      <textarea
                        value={incidentDescription}
                        onChange={(e) => setIncidentDescription(e.target.value)}
                        placeholder="Describe the issue in detail..."
                        className="w-full border border-dark-border bg-dark px-4 py-3 h-24 text-cream"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => submitIncident(b.id)}
                        disabled={submitting || !incidentDescription.trim()}
                        className="bg-red-500/10 text-red-400 px-5 py-2 text-sm font-semibold tracking-wider uppercase hover:bg-red-500/20 transition-colors disabled:opacity-40"
                      >
                        {submitting ? "Submitting..." : "Submit Report"}
                      </button>
                      <button
                        onClick={() => setReportingId(null)}
                        className="text-cream-muted text-sm hover:text-cream transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Cancel Fee Preview */}
                {cancelPreview && cancelPreview.id === b.id && (
                  <div className="mt-4 bg-dark border border-red-500/20 p-6 space-y-3">
                    <h4 className="font-semibold text-red-400">Cancellation Policy</h4>
                    <p className="text-sm text-cream-muted">{cancelPreview.policy}</p>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-[10px] text-cream-muted/60 uppercase tracking-wider">Fee</p>
                        <p className="text-lg font-bold text-red-400">{cancelPreview.feePercent}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-cream-muted/60 uppercase tracking-wider">Charge</p>
                        <p className="text-lg font-bold text-red-400">${cancelPreview.fee.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-cream-muted/60 uppercase tracking-wider">Refund</p>
                        <p className="text-lg font-bold text-emerald-400">${cancelPreview.refundAmount.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => cancelBooking(b.id)}
                        className="bg-red-500/10 text-red-400 px-5 py-2 text-sm font-semibold tracking-wider uppercase hover:bg-red-500/20 transition-colors"
                      >
                        Confirm Cancellation
                      </button>
                      <button
                        onClick={() => setCancelPreview(null)}
                        className="text-cream-muted text-sm hover:text-cream transition-colors"
                      >
                        Keep Booking
                      </button>
                    </div>
                  </div>
                )}

                {/* Tip Form */}
                {tippingId === b.id && (
                  <div className="mt-4 bg-dark border border-gold/20 p-6 space-y-4">
                    <h4 className="font-semibold">Leave a Tip for Chef {b.chefProfile.user.name}</h4>
                    <div className="flex gap-2">
                      {[5, 10, 20, 50].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setTipAmount(String(amt))}
                          className={`px-4 py-2 text-sm font-semibold border transition-colors ${tipAmount === String(amt) ? "bg-gold text-dark border-gold" : "border-dark-border text-cream-muted hover:border-gold/30"}`}
                        >
                          ${amt}
                        </button>
                      ))}
                      <input
                        type="number"
                        placeholder="Custom"
                        className="w-24 border border-dark-border bg-dark-card px-3 py-2 text-cream text-sm"
                        value={tipAmount}
                        onChange={(e) => setTipAmount(e.target.value)}
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Optional message..."
                      className="w-full border border-dark-border bg-dark-card px-4 py-3 text-cream"
                      value={tipMessage}
                      onChange={(e) => setTipMessage(e.target.value)}
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => submitTip(b.id)}
                        disabled={submitting || !tipAmount}
                        className="bg-gold text-dark px-5 py-2 text-sm font-semibold tracking-wider uppercase hover:bg-gold-light transition-colors disabled:opacity-40"
                      >
                        {submitting ? "Sending..." : `Send $${tipAmount || 0} Tip`}
                      </button>
                      <button
                        onClick={() => { setTippingId(null); setTipAmount(""); setTipMessage(""); }}
                        className="text-cream-muted text-sm hover:text-cream transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline Review Form */}
                {reviewingId === b.id && (
                  <div className="mt-4 bg-dark border border-gold/20 p-6 space-y-4">
                    <h4 className="font-semibold">Rate Your Experience</h4>
                    <StarInput value={reviewRating} onChange={setReviewRating} />
                    <textarea
                      className="w-full border border-dark-border bg-dark-card px-4 py-3 h-20 text-cream"
                      placeholder="Tell others about your experience..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => submitReview(b.id, b.chefProfileId)}
                        disabled={submitting}
                        className="bg-gold text-dark px-5 py-2 text-sm font-semibold tracking-wider uppercase hover:bg-gold-light transition-colors disabled:opacity-40"
                      >
                        {submitting ? "Submitting..." : "Submit Review"}
                      </button>
                      <button
                        onClick={() => setReviewingId(null)}
                        className="text-cream-muted text-sm hover:text-cream transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Custom Dish Requests for this booking */}
                {dishRequests.filter((r) => r.bookingId === b.id && r.status !== "CANCELLED").map((r) => (
                  <div key={r.id} className={`mt-4 border p-4 ${r.status === "QUOTED" ? "border-gold/40 bg-gold/5" : "border-dark-border bg-dark"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">✨ Custom: {r.dishName}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider ${
                        r.status === "PENDING" ? "text-amber-400 bg-amber-500/10" :
                        r.status === "QUOTED" ? "text-gold bg-gold/10" :
                        r.status === "APPROVED" ? "text-emerald-400 bg-emerald-500/10" :
                        "text-red-400 bg-red-500/10"
                      }`}>{r.status}</span>
                    </div>
                    <p className="text-cream-muted text-xs mb-2">{r.description}</p>

                    {r.status === "PENDING" && (
                      <p className="text-cream-muted/50 text-xs">Waiting for chef to send grocery quote...</p>
                    )}

                    {r.status === "QUOTED" && (
                      <div className="space-y-3">
                        <div className="bg-dark border border-dark-border p-3">
                          <p className="text-sm font-medium text-gold mb-2">🛒 Grocery List — ${r.estimatedGroceryCost?.toFixed(2)}</p>
                          {r.groceryItems && (() => {
                            try {
                              const items = JSON.parse(r.groceryItems) as { item: string; qty: string; estCost: number }[];
                              return (
                                <div className="space-y-1">
                                  {items.map((g, i) => (
                                    <div key={i} className="flex justify-between text-xs text-cream-muted">
                                      <span>{g.item} {g.qty && `(${g.qty})`}</span>
                                      <span>${Number(g.estCost).toFixed(2)}</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            } catch { return null; }
                          })()}
                          {r.chefNotes && <p className="text-xs text-cream-muted/60 mt-2 italic">{r.chefNotes}</p>}
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => respondToDishRequest(r.id, "approve")}
                            className="bg-gold text-dark px-5 py-2 text-sm font-semibold tracking-wider uppercase hover:bg-gold-light transition-colors"
                          >
                            ✓ Approve Groceries
                          </button>
                          <button
                            onClick={() => respondToDishRequest(r.id, "reject")}
                            className="text-red-400 text-sm font-medium hover:text-red-300 transition-colors"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    )}

                    {r.status === "APPROVED" && (
                      <p className="text-emerald-400 text-xs">✓ Approved — chef will handle groceries (~${r.estimatedGroceryCost?.toFixed(2)})</p>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
