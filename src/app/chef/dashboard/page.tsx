"use client";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import StarRating from "@/components/StarRating";

const TIER_INFO: Record<string, { label: string; emoji: string; color: string; badgeColor: string }> = {
  SOUS_CHEF: { label: "Sous Chef", emoji: "🔪", color: "text-blue-400", badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20" },
  CHEF: { label: "Chef", emoji: "👨‍🍳", color: "text-gold", badgeColor: "bg-gold/10 text-gold border border-gold/20" },
  MASTER_CHEF: { label: "Master Chef", emoji: "⭐", color: "text-purple-400", badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20" },
};

const TIER_REQUIREMENTS: Record<string, { completedJobs: number; minRating: number }> = {
  CHEF: { completedJobs: 15, minRating: 4.0 },
  MASTER_CHEF: { completedJobs: 50, minRating: 4.5 },
};

const TIER_CAPS: Record<string, number> = {
  SOUS_CHEF: 60,
  CHEF: 125,
  MASTER_CHEF: Infinity,
};

interface Booking {
  id: string;
  date: string;
  time: string;
  guestCount: number;
  address: string;
  generalArea: string | null;
  specialRequests: string | null;
  subtotal: number;
  platformFee: number;
  total: number;
  status: string;
  jobStatus: string;
  addressRevealedAt: string | null;
  paymentStatus: string;
  client: { name: string; email: string; phone: string | null };
  items: { name: string; price: number; quantity: number }[];
  review: { rating: number; comment: string | null } | null;
}

interface TierData {
  tier: string;
  completedJobs: number;
  avgRating: number;
  hourlyRate: number;
}

interface VerificationData {
  verificationStatus: string;
  bgCheckStatus: string;
  idVerificationStatus: string;
  isApproved: boolean;
}

interface GalleryImage {
  id: string;
  url: string;
  caption: string | null;
  sortOrder: number;
}

interface BlockedDate {
  id: string;
  date: string;
  reason: string | null;
}

export default function ChefDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [tierData, setTierData] = useState<TierData | null>(null);
  const [verification, setVerification] = useState<VerificationData | null>(null);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [dashTab, setDashTab] = useState<"bookings" | "gallery" | "availability">("bookings");

  useEffect(() => {
    fetchBookings();
    fetchTierData();
    fetchVerification();
    fetchGallery();
    fetchBlockedDates();
  }, [filter]);

  const fetchTierData = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    // Get chef profile via the bookings — we need to find our profile
    try {
      const res = await fetch("/api/chefs?limit=50", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const chefList = data.chefs || data;
      const me = chefList.find((c: { userId: string }) => c.userId === user.id);
      if (me) {
        setTierData({
          tier: me.tier || "SOUS_CHEF",
          completedJobs: me.completedJobs || 0,
          avgRating: me.avgRating || 0,
          hourlyRate: me.hourlyRate || 0,
        });
      }
    } catch { /* ignore */ }
  };

  const fetchVerification = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("/api/chefs/verification", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setVerification(await res.json());
    } catch { /* ignore */ }
  };

  const fetchBookings = async () => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/login"; return; }
    setLoading(true);
    const url = filter ? `/api/bookings?status=${filter}&limit=50` : "/api/bookings?limit=50";
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setBookings(data.bookings || data);
    setLoading(false);
  };

  const updateStatus = async (bookingId: string, status: string) => {
    const token = localStorage.getItem("token");
    await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    fetchBookings();
  };

  const fetchGallery = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("/api/chefs/gallery", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setGallery(await res.json());
    } catch { /* ignore */ }
  };

  const uploadGalleryImage = async (file: File) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setGalleryUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/uploads", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
      if (!uploadRes.ok) return;
      const { url } = await uploadRes.json();
      await fetch("/api/chefs/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url, caption: "", sortOrder: gallery.length }),
      });
      fetchGallery();
    } finally {
      setGalleryUploading(false);
    }
  };

  const deleteGalleryImage = async (id: string) => {
    const token = localStorage.getItem("token");
    await fetch(`/api/chefs/gallery?id=${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    fetchGallery();
  };

  const fetchBlockedDates = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("/api/chefs/availability", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setBlockedDates(await res.json());
    } catch { /* ignore */ }
  };

  const toggleBlockedDate = async (dateStr: string) => {
    const token = localStorage.getItem("token");
    const existing = blockedDates.find((d) => d.date.startsWith(dateStr));
    if (existing) {
      await fetch(`/api/chefs/availability?id=${existing.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    } else {
      await fetch("/api/chefs/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: dateStr }),
      });
    }
    fetchBlockedDates();
  };

  const getCalendarDays = () => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  };

  const updateJobStatus = async (bookingId: string, jobStatus: string) => {
    const token = localStorage.getItem("token");
    await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ jobStatus }),
    });
    fetchBookings();
  };

  const openInMaps = (address: string) => {
    const encoded = encodeURIComponent(address);
    window.open(`https://maps.apple.com/?daddr=${encoded}`, "_blank");
  };

  const statusColors: Record<string, string> = {
    PENDING: "bg-gold/10 text-gold",
    CONFIRMED: "bg-blue-500/10 text-blue-400",
    COMPLETED: "bg-emerald-500/10 text-emerald-400",
    CANCELLED: "bg-red-500/10 text-red-400",
  };

  const jobStatusLabels: Record<string, string> = {
    SCHEDULED: "Scheduled",
    EN_ROUTE: "On the Way",
    ARRIVED: "Arrived",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Job Complete",
  };

  const jobStatusColors: Record<string, string> = {
    SCHEDULED: "bg-dark-border text-cream-muted",
    EN_ROUTE: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    ARRIVED: "bg-gold/10 text-gold border border-gold/20",
    IN_PROGRESS: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
    COMPLETED: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  };

  const earnings = bookings
    .filter((b) => b.status === "COMPLETED")
    .reduce((sum, b) => sum + b.subtotal, 0);

  return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 pt-28 pb-16">
        <h1 className="text-3xl font-bold mb-2 tracking-tight">Chef Dashboard</h1>

        {/* Verification Status Banner */}
        {verification && verification.verificationStatus !== "APPROVED" && (
          <div className={`border p-5 mb-6 ${
            verification.verificationStatus === "REJECTED" ? "bg-red-500/10 border-red-500/30" :
            verification.verificationStatus === "FLAGGED" ? "bg-amber-500/10 border-amber-500/30" :
            "bg-blue-500/10 border-blue-500/30"
          }`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">
                {verification.verificationStatus === "REJECTED" ? "🚫" :
                 verification.verificationStatus === "FLAGGED" ? "⚠️" : "🔄"}
              </span>
              <div>
                <h3 className={`font-bold text-sm ${
                  verification.verificationStatus === "REJECTED" ? "text-red-400" :
                  verification.verificationStatus === "FLAGGED" ? "text-amber-400" :
                  "text-blue-400"
                }`}>
                  {verification.verificationStatus === "NOT_STARTED" && "Verification Not Started"}
                  {verification.verificationStatus === "INFO_SUBMITTED" && "Application Under Review"}
                  {verification.verificationStatus === "IDENTITY_VERIFIED" && "Identity Verified — Awaiting Background Check"}
                  {verification.verificationStatus === "BG_CHECK_RUNNING" && "Background Check In Progress"}
                  {verification.verificationStatus === "FLAGGED" && "Application Flagged for Review"}
                  {verification.verificationStatus === "REJECTED" && "Application Rejected"}
                </h3>
                <p className="text-sm text-cream-muted mt-1">
                  {verification.verificationStatus === "NOT_STARTED" && "Please complete your onboarding to start accepting bookings."}
                  {verification.verificationStatus === "INFO_SUBMITTED" && "We've received your information and documents. Our team is reviewing your application."}
                  {verification.verificationStatus === "IDENTITY_VERIFIED" && "Your identity has been verified. We're now running your background check."}
                  {verification.verificationStatus === "BG_CHECK_RUNNING" && "Your background check is currently being processed. This typically takes 3-5 business days."}
                  {verification.verificationStatus === "FLAGGED" && "Your application has been flagged for additional review. Our team will reach out if more information is needed."}
                  {verification.verificationStatus === "REJECTED" && "Unfortunately, your application was not approved. Please contact support for more information."}
                </p>
                {/* Progress steps */}
                {!["REJECTED", "FLAGGED"].includes(verification.verificationStatus) && (
                  <div className="flex items-center gap-2 mt-3">
                    {[
                      { key: "INFO_SUBMITTED", label: "Info Submitted" },
                      { key: "IDENTITY_VERIFIED", label: "ID Verified" },
                      { key: "BG_CHECK_RUNNING", label: "BG Check" },
                      { key: "APPROVED", label: "Approved" },
                    ].map((step, i) => {
                      const order = ["NOT_STARTED", "INFO_SUBMITTED", "IDENTITY_VERIFIED", "BG_CHECK_RUNNING", "APPROVED"];
                      const current = order.indexOf(verification.verificationStatus);
                      const stepIdx = order.indexOf(step.key);
                      const done = current >= stepIdx;
                      return (
                        <div key={step.key} className="flex items-center gap-2">
                          {i > 0 && <div className={`w-6 h-0.5 ${done ? "bg-gold" : "bg-dark-border"}`} />}
                          <div className={`text-[10px] font-bold px-2 py-1 tracking-wider uppercase ${done ? "bg-gold/20 text-gold" : "bg-dark-border text-cream-muted/50"}`}>
                            {step.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tier Progress Card */}
        {tierData && (() => {
          const info = TIER_INFO[tierData.tier] || TIER_INFO.SOUS_CHEF;
          const nextTier = tierData.tier === "SOUS_CHEF" ? "CHEF" : tierData.tier === "CHEF" ? "MASTER_CHEF" : null;
          const nextReq = nextTier ? TIER_REQUIREMENTS[nextTier] : null;
          const maxRate = TIER_CAPS[tierData.tier] ?? 60;
          return (
            <div className="bg-dark-card border border-dark-border p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold px-4 py-1.5 tracking-wider uppercase ${info.badgeColor}`}>
                    {info.emoji} {info.label}
                  </span>
                  <span className="text-cream-muted text-sm">
                    {maxRate === Infinity ? "No rate cap" : `Up to $${maxRate}/hr`}
                  </span>
                </div>
                <span className="text-sm text-cream-muted">{tierData.completedJobs} jobs · {tierData.avgRating} avg rating</span>
              </div>
              {nextTier && nextReq && (
                <div>
                  <p className="text-xs text-cream-muted mb-2">
                    Progress to <span className={TIER_INFO[nextTier].color}>{TIER_INFO[nextTier].emoji} {TIER_INFO[nextTier].label}</span>
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between text-xs text-cream-muted mb-1">
                        <span>Completed Jobs</span>
                        <span>{tierData.completedJobs}/{nextReq.completedJobs}</span>
                      </div>
                      <div className="h-2 bg-dark-border overflow-hidden">
                        <div className="h-full bg-gold transition-all" style={{ width: `${Math.min(100, (tierData.completedJobs / nextReq.completedJobs) * 100)}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-cream-muted mb-1">
                        <span>Avg Rating</span>
                        <span>{tierData.avgRating}/{nextReq.minRating}</span>
                      </div>
                      <div className="h-2 bg-dark-border overflow-hidden">
                        <div className="h-full bg-gold transition-all" style={{ width: `${Math.min(100, (tierData.avgRating / nextReq.minRating) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {!nextTier && <p className="text-sm text-purple-400">⭐ You&apos;ve reached the highest tier — no rate cap!</p>}
            </div>
          );
        })()}

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-dark-card border border-dark-border p-6">
            <p className="text-xs font-medium tracking-wider uppercase text-cream-muted">Total Bookings</p>
            <p className="text-3xl font-bold mt-1">{bookings.length}</p>
          </div>
          <div className="bg-dark-card border border-dark-border p-6">
            <p className="text-xs font-medium tracking-wider uppercase text-cream-muted">Pending</p>
            <p className="text-3xl font-bold text-gold mt-1">
              {bookings.filter((b) => b.status === "PENDING").length}
            </p>
          </div>
          <div className="bg-dark-card border border-dark-border p-6">
            <p className="text-xs font-medium tracking-wider uppercase text-cream-muted">Earnings (after fees)</p>
            <p className="text-3xl font-bold text-emerald-400 mt-1">${earnings.toFixed(2)}</p>
          </div>
        </div>

        {/* Dashboard Tabs */}
        <div className="flex gap-2 mb-6 border-b border-dark-border pb-4">
          {(["bookings", "gallery", "availability"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setDashTab(t)}
              className={`px-5 py-2.5 text-sm font-semibold tracking-wider uppercase transition-colors ${dashTab === t ? "bg-gold text-dark" : "bg-dark-card border border-dark-border text-cream-muted hover:border-gold/30"}`}
            >
              {t === "bookings" ? "📋 Bookings" : t === "gallery" ? "📸 Gallery" : "📅 Availability"}
            </button>
          ))}
        </div>

        {/* Gallery Tab */}
        {dashTab === "gallery" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Photo Gallery</h2>
              <label className={`cursor-pointer bg-gold text-dark px-5 py-2 text-sm font-semibold tracking-wider uppercase hover:bg-gold-light transition-colors ${galleryUploading ? "opacity-40 pointer-events-none" : ""}`}>
                {galleryUploading ? "Uploading..." : "+ Add Photo"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) uploadGalleryImage(e.target.files[0]); }} />
              </label>
            </div>
            {gallery.length === 0 ? (
              <div className="text-center py-16 bg-dark-card border border-dark-border">
                <p className="text-cream-muted">No photos yet. Add photos of your dishes to attract clients!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {gallery.map((img) => (
                  <div key={img.id} className="relative group bg-dark-card border border-dark-border overflow-hidden">
                    <img src={img.url} alt={img.caption || "Gallery"} className="w-full h-48 object-cover" />
                    <button
                      onClick={() => deleteGalleryImage(img.id)}
                      className="absolute top-2 right-2 bg-red-500/80 text-white w-7 h-7 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      ✕
                    </button>
                    {img.caption && <p className="p-2 text-xs text-cream-muted truncate">{img.caption}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Availability Tab */}
        {dashTab === "availability" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Manage Availability</h2>
            <p className="text-sm text-cream-muted">Click dates to block/unblock them. Blocked dates will prevent new bookings.</p>
            <div className="bg-dark-card border border-dark-border p-6 max-w-md">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))} className="text-cream-muted hover:text-cream text-lg px-2">←</button>
                <h3 className="font-semibold">{calMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h3>
                <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))} className="text-cream-muted hover:text-cream text-lg px-2">→</button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                  <div key={d} className="text-[10px] font-bold text-cream-muted/60 uppercase tracking-wider py-1">{d}</div>
                ))}
                {getCalendarDays().map((day, i) => {
                  if (day === null) return <div key={`empty-${i}`} />;
                  const dateStr = `${calMonth.getFullYear()}-${String(calMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const isBlocked = blockedDates.some((d) => d.date.startsWith(dateStr));
                  const isPast = new Date(dateStr) < new Date(new Date().toDateString());
                  return (
                    <button
                      key={day}
                      onClick={() => !isPast && toggleBlockedDate(dateStr)}
                      disabled={isPast}
                      className={`py-2 text-sm font-medium transition-colors ${
                        isPast ? "text-cream-muted/20 cursor-not-allowed" :
                        isBlocked ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30" :
                        "hover:bg-gold/10 text-cream"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-4 text-xs text-cream-muted">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500/20 border border-red-500/30 inline-block" /> Blocked</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 inline-block" /> Available</span>
              </div>
            </div>
            {blockedDates.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-cream-muted mb-2">Blocked Dates ({blockedDates.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {blockedDates.map((d) => (
                    <span key={d.id} className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1 text-xs font-medium">
                      {new Date(d.date).toLocaleDateString()}
                      <button onClick={() => toggleBlockedDate(d.date.split("T")[0])} className="ml-2 hover:text-red-300">✕</button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bookings Tab */}
        {dashTab === "bookings" && (
          <>
        {/* Filter */}
        <div className="flex gap-2 mb-6">
          {["", "PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-5 py-2.5 text-sm font-medium transition-colors ${filter === s ? "bg-gold text-dark" : "bg-dark-card border border-dark-border text-cream-muted hover:border-gold/30"}`}
            >
              {s || "All"}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-cream-muted">Loading bookings...</p>
        ) : bookings.length === 0 ? (
          <div className="text-center py-16 bg-dark-card border border-dark-border">
            <p className="text-cream-muted text-lg">No bookings yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => (
              <div key={b.id} className="bg-dark-card border border-dark-border p-6">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{b.client.name}</h3>
                    <p className="text-sm text-cream-muted">
                      {new Date(b.date).toLocaleDateString()} at {b.time} · {b.guestCount} guests
                    </p>
                    <p className="text-sm text-cream-muted/70">
                      {b.addressRevealedAt || b.jobStatus !== "SCHEDULED"
                        ? b.address
                        : b.generalArea || "📍 Address revealed when you start the job"}
                    </p>
                    {b.status === "CONFIRMED" && b.jobStatus && (
                      <span className={`inline-block px-2 py-0.5 text-xs font-bold tracking-wider mt-1 ${jobStatusColors[b.jobStatus] || ""}`}>
                        {jobStatusLabels[b.jobStatus] || b.jobStatus}
                      </span>
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
                    <p className="text-xs text-cream-muted/50">You earn: ${b.subtotal}</p>
                  </div>
                </div>

                {b.items.length > 0 && (
                  <div className="text-sm text-cream-muted mb-3">
                    <span className="font-medium text-cream">Items:</span>{" "}
                    {b.items.map((i) => i.name).join(", ")}
                  </div>
                )}

                {b.specialRequests && (
                  <p className="text-sm text-cream-muted/70 mb-3">
                    <span className="font-medium text-cream">Requests:</span> {b.specialRequests}
                  </p>
                )}

                {b.review && (
                  <div className="bg-dark border border-dark-border p-4 mb-3">
                    <StarRating rating={b.review.rating} size="sm" />
                    {b.review.comment && <p className="text-sm text-cream-muted mt-1">{b.review.comment}</p>}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 flex-wrap items-center">
                  {b.status === "PENDING" && (
                    <button
                      onClick={() => updateStatus(b.id, "CONFIRMED")}
                      className="bg-gold text-dark px-5 py-2 text-sm font-semibold tracking-wider uppercase hover:bg-gold-light transition-colors"
                    >
                      Confirm Booking
                    </button>
                  )}

                  {b.status === "CONFIRMED" && b.jobStatus === "SCHEDULED" && (
                    <button
                      onClick={() => updateJobStatus(b.id, "EN_ROUTE")}
                      className="bg-gold text-dark px-5 py-2 text-sm font-semibold tracking-wider uppercase hover:bg-gold-light transition-colors"
                    >
                      🚗 Start Job — On the Way
                    </button>
                  )}

                  {b.status === "CONFIRMED" && b.jobStatus === "EN_ROUTE" && (
                    <>
                      {b.address && b.addressRevealedAt && (
                        <button
                          onClick={() => openInMaps(b.address)}
                          className="bg-blue-600 text-white px-5 py-2 text-sm font-semibold tracking-wider uppercase hover:bg-blue-500 transition-colors"
                        >
                          📍 Open in Maps
                        </button>
                      )}
                      <button
                        onClick={() => updateJobStatus(b.id, "ARRIVED")}
                        className="bg-gold text-dark px-5 py-2 text-sm font-semibold tracking-wider uppercase hover:bg-gold-light transition-colors"
                      >
                        ✅ I&apos;ve Arrived
                      </button>
                    </>
                  )}

                  {b.status === "CONFIRMED" && b.jobStatus === "ARRIVED" && (
                    <button
                      onClick={() => updateJobStatus(b.id, "IN_PROGRESS")}
                      className="bg-purple-600 text-white px-5 py-2 text-sm font-semibold tracking-wider uppercase hover:bg-purple-500 transition-colors"
                    >
                      🍳 Begin Cooking
                    </button>
                  )}

                  {b.status === "CONFIRMED" && b.jobStatus === "IN_PROGRESS" && (
                    <button
                      onClick={() => { updateJobStatus(b.id, "COMPLETED"); updateStatus(b.id, "COMPLETED"); }}
                      className="bg-emerald-600 text-white px-5 py-2 text-sm font-semibold tracking-wider uppercase hover:bg-emerald-500 transition-colors"
                    >
                      ✨ Complete Job
                    </button>
                  )}

                  {b.status !== "CANCELLED" && b.status !== "COMPLETED" && (
                    <a
                      href={`/messages/${b.id}`}
                      className="border border-dark-border px-4 py-2 text-sm font-medium text-cream-muted hover:border-gold/30 hover:text-cream transition-colors"
                    >
                      💬 Message Client
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
          </>
        )}
      </div>
    </>
  );
}
