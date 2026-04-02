"use client";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import StarRating from "@/components/StarRating";

interface AdminChef {
  id: string;
  userId: string;
  servSafeCertNumber: string;
  servSafeCertExpiry: string;
  generalLiabilityPolicy: string;
  generalLiabilityExpiry: string;
  productLiabilityPolicy: string;
  productLiabilityExpiry: string;
  specialtyDish: string;
  cuisineType: string | null;
  hourlyRate: number;
  isApproved: boolean;
  isActive: boolean;
  bgCheckStatus: string;
  bgCheckFullName: string | null;
  bgCheckMiddleName: string | null;
  bgCheckDOB: string | null;
  bgCheckSSNLast4: string | null;
  bgCheckSSN: string | null;
  bgCheckAddress: string | null;
  bgCheckCity: string | null;
  bgCheckState: string | null;
  bgCheckZipCode: string | null;
  bgCheckPreviousAddress: string | null;
  bgCheckConsent: boolean;
  bgCheckSubmittedAt: string | null;
  bgCheckClearedAt: string | null;
  vehicleLicensePlate: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleColor: string | null;
  tier: string;
  completedJobs: number;
  tierOverride: boolean;
  avgRating: number;
  reviewCount: number;
  verificationStatus: string;
  idVerificationStatus: string;
  governmentIdUrl: string | null;
  selfieUrl: string | null;
  governmentIdType: string | null;
  fcraConsentSignature: string | null;
  fcraConsentTimestamp: string | null;
  termsAcceptedAt: string | null;
  antiPoachingAcceptedAt: string | null;
  driversLicenseNumber: string | null;
  willTravelToHomes: boolean;
  insuranceDocUrl: string | null;
  insuranceExpiry: string | null;
  insuranceVerified: boolean;
  insuranceStatus: string;
  insuranceProvider: string | null;
  insurancePolicyNumber: string | null;
  activationStatus: string;
  trustScore: number;
  user: { name: string; email: string };
  earnings: {
    totalJobs: number;
    grossRevenue: number;
    platformFees: number;
    chefEarnings: number;
    ytdEarnings: number;
    ytdPlatformFees: number;
    ytdJobs: number;
    needs1099: boolean;
  };
  incidents: { type: string; severity: string; status: string; description: string; createdAt: string }[];
  praise: { rating: number; comment: string; date: string; clientName: string }[];
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  createdAt: string;
  chefProfile: { id: string; isApproved: boolean; tier: string } | null;
  _count: { bookingsAsClient: number; reviews: number };
}

interface AdminBooking {
  id: string;
  status: string;
  jobStatus: string | null;
  date: string;
  time: string;
  endTime: string | null;
  guestCount: number;
  total: number;
  address: string;
  generalArea: string | null;
  createdAt: string;
  client: { name: string; email: string; phone: string | null };
  chefProfile: {
    specialtyDish: string;
    hourlyRate: number;
    user: { name: string; email: string; phone: string | null };
  };
}

interface AdminTruck {
  id: string;
  name: string;
  cuisineType: string;
  location: string;
  isFeatured: boolean;
  isActive: boolean;
  owner: { name: string; email: string };
  menuItems: { id: string }[];
}

const tierLabels: Record<string, string> = {
  SOUS_CHEF: "🔪 Sous Chef",
  CHEF: "👨‍🍳 Chef",
  MASTER_CHEF: "⭐ Master Chef",
};

const tierBadgeColors: Record<string, string> = {
  SOUS_CHEF: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  CHEF: "bg-gold/10 text-gold border border-gold/20",
  MASTER_CHEF: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
};

const bgStatusColors: Record<string, string> = {
  NOT_SUBMITTED: "text-cream-muted/50 bg-dark-hover",
  PENDING: "text-gold bg-gold/10",
  CLEARED: "text-emerald-400 bg-emerald-500/10",
  FAILED: "text-red-400 bg-red-500/10",
};

const verificationColors: Record<string, string> = {
  NOT_STARTED: "text-cream-muted/50 bg-dark-hover",
  INFO_SUBMITTED: "text-blue-400 bg-blue-500/10",
  IDENTITY_VERIFIED: "text-cyan-400 bg-cyan-500/10",
  BG_CHECK_RUNNING: "text-gold bg-gold/10",
  APPROVED: "text-emerald-400 bg-emerald-500/10",
  FLAGGED: "text-amber-400 bg-amber-500/10",
  REJECTED: "text-red-400 bg-red-500/10",
};

const verificationLabels: Record<string, string> = {
  NOT_STARTED: "Not Started",
  INFO_SUBMITTED: "Info Submitted",
  IDENTITY_VERIFIED: "ID Verified",
  BG_CHECK_RUNNING: "BG Check Running",
  APPROVED: "Approved",
  FLAGGED: "Flagged for Review",
  REJECTED: "Rejected",
};

const bookingStatusColors: Record<string, string> = {
  PENDING: "text-gold bg-gold/10",
  CONFIRMED: "text-blue-400 bg-blue-500/10",
  COMPLETED: "text-emerald-400 bg-emerald-500/10",
  CANCELLED: "text-red-400 bg-red-500/10",
};

const roleColors: Record<string, string> = {
  CLIENT: "text-cream-muted bg-dark-hover",
  CHEF: "text-gold bg-gold/10",
  ADMIN: "text-purple-400 bg-purple-500/10",
};

type Tab = "chefs" | "users" | "bookings" | "trucks" | "analytics" | "audit" | "alerts" | "incidents";

interface AnalyticsData {
  overview: { totalUsers: number; totalChefs: number; approvedChefs: number; totalBookings: number; completedBookings: number; cancelledBookings: number; completionRate: number; recentUsers: number; pendingVerifications: number };
  revenue: { totalRevenue: number; platformRevenue: number; chefPayouts: number; totalTips: number };
  monthlyData: { month: string; bookings: number; revenue: number; platformFee: number }[];
  topChefs: { name: string; tier: string; revenue: number; jobs: number; avgRating: number }[];
  engagement: {
    totalSignals: number;
    recentSignals: number;
    trackedUsers: number;
    avgSignalsPerUser: number;
    signalsByType: { type: string; count: number }[];
    topCuisines: { name: string; count: number }[];
    topDishes: { name: string; count: number }[];
    topCities: { name: string; count: number }[];
    deviceBreakdown: { type: string; count: number }[];
  };
}

interface AuditEntry {
  id: string;
  adminUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  ipAddress: string | null;
  createdAt: string;
}

interface ExpiryAlert {
  chefId: string;
  chefName: string;
  chefEmail: string;
  docType: string;
  expiryDate: string;
  isExpired: boolean;
  daysUntilExpiry: number;
}

interface Incident {
  id: string;
  reporterId: string;
  reportedUserId: string | null;
  bookingId: string | null;
  type: string;
  severity: string;
  description: string;
  status: string;
  adminNotes: string | null;
  createdAt: string;
  resolvedAt: string | null;
  reporter: { id: string; name: string; email: string };
  reportedUser: { id: string; name: string; email: string } | null;
}

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("chefs");
  const [chefs, setChefs] = useState<AdminChef[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [trucks, setTrucks] = useState<AdminTruck[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [expiryAlerts, setExpiryAlerts] = useState<ExpiryAlert[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [expandedIncident, setExpandedIncident] = useState<string | null>(null);
  const [incidentNotes, setIncidentNotes] = useState("");
  const [locationEvidence, setLocationEvidence] = useState<{ checkins: { latitude: number; longitude: number; accuracy: number | null; checkinType: string; createdAt: string }[]; summary: { totalCheckins: number; firstCheckin: string; lastCheckin: string; durationMinutes: number; arrivalRecorded: boolean; departureRecorded: boolean } | null } | null>(null);
  const [locationBookingId, setLocationBookingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedChef, setExpandedChef] = useState<string | null>(null);
  const [chefSection, setChefSection] = useState<Record<string, Set<string>>>({});

  const toggleChefSection = (chefId: string, section: string) => {
    setChefSection(prev => {
      const current = prev[chefId] || new Set<string>();
      const next = new Set(current);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return { ...prev, [chefId]: next };
    });
  };

  const isChefSectionOpen = (chefId: string, section: string) => {
    return chefSection[chefId]?.has(section) || false;
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const getToken = () => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/login"; }
    return token;
  };

  const fetchAll = async () => {
    const token = getToken();
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [chefsRes, usersRes, bookingsRes, trucksRes] = await Promise.all([
        fetch("/api/admin/chefs", { headers }),
        fetch("/api/admin/users", { headers }),
        fetch("/api/admin/bookings", { headers }),
        fetch("/api/admin/food-trucks", { headers }),
      ]);

      if (chefsRes.status === 403) { window.location.href = "/"; return; }

      if (chefsRes.ok) setChefs(await chefsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (bookingsRes.ok) setBookings(await bookingsRes.json());
      if (trucksRes.ok) setTrucks(await trucksRes.json());
    } catch (e) {
      console.error("Failed to fetch admin data:", e);
    }
    setLoading(false);
  };

  const fetchAnalytics = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch("/api/admin/analytics", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setAnalytics(await res.json());
    } catch { /* ignore */ }
  };

  const fetchAuditLogs = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch("/api/admin/audit-log", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setAuditLogs(data.logs); }
    } catch { /* ignore */ }
  };

  const fetchExpiryAlerts = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch("/api/admin/expiry-alerts", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setExpiryAlerts(await res.json());
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (tab === "analytics" && !analytics) fetchAnalytics();
    if (tab === "audit") fetchAuditLogs();
    if (tab === "alerts") fetchExpiryAlerts();
    if (tab === "incidents") fetchIncidents();
  }, [tab]);

  const fetchIncidents = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch("/api/incidents", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setIncidents(await res.json());
    } catch { /* ignore */ }
  };

  const updateIncident = async (id: string, status: string) => {
    const token = getToken();
    if (!token) return;
    await fetch(`/api/incidents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status, adminNotes: incidentNotes || undefined }),
    });
    setExpandedIncident(null);
    setIncidentNotes("");
    fetchIncidents();
  };

  const fetchLocationEvidence = async (bookingId: string) => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/bookings/${bookingId}/location`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setLocationEvidence(data);
        setLocationBookingId(bookingId);
      }
    } catch { /* ignore */ }
  };

  const updateChef = async (id: string, data: { isApproved?: boolean; isActive?: boolean; bgCheckStatus?: string; tier?: string; verificationStatus?: string; idVerificationStatus?: string; insuranceVerified?: boolean; insuranceStatus?: string; activationStatus?: string }) => {
    const token = getToken();
    await fetch(`/api/admin/chefs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    fetchAll();
  };

  const updateTruck = async (id: string, data: { isFeatured?: boolean; isActive?: boolean }) => {
    const token = getToken();
    await fetch(`/api/food-trucks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    fetchAll();
  };

  const pendingBgChecks = chefs.filter((c) => c.bgCheckStatus === "PENDING").length;
  const pendingApprovals = chefs.filter((c) => !c.isApproved).length;
  const activeBookings = bookings.filter((b) => b.status === "CONFIRMED").length;
  const totalRevenue = bookings
    .filter((b) => b.status === "COMPLETED")
    .reduce((sum, b) => sum + (b.total || 0), 0);

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 pt-28 pb-16">
        <h1 className="text-3xl font-bold mb-2 tracking-tight">Admin Dashboard</h1>
        <p className="text-cream-muted mb-8">Manage your platform — chefs, customers, bookings, and food trucks.</p>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-dark-card border border-dark-border p-5">
            <p className="text-[10px] font-medium tracking-wider uppercase text-cream-muted">Total Users</p>
            <p className="text-2xl font-bold mt-1">{users.length}</p>
          </div>
          <div className="bg-dark-card border border-dark-border p-5">
            <p className="text-[10px] font-medium tracking-wider uppercase text-cream-muted">Chefs</p>
            <p className="text-2xl font-bold text-gold mt-1">{chefs.length}</p>
          </div>
          <div className="bg-dark-card border border-dark-border p-5">
            <p className="text-[10px] font-medium tracking-wider uppercase text-cream-muted">Pending Approval</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{pendingApprovals}</p>
          </div>
          <div className="bg-dark-card border border-dark-border p-5">
            <p className="text-[10px] font-medium tracking-wider uppercase text-cream-muted">Total Bookings</p>
            <p className="text-2xl font-bold mt-1">{bookings.length}</p>
          </div>
          <div className="bg-dark-card border border-dark-border p-5">
            <p className="text-[10px] font-medium tracking-wider uppercase text-cream-muted">Active Jobs</p>
            <p className="text-2xl font-bold text-blue-400 mt-1">{activeBookings}</p>
          </div>
          <div className="bg-dark-card border border-dark-border p-5">
            <p className="text-[10px] font-medium tracking-wider uppercase text-cream-muted">Platform Revenue</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">${Math.round(totalRevenue * 0.3)}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-dark-border overflow-x-auto">
          {([
            { key: "chefs" as Tab, label: "Chefs", badge: pendingBgChecks > 0 ? pendingBgChecks : null },
            { key: "users" as Tab, label: "Customers", badge: null },
            { key: "bookings" as Tab, label: "Bookings", badge: activeBookings > 0 ? activeBookings : null },
            { key: "trucks" as Tab, label: "Food Trucks", badge: null },
            { key: "analytics" as Tab, label: "Analytics", badge: null },
            { key: "audit" as Tab, label: "Audit Log", badge: null },
            { key: "incidents" as Tab, label: "Incidents", badge: incidents.filter(i => i.status === "OPEN").length > 0 ? incidents.filter(i => i.status === "OPEN").length : null },
            { key: "alerts" as Tab, label: "Alerts", badge: expiryAlerts.length > 0 ? expiryAlerts.length : null },
          ]).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-6 py-3 text-sm font-medium tracking-wider uppercase transition-colors whitespace-nowrap ${
                tab === t.key ? "text-gold border-b-2 border-gold" : "text-cream-muted hover:text-cream"
              }`}
            >
              {t.label}
              {t.badge && (
                <span className="ml-2 bg-amber-500/20 text-amber-400 px-2 py-0.5 text-xs">{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {loading && (
          <p className="text-cream-muted">Loading...</p>
        )}
        {!loading && tab === "chefs" && (
          /* ========== CHEFS TAB ========== */
          <div className="space-y-4">
            {chefs.length === 0 ? (
              <p className="text-cream-muted text-center py-12">No chefs registered yet.</p>
            ) : (
              chefs.map((chef) => (
                <div key={chef.id} className="bg-dark-card border border-dark-border">
                  {/* Chef Row — click to expand */}
                  <div
                    className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-dark-hover transition-colors"
                    onClick={() => setExpandedChef(expandedChef === chef.id ? null : chef.id)}
                  >
                    <div className="flex items-center gap-4 md:gap-6 flex-1 min-w-0 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{chef.user.name}</p>
                        <p className="text-xs text-cream-muted/50">{chef.user.email}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 tracking-wider uppercase shrink-0 ${tierBadgeColors[chef.tier] || tierBadgeColors.SOUS_CHEF}`}>
                        {tierLabels[chef.tier] || tierLabels.SOUS_CHEF}
                      </span>
                      <span className="text-sm font-medium text-gold shrink-0">${chef.hourlyRate}/hr</span>
                      <span className={`text-xs font-bold px-3 py-1 shrink-0 ${bgStatusColors[chef.bgCheckStatus]}`}>
                        BG: {chef.bgCheckStatus}
                      </span>
                      <span className={`text-xs font-bold px-3 py-1 shrink-0 ${verificationColors[chef.verificationStatus] || verificationColors.NOT_STARTED}`}>
                        {verificationLabels[chef.verificationStatus] || "Not Started"}
                      </span>
                      {chef.isApproved ? (
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 shrink-0">Approved</span>
                      ) : (
                        <span className="text-xs font-bold text-gold bg-gold/10 px-3 py-1 shrink-0">Pending</span>
                      )}
                    </div>
                    <span className="text-cream-muted ml-4 shrink-0">{expandedChef === chef.id ? "▲" : "▼"}</span>
                  </div>

                  {/* Expanded Detail — Foldable Sections */}
                  {expandedChef === chef.id && (
                    <div className="border-t border-dark-border px-6 py-4 space-y-2">

                      {/* ──── 📊 Earnings & 1099 ──── */}
                      <div className="border border-dark-border">
                        <button onClick={() => toggleChefSection(chef.id, "earnings")} className="w-full flex items-center justify-between px-4 py-3 hover:bg-dark-hover transition-colors">
                          <span className="text-sm font-bold tracking-wide">📊 Earnings & 1099</span>
                          <div className="flex items-center gap-3">
                            {chef.earnings.needs1099 && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 font-bold">1099 REQUIRED</span>}
                            <span className="text-gold font-bold text-sm">${chef.earnings.ytdEarnings.toLocaleString()}</span>
                            <span className="text-cream-muted text-xs">{isChefSectionOpen(chef.id, "earnings") ? "▲" : "▼"}</span>
                          </div>
                        </button>
                        {isChefSectionOpen(chef.id, "earnings") && (
                          <div className="border-t border-dark-border px-4 py-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                              <div className="bg-dark p-3 border border-dark-border">
                                <p className="text-[10px] text-cream-muted uppercase tracking-wider">YTD Earnings</p>
                                <p className="text-lg font-bold text-emerald-400">${chef.earnings.ytdEarnings.toLocaleString()}</p>
                              </div>
                              <div className="bg-dark p-3 border border-dark-border">
                                <p className="text-[10px] text-cream-muted uppercase tracking-wider">YTD Platform Fees</p>
                                <p className="text-lg font-bold text-gold">${chef.earnings.ytdPlatformFees.toLocaleString()}</p>
                              </div>
                              <div className="bg-dark p-3 border border-dark-border">
                                <p className="text-[10px] text-cream-muted uppercase tracking-wider">YTD Jobs</p>
                                <p className="text-lg font-bold">{chef.earnings.ytdJobs}</p>
                              </div>
                              <div className="bg-dark p-3 border border-dark-border">
                                <p className="text-[10px] text-cream-muted uppercase tracking-wider">1099 Status</p>
                                <p className={`text-lg font-bold ${chef.earnings.needs1099 ? "text-amber-400" : "text-cream-muted/50"}`}>
                                  {chef.earnings.needs1099 ? "Required" : "Under $600"}
                                </p>
                              </div>
                            </div>
                            <div className="text-xs text-cream-muted/60 space-y-1">
                              <p>All-time: {chef.earnings.totalJobs} jobs · ${chef.earnings.grossRevenue.toLocaleString()} gross · ${chef.earnings.platformFees.toLocaleString()} platform fees · ${chef.earnings.chefEarnings.toLocaleString()} chef net</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ──── ⭐ Praise ──── */}
                      <div className="border border-dark-border">
                        <button onClick={() => toggleChefSection(chef.id, "praise")} className="w-full flex items-center justify-between px-4 py-3 hover:bg-dark-hover transition-colors">
                          <span className="text-sm font-bold tracking-wide">⭐ Praise ({chef.praise.length})</span>
                          <span className="text-cream-muted text-xs">{isChefSectionOpen(chef.id, "praise") ? "▲" : "▼"}</span>
                        </button>
                        {isChefSectionOpen(chef.id, "praise") && (
                          <div className="border-t border-dark-border px-4 py-3 space-y-2 max-h-60 overflow-y-auto">
                            {chef.praise.length === 0 ? (
                              <p className="text-cream-muted/50 text-sm py-2">No praise yet</p>
                            ) : chef.praise.map((p, i) => (
                              <div key={i} className="bg-dark p-3 border border-dark-border text-sm">
                                <div className="flex items-center gap-2 mb-1">
                                  <StarRating rating={p.rating} size="sm" />
                                  <span className="text-cream-muted/50 text-xs">— {p.clientName}</span>
                                  <span className="text-cream-muted/30 text-xs ml-auto">{new Date(p.date).toLocaleDateString()}</span>
                                </div>
                                <p className="text-cream-muted text-xs leading-relaxed">&ldquo;{p.comment}&rdquo;</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* ──── ⚠️ Demerits / Incidents ──── */}
                      <div className="border border-dark-border">
                        <button onClick={() => toggleChefSection(chef.id, "demerits")} className="w-full flex items-center justify-between px-4 py-3 hover:bg-dark-hover transition-colors">
                          <span className="text-sm font-bold tracking-wide">⚠️ Demerits ({chef.incidents.length})</span>
                          {chef.incidents.length > 0 && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 ${
                              chef.incidents.some(i => i.severity === "CRITICAL") ? "bg-red-500/20 text-red-400" :
                              chef.incidents.some(i => i.severity === "HIGH") ? "bg-amber-500/20 text-amber-400" :
                              "bg-dark-border text-cream-muted"
                            }`}>
                              {chef.incidents.filter(i => i.status === "OPEN" || i.status === "INVESTIGATING").length} open
                            </span>
                          )}
                          <span className="text-cream-muted text-xs">{isChefSectionOpen(chef.id, "demerits") ? "▲" : "▼"}</span>
                        </button>
                        {isChefSectionOpen(chef.id, "demerits") && (
                          <div className="border-t border-dark-border px-4 py-3 space-y-2 max-h-60 overflow-y-auto">
                            {chef.incidents.length === 0 ? (
                              <p className="text-cream-muted/50 text-sm py-2">No incidents on record</p>
                            ) : chef.incidents.map((inc, i) => (
                              <div key={i} className={`bg-dark p-3 border text-sm ${
                                inc.severity === "CRITICAL" ? "border-red-500/40" :
                                inc.severity === "HIGH" ? "border-amber-500/40" :
                                "border-dark-border"
                              }`}>
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 ${
                                    inc.severity === "CRITICAL" ? "bg-red-500/20 text-red-400" :
                                    inc.severity === "HIGH" ? "bg-amber-500/20 text-amber-400" :
                                    inc.severity === "MEDIUM" ? "bg-gold/20 text-gold" :
                                    "bg-dark-border text-cream-muted"
                                  }`}>{inc.severity}</span>
                                  <span className="text-cream-muted/60 text-xs">{inc.type.replace(/_/g, " ")}</span>
                                  <span className={`text-[10px] ml-auto px-2 py-0.5 ${
                                    inc.status === "RESOLVED" ? "bg-emerald-500/10 text-emerald-400" :
                                    inc.status === "DISMISSED" ? "bg-dark-border text-cream-muted/50" :
                                    "bg-amber-500/10 text-amber-400"
                                  }`}>{inc.status}</span>
                                  <span className="text-cream-muted/30 text-xs">{new Date(inc.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="text-cream-muted text-xs leading-relaxed">{inc.description}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* ──── 📋 Profile & Compliance ──── */}
                      <div className="border border-dark-border">
                        <button onClick={() => toggleChefSection(chef.id, "compliance")} className="w-full flex items-center justify-between px-4 py-3 hover:bg-dark-hover transition-colors">
                          <span className="text-sm font-bold tracking-wide">📋 Profile & Compliance</span>
                          <span className="text-cream-muted text-xs">{isChefSectionOpen(chef.id, "compliance") ? "▲" : "▼"}</span>
                        </button>
                        {isChefSectionOpen(chef.id, "compliance") && (
                          <div className="border-t border-dark-border px-4 py-4">
                            <div className="grid md:grid-cols-4 gap-6">
                              {/* Profile Info */}
                              <div className="space-y-3">
                                <h4 className="text-xs font-bold tracking-wider uppercase text-cream-muted">Profile</h4>
                                <div className="space-y-1 text-sm">
                                  <p><span className="text-cream-muted/60">Specialty:</span> {chef.specialtyDish}</p>
                                  <p><span className="text-cream-muted/60">Cuisine:</span> {chef.cuisineType || "—"}</p>
                                  <p><span className="text-cream-muted/60">Rate:</span> <span className="text-gold">${chef.hourlyRate}/hr</span></p>
                                  <p><span className="text-cream-muted/60">Jobs:</span> {chef.completedJobs}</p>
                                  <div className="flex items-center gap-1">
                                    <span className="text-cream-muted/60">Rating:</span>
                                    <StarRating rating={chef.avgRating} size="sm" />
                                    <span className="text-cream-muted/50 text-xs">({chef.reviewCount})</span>
                                  </div>
                                </div>
                              </div>
                              {/* Certifications */}
                              <div className="space-y-3">
                                <h4 className="text-xs font-bold tracking-wider uppercase text-cream-muted">Certifications</h4>
                                <div className="space-y-1 text-sm">
                                  <p><span className="text-cream-muted/60">ServSafe:</span> {chef.servSafeCertNumber}</p>
                                  <p><span className="text-cream-muted/60">SS Expiry:</span> {new Date(chef.servSafeCertExpiry).toLocaleDateString()}</p>
                                  <p><span className="text-cream-muted/60">GL Policy:</span> {chef.generalLiabilityPolicy}</p>
                                  <p><span className="text-cream-muted/60">GL Expiry:</span> {new Date(chef.generalLiabilityExpiry).toLocaleDateString()}</p>
                                  <p><span className="text-cream-muted/60">PL Policy:</span> {chef.productLiabilityPolicy}</p>
                                  <p><span className="text-cream-muted/60">PL Expiry:</span> {new Date(chef.productLiabilityExpiry).toLocaleDateString()}</p>
                                </div>
                              </div>
                              {/* Vehicle & BG Check */}
                              <div className="space-y-3">
                                <h4 className="text-xs font-bold tracking-wider uppercase text-cream-muted">Vehicle</h4>
                                <div className="space-y-1 text-sm">
                                  <p><span className="text-cream-muted/60">Plate:</span> {chef.vehicleLicensePlate || "—"}</p>
                                  <p><span className="text-cream-muted/60">Vehicle:</span> {[chef.vehicleColor, chef.vehicleMake, chef.vehicleModel].filter(Boolean).join(" ") || "—"}</p>
                                  <p><span className="text-cream-muted/60">DL #:</span> {chef.driversLicenseNumber || "—"}</p>
                                  <p><span className="text-cream-muted/60">Will Travel:</span> {chef.willTravelToHomes ? "Yes" : "No"}</p>
                                </div>
                                <h4 className="text-xs font-bold tracking-wider uppercase text-cream-muted pt-2">Background Check</h4>
                                <div className="space-y-1 text-sm">
                                  <p><span className="text-cream-muted/60">Name:</span> {chef.bgCheckFullName || "—"} {chef.bgCheckMiddleName ? `(${chef.bgCheckMiddleName})` : ""}</p>
                                  <p><span className="text-cream-muted/60">DOB:</span> {chef.bgCheckDOB || "—"}</p>
                                  <p><span className="text-cream-muted/60">SSN:</span> {chef.bgCheckSSN || chef.bgCheckSSNLast4 || "—"}</p>
                                  <p><span className="text-cream-muted/60">Address:</span> {chef.bgCheckAddress || "—"}{chef.bgCheckCity ? `, ${chef.bgCheckCity}` : ""}{chef.bgCheckState ? `, ${chef.bgCheckState}` : ""} {chef.bgCheckZipCode || ""}</p>
                                  <p><span className="text-cream-muted/60">Previous:</span> {chef.bgCheckPreviousAddress || "—"}</p>
                                  <p><span className="text-cream-muted/60">Consent:</span> {chef.bgCheckConsent ? "Yes" : "No"}</p>
                                </div>
                              </div>
                              {/* Identity Documents & Consent */}
                              <div className="space-y-3">
                                <h4 className="text-xs font-bold tracking-wider uppercase text-cream-muted">Identity Documents</h4>
                                <div className="space-y-2 text-sm">
                                  <p><span className="text-cream-muted/60">ID Type:</span> {chef.governmentIdType?.replace("_", " ") || "—"}</p>
                                  <p>
                                    <span className="text-cream-muted/60">ID Verification:</span>{" "}
                                    <span className={`text-xs font-bold px-2 py-0.5 ${
                                      chef.idVerificationStatus === "VERIFIED" ? "text-emerald-400 bg-emerald-500/10" :
                                      chef.idVerificationStatus === "PENDING" ? "text-gold bg-gold/10" :
                                      chef.idVerificationStatus === "FAILED" ? "text-red-400 bg-red-500/10" :
                                      "text-cream-muted/50 bg-dark-hover"
                                    }`}>
                                      {chef.idVerificationStatus || "NOT_SUBMITTED"}
                                    </span>
                                  </p>
                                  {chef.governmentIdUrl && (
                                    <div>
                                      <p className="text-cream-muted/60 mb-1">Gov ID:</p>
                                      <a href={chef.governmentIdUrl} target="_blank" rel="noopener noreferrer" className="block border border-dark-border hover:border-gold/50 transition-colors">
                                        <img src={chef.governmentIdUrl} alt="Government ID" className="w-full h-20 object-cover" />
                                      </a>
                                    </div>
                                  )}
                                  {chef.selfieUrl && (
                                    <div>
                                      <p className="text-cream-muted/60 mb-1">Selfie:</p>
                                      <a href={chef.selfieUrl} target="_blank" rel="noopener noreferrer" className="block border border-dark-border hover:border-gold/50 transition-colors">
                                        <img src={chef.selfieUrl} alt="Selfie" className="w-full h-20 object-cover" />
                                      </a>
                                    </div>
                                  )}
                                </div>
                                <h4 className="text-xs font-bold tracking-wider uppercase text-cream-muted pt-2">Consent & Agreements</h4>
                                <div className="space-y-1 text-sm">
                                  <p><span className="text-cream-muted/60">FCRA Signature:</span> {chef.fcraConsentSignature || "—"}</p>
                                  <p><span className="text-cream-muted/60">FCRA Signed:</span> {chef.fcraConsentTimestamp ? new Date(chef.fcraConsentTimestamp).toLocaleString() : "—"}</p>
                                  <p><span className="text-cream-muted/60">Terms Accepted:</span> {chef.termsAcceptedAt ? new Date(chef.termsAcceptedAt).toLocaleString() : "—"}</p>
                                  <p><span className="text-cream-muted/60">Anti-Poach:</span> {chef.antiPoachingAcceptedAt ? new Date(chef.antiPoachingAcceptedAt).toLocaleString() : "—"}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ──── ⚙️ Admin Controls ──── */}
                      <div className="border border-dark-border">
                        <button onClick={() => toggleChefSection(chef.id, "controls")} className="w-full flex items-center justify-between px-4 py-3 hover:bg-dark-hover transition-colors">
                          <span className="text-sm font-bold tracking-wide">⚙️ Admin Controls</span>
                          <span className="text-cream-muted text-xs">{isChefSectionOpen(chef.id, "controls") ? "▲" : "▼"}</span>
                        </button>
                        {isChefSectionOpen(chef.id, "controls") && (
                          <div className="border-t border-dark-border px-4 py-4 space-y-5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-cream-muted/60 uppercase tracking-wider">Verification:</span>
                          <select
                            value={chef.verificationStatus || "NOT_STARTED"}
                            onChange={(e) => updateChef(chef.id, { verificationStatus: e.target.value })}
                            className="text-xs bg-dark border border-dark-border text-cream px-3 py-1.5"
                          >
                            <option value="NOT_STARTED">Not Started</option>
                            <option value="INFO_SUBMITTED">Info Submitted</option>
                            <option value="IDENTITY_VERIFIED">Identity Verified</option>
                            <option value="BG_CHECK_RUNNING">BG Check Running</option>
                            <option value="APPROVED">Approved</option>
                            <option value="FLAGGED">Flagged for Review</option>
                            <option value="REJECTED">Rejected</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-cream-muted/60 uppercase tracking-wider">ID Status:</span>
                          <select
                            value={chef.idVerificationStatus || "NOT_SUBMITTED"}
                            onChange={(e) => updateChef(chef.id, { idVerificationStatus: e.target.value })}
                            className="text-xs bg-dark border border-dark-border text-cream px-3 py-1.5"
                          >
                            <option value="NOT_SUBMITTED">Not Submitted</option>
                            <option value="PENDING">Pending</option>
                            <option value="VERIFIED">Verified</option>
                            <option value="FAILED">Failed</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-cream-muted/60 uppercase tracking-wider">Override Tier:</span>
                          <select
                            value={chef.tier || "SOUS_CHEF"}
                            onChange={(e) => updateChef(chef.id, { tier: e.target.value })}
                            className="text-xs bg-dark border border-dark-border text-cream px-3 py-1.5"
                          >
                            <option value="SOUS_CHEF">Sous Chef ($60/hr cap)</option>
                            <option value="CHEF">Chef ($125/hr cap)</option>
                            <option value="MASTER_CHEF">Master Chef (no cap)</option>
                          </select>
                          {chef.tierOverride && <span className="text-[10px] text-amber-400">manually overridden</span>}
                        </div>

                      {/* Insurance Compliance */}
                      <div className="bg-dark border border-dark-border p-4 space-y-3">
                        <h4 className="text-xs font-bold tracking-wider uppercase text-cream-muted">Insurance & Activation</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-cream-muted/60 text-xs">Insurance Status:</span>
                            <span className={`ml-2 text-xs font-bold px-2 py-0.5 ${
                              chef.insuranceStatus === "verified" ? "bg-emerald-500/10 text-emerald-400" :
                              chef.insuranceStatus === "pending" ? "bg-amber-500/10 text-amber-400" :
                              chef.insuranceStatus === "rejected" ? "bg-red-500/10 text-red-400" :
                              chef.insuranceStatus === "expired" ? "bg-red-500/10 text-red-400" :
                              "bg-dark-border text-cream-muted/50"
                            }`}>
                              {(chef.insuranceStatus || "missing").toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <span className="text-cream-muted/60 text-xs">Activation:</span>
                            <span className={`ml-2 text-xs font-bold px-2 py-0.5 ${
                              chef.activationStatus === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400" :
                              chef.activationStatus === "RESTRICTED" ? "bg-red-500/10 text-red-400" :
                              chef.activationStatus === "PENDING_COMPLIANCE" ? "bg-amber-500/10 text-amber-400" :
                              "bg-dark-border text-cream-muted/50"
                            }`}>
                              {chef.activationStatus || "INCOMPLETE"}
                            </span>
                          </div>
                          {chef.insuranceProvider && (
                            <div><span className="text-cream-muted/60 text-xs">Provider:</span> <span className="text-cream text-xs">{chef.insuranceProvider}</span></div>
                          )}
                          {chef.insurancePolicyNumber && (
                            <div><span className="text-cream-muted/60 text-xs">Policy #:</span> <span className="text-cream text-xs">{chef.insurancePolicyNumber}</span></div>
                          )}
                          {chef.insuranceExpiry && (
                            <div><span className="text-cream-muted/60 text-xs">Expires:</span> <span className="text-cream text-xs">{new Date(chef.insuranceExpiry).toLocaleDateString()}</span></div>
                          )}
                          <div><span className="text-cream-muted/60 text-xs">Trust Score:</span> <span className="text-cream text-xs font-bold">{chef.trustScore}/100</span></div>
                        </div>
                        {chef.insuranceDocUrl && (
                          <a href={chef.insuranceDocUrl} target="_blank" rel="noopener noreferrer" className="text-gold text-xs hover:text-gold-light">View Insurance Document →</a>
                        )}
                        <div className="flex flex-wrap gap-2 pt-2">
                          {chef.insuranceStatus === "pending" && (
                            <>
                              <button
                                type="button"
                                onClick={() => updateChef(chef.id, { insuranceVerified: true, insuranceStatus: "verified", activationStatus: "ACTIVE" })}
                                className="bg-emerald-500/10 text-emerald-400 px-4 py-2 text-xs font-bold tracking-wider uppercase hover:bg-emerald-500/20 transition-colors"
                              >
                                ✓ Verify Insurance
                              </button>
                              <button
                                type="button"
                                onClick={() => updateChef(chef.id, { insuranceVerified: false, insuranceStatus: "rejected" })}
                                className="bg-red-500/10 text-red-400 px-4 py-2 text-xs font-bold tracking-wider uppercase hover:bg-red-500/20 transition-colors"
                              >
                                ✕ Reject Insurance
                              </button>
                            </>
                          )}
                          {chef.activationStatus === "RESTRICTED" && (
                            <button
                              type="button"
                              onClick={() => updateChef(chef.id, { activationStatus: "ACTIVE" })}
                              className="bg-blue-500/10 text-blue-400 px-4 py-2 text-xs font-bold tracking-wider uppercase hover:bg-blue-500/20 transition-colors"
                            >
                              Lift Restriction
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-3 pt-2 border-t border-dark-border">
                        {/* Full Approval — one-click approve everything */}
                        {(!chef.isApproved || chef.verificationStatus !== "APPROVED" || chef.bgCheckStatus !== "CLEAR") && (
                          <button
                            type="button"
                            onClick={() => updateChef(chef.id, { isApproved: true, bgCheckStatus: "CLEAR", verificationStatus: "APPROVED", idVerificationStatus: "VERIFIED" })}
                            className="bg-gold text-dark px-4 py-2 text-xs font-bold tracking-wider uppercase hover:bg-gold-light transition-colors"
                          >
                            Full Approval
                          </button>
                        )}
                        {chef.bgCheckStatus === "PENDING" && (
                          <>
                            <button
                              type="button"
                              onClick={() => updateChef(chef.id, { bgCheckStatus: "CLEAR" })}
                              className="bg-emerald-500/10 text-emerald-400 px-4 py-2 text-xs font-bold tracking-wider uppercase hover:bg-emerald-500/20 transition-colors"
                            >
                              Clear BG Check
                            </button>
                            <button
                              type="button"
                              onClick={() => updateChef(chef.id, { bgCheckStatus: "FAILED" })}
                              className="bg-red-500/10 text-red-400 px-4 py-2 text-xs font-bold tracking-wider uppercase hover:bg-red-500/20 transition-colors"
                            >
                              Fail BG Check
                            </button>
                          </>
                        )}
                        {chef.idVerificationStatus === "PENDING" && (
                          <>
                            <button
                              type="button"
                              onClick={() => updateChef(chef.id, { idVerificationStatus: "VERIFIED" })}
                              className="bg-cyan-500/10 text-cyan-400 px-4 py-2 text-xs font-bold tracking-wider uppercase hover:bg-cyan-500/20 transition-colors"
                            >
                              Verify ID
                            </button>
                            <button
                              type="button"
                              onClick={() => updateChef(chef.id, { idVerificationStatus: "FAILED" })}
                              className="bg-red-500/10 text-red-400 px-4 py-2 text-xs font-bold tracking-wider uppercase hover:bg-red-500/20 transition-colors"
                            >
                              Fail ID
                            </button>
                          </>
                        )}
                        {chef.verificationStatus === "FLAGGED" && (
                          <button
                            type="button"
                            onClick={() => updateChef(chef.id, { verificationStatus: "REJECTED" })}
                            className="bg-red-500/10 text-red-400 px-4 py-2 text-xs font-bold tracking-wider uppercase hover:bg-red-500/20 transition-colors"
                          >
                            Reject Chef
                          </button>
                        )}
                        {chef.isApproved ? (
                          <button
                            type="button"
                            onClick={() => updateChef(chef.id, { isApproved: false })}
                            className="bg-amber-500/10 text-amber-400 px-4 py-2 text-xs font-bold tracking-wider uppercase hover:bg-amber-500/20 transition-colors"
                          >
                            Revoke Approval
                          </button>
                        ) : (
                          !chef.isApproved && chef.bgCheckStatus === "CLEAR" && (
                            <button
                              type="button"
                              onClick={() => updateChef(chef.id, { isApproved: true })}
                              className="bg-emerald-500/10 text-emerald-400 px-4 py-2 text-xs font-bold tracking-wider uppercase hover:bg-emerald-500/20 transition-colors"
                            >
                              Approve Chef
                            </button>
                          )
                        )}
                        {chef.isActive ? (
                          <button
                            type="button"
                            onClick={() => updateChef(chef.id, { isActive: false })}
                            className="bg-red-500/10 text-red-400 px-4 py-2 text-xs font-bold tracking-wider uppercase hover:bg-red-500/20 transition-colors"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => updateChef(chef.id, { isActive: true })}
                            className="bg-blue-500/10 text-blue-400 px-4 py-2 text-xs font-bold tracking-wider uppercase hover:bg-blue-500/20 transition-colors"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                          </div>
                        )}
                      </div>
                      {/* end Admin Controls */}

                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
        {!loading && tab === "users" && (
          /* ========== USERS/CUSTOMERS TAB ========== */
          <div className="bg-dark-card border border-dark-border overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark text-left border-b border-dark-border">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider uppercase text-cream-muted">Name</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider uppercase text-cream-muted">Email</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider uppercase text-cream-muted">Phone</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider uppercase text-cream-muted">Role</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider uppercase text-cream-muted">Bookings</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider uppercase text-cream-muted">Reviews</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider uppercase text-cream-muted">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-dark-hover transition-colors">
                    <td className="px-6 py-4 font-medium">{u.name}</td>
                    <td className="px-6 py-4 text-sm text-cream-muted">{u.email}</td>
                    <td className="px-6 py-4 text-sm text-cream-muted">{u.phone || "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-3 py-1 ${roleColors[u.role] || roleColors.CLIENT}`}>
                        {u.role}
                      </span>
                      {u.chefProfile && (
                        <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 ${u.chefProfile.isApproved ? "text-emerald-400 bg-emerald-500/10" : "text-gold bg-gold/10"}`}>
                          {u.chefProfile.isApproved ? "Approved" : "Pending"}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">{u._count.bookingsAsClient}</td>
                    <td className="px-6 py-4 text-sm">{u._count.reviews}</td>
                    <td className="px-6 py-4 text-xs text-cream-muted/50">{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-cream-muted">No users yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {!loading && tab === "bookings" && (
          /* ========== BOOKINGS TAB ========== */
          <div className="bg-dark-card border border-dark-border overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark text-left border-b border-dark-border">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider uppercase text-cream-muted">Client</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider uppercase text-cream-muted">Chef</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider uppercase text-cream-muted">Date / Time</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider uppercase text-cream-muted">Guests</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider uppercase text-cream-muted">Total</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider uppercase text-cream-muted">Status</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider uppercase text-cream-muted">Job</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider uppercase text-cream-muted">Area</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-dark-hover transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-sm">{b.client.name}</p>
                      <p className="text-[10px] text-cream-muted/50">{b.client.email}</p>
                      {b.client.phone && <p className="text-[10px] text-cream-muted/50">📞 {b.client.phone}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-sm">{b.chefProfile.user.name}</p>
                      <p className="text-[10px] text-cream-muted/50">{b.chefProfile.user.email}</p>
                      {b.chefProfile.user.phone && <p className="text-[10px] text-cream-muted/50">📞 {b.chefProfile.user.phone}</p>}
                      <p className="text-[10px] text-cream-muted/50">${b.chefProfile.hourlyRate}/hr</p>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {new Date(b.date).toLocaleDateString()}
                      <p className="text-[10px] text-cream-muted/50">{b.time}{b.endTime ? ` – ${b.endTime}` : ""}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-center">{b.guestCount}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gold">${b.total || "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-3 py-1 ${bookingStatusColors[b.status] || bookingStatusColors.PENDING}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-cream-muted">
                      {b.jobStatus || "—"}
                    </td>
                    <td className="px-6 py-4 text-xs text-cream-muted">{b.generalArea || "—"}</td>
                  </tr>
                ))}
                {bookings.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-cream-muted">No bookings yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {!loading && tab === "trucks" && (
          /* ========== FOOD TRUCKS TAB ========== */
          <div className="bg-dark-card border border-dark-border overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark text-left border-b border-dark-border">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider uppercase text-cream-muted">Truck</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider uppercase text-cream-muted">Cuisine</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider uppercase text-cream-muted">Location</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider uppercase text-cream-muted">Owner</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider uppercase text-cream-muted">Menu Items</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider uppercase text-cream-muted">Status</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider uppercase text-cream-muted">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {trucks.map((truck) => (
                  <tr key={truck.id} className="hover:bg-dark-hover transition-colors">
                    <td className="px-6 py-4 font-medium">{truck.name}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs bg-gold/10 text-gold-light px-3 py-1">{truck.cuisineType}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-cream-muted">{truck.location}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm">{truck.owner.name}</p>
                      <p className="text-[10px] text-cream-muted/50">{truck.owner.email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-cream-muted">{truck.menuItems.length}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {truck.isFeatured && (
                          <span className="text-xs font-bold text-gold bg-gold/10 px-3 py-1">Featured</span>
                        )}
                        {truck.isActive ? (
                          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1">Active</span>
                        ) : (
                          <span className="text-xs font-bold text-red-400 bg-red-500/10 px-3 py-1">Inactive</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => updateTruck(truck.id, { isFeatured: !truck.isFeatured })}
                          className={`px-3 py-1.5 text-xs font-bold tracking-wider uppercase transition-colors ${
                            truck.isFeatured
                              ? "bg-gold/10 text-gold hover:bg-gold/20"
                              : "bg-dark-hover text-cream-muted hover:text-gold"
                          }`}
                        >
                          {truck.isFeatured ? "Unfeature" : "Feature"}
                        </button>
                        {truck.isActive ? (
                          <button
                            type="button"
                            onClick={() => updateTruck(truck.id, { isActive: false })}
                            className="bg-red-500/10 text-red-400 px-3 py-1.5 text-xs font-bold tracking-wider uppercase hover:bg-red-500/20 transition-colors"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => updateTruck(truck.id, { isActive: true })}
                            className="bg-blue-500/10 text-blue-400 px-3 py-1.5 text-xs font-bold tracking-wider uppercase hover:bg-blue-500/20 transition-colors"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {trucks.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-cream-muted">
                      No food trucks registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {!loading && tab === "analytics" && (
          /* ========== ANALYTICS TAB ========== */
          analytics ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-dark-card border border-dark-border p-5">
                  <p className="text-[10px] font-medium tracking-wider uppercase text-cream-muted">Total Revenue</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">${analytics.revenue.totalRevenue.toLocaleString()}</p>
                </div>
                <div className="bg-dark-card border border-dark-border p-5">
                  <p className="text-[10px] font-medium tracking-wider uppercase text-cream-muted">Platform Revenue</p>
                  <p className="text-2xl font-bold text-gold mt-1">${analytics.revenue.platformRevenue.toLocaleString()}</p>
                </div>
                <div className="bg-dark-card border border-dark-border p-5">
                  <p className="text-[10px] font-medium tracking-wider uppercase text-cream-muted">Chef Payouts</p>
                  <p className="text-2xl font-bold mt-1">${analytics.revenue.chefPayouts.toLocaleString()}</p>
                </div>
                <div className="bg-dark-card border border-dark-border p-5">
                  <p className="text-[10px] font-medium tracking-wider uppercase text-cream-muted">Total Tips</p>
                  <p className="text-2xl font-bold text-purple-400 mt-1">${analytics.revenue.totalTips.toLocaleString()}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-dark-card border border-dark-border p-5">
                  <p className="text-[10px] font-medium tracking-wider uppercase text-cream-muted">Completion Rate</p>
                  <p className="text-2xl font-bold mt-1">{analytics.overview.completionRate}%</p>
                </div>
                <div className="bg-dark-card border border-dark-border p-5">
                  <p className="text-[10px] font-medium tracking-wider uppercase text-cream-muted">New Users (30d)</p>
                  <p className="text-2xl font-bold text-blue-400 mt-1">{analytics.overview.recentUsers}</p>
                </div>
                <div className="bg-dark-card border border-dark-border p-5">
                  <p className="text-[10px] font-medium tracking-wider uppercase text-cream-muted">Approved Chefs</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">{analytics.overview.approvedChefs}/{analytics.overview.totalChefs}</p>
                </div>
                <div className="bg-dark-card border border-dark-border p-5">
                  <p className="text-[10px] font-medium tracking-wider uppercase text-cream-muted">Pending Verifications</p>
                  <p className="text-2xl font-bold text-amber-400 mt-1">{analytics.overview.pendingVerifications}</p>
                </div>
              </div>
              {analytics.monthlyData.length > 0 && (
                <div className="bg-dark-card border border-dark-border p-6">
                  <h3 className="text-xs font-bold tracking-wider uppercase text-cream-muted mb-4">Monthly Breakdown</h3>
                  <div className="space-y-3">
                    {analytics.monthlyData.map((m) => (
                      <div key={m.month} className="flex items-center justify-between border-b border-dark-border pb-3">
                        <span className="text-sm font-medium">{m.month}</span>
                        <div className="flex gap-6 text-sm">
                          <span className="text-cream-muted">{m.bookings} bookings</span>
                          <span className="text-emerald-400">${m.revenue.toLocaleString()} revenue</span>
                          <span className="text-gold">${m.platformFee.toLocaleString()} platform</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {analytics.topChefs.length > 0 && (
                <div className="bg-dark-card border border-dark-border p-6">
                  <h3 className="text-xs font-bold tracking-wider uppercase text-cream-muted mb-4">Top Chefs by Revenue</h3>
                  <div className="space-y-3">
                    {analytics.topChefs.map((c, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-cream-muted/40 text-sm w-6">#{i + 1}</span>
                          <span className="font-medium">{c.name}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 tracking-wider uppercase ${tierBadgeColors[c.tier] || tierBadgeColors.SOUS_CHEF}`}>
                            {tierLabels[c.tier] || c.tier}
                          </span>
                        </div>
                        <div className="flex gap-4 text-sm">
                          <span className="text-cream-muted">{c.jobs} jobs</span>
                          <span className="text-gold">{c.avgRating} ★</span>
                          <span className="text-emerald-400 font-medium">${c.revenue.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ===== ENGAGEMENT SIGNALS ===== */}
              <div className="bg-dark-card border border-dark-border p-6">
                <h3 className="text-xs font-bold tracking-wider uppercase text-cream-muted mb-4">📊 Engagement Signals</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-dark border border-dark-border p-4">
                    <p className="text-[10px] font-medium tracking-wider uppercase text-cream-muted">Total Signals</p>
                    <p className="text-2xl font-bold text-blue-400 mt-1">{analytics.engagement.totalSignals.toLocaleString()}</p>
                  </div>
                  <div className="bg-dark border border-dark-border p-4">
                    <p className="text-[10px] font-medium tracking-wider uppercase text-cream-muted">Last 30 Days</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">{analytics.engagement.recentSignals.toLocaleString()}</p>
                  </div>
                  <div className="bg-dark border border-dark-border p-4">
                    <p className="text-[10px] font-medium tracking-wider uppercase text-cream-muted">Tracked Users</p>
                    <p className="text-2xl font-bold text-purple-400 mt-1">{analytics.engagement.trackedUsers}</p>
                  </div>
                  <div className="bg-dark border border-dark-border p-4">
                    <p className="text-[10px] font-medium tracking-wider uppercase text-cream-muted">Avg Signals / User</p>
                    <p className="text-2xl font-bold text-gold mt-1">{analytics.engagement.avgSignalsPerUser}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Signal Types */}
                  <div>
                    <h4 className="text-[10px] font-bold tracking-wider uppercase text-cream-muted mb-3">Signal Breakdown</h4>
                    <div className="space-y-2">
                      {analytics.engagement.signalsByType.map((s) => {
                        const maxCount = analytics.engagement.signalsByType[0]?.count || 1;
                        return (
                          <div key={s.type} className="flex items-center gap-3">
                            <span className="text-xs text-cream-muted w-32 shrink-0 font-mono">{s.type}</span>
                            <div className="flex-1 bg-dark-border h-5 relative">
                              <div className="bg-blue-500/40 h-full" style={{ width: `${Math.round((s.count / maxCount) * 100)}%` }} />
                            </div>
                            <span className="text-xs font-bold w-12 text-right">{s.count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Top Cuisines */}
                  <div>
                    <h4 className="text-[10px] font-bold tracking-wider uppercase text-cream-muted mb-3">Top Cuisines</h4>
                    <div className="space-y-2">
                      {analytics.engagement.topCuisines.map((c, i) => (
                        <div key={c.name} className="flex items-center justify-between border-b border-dark-border pb-1">
                          <span className="text-sm"><span className="text-cream-muted/40 mr-2">#{i + 1}</span>{c.name}</span>
                          <span className="text-xs font-bold text-gold">{c.count} signals</span>
                        </div>
                      ))}
                      {analytics.engagement.topCuisines.length === 0 && <p className="text-xs text-cream-muted/50">No cuisine data yet</p>}
                    </div>
                  </div>

                  {/* Top Dishes */}
                  <div>
                    <h4 className="text-[10px] font-bold tracking-wider uppercase text-cream-muted mb-3">Top Dish Keywords</h4>
                    <div className="flex flex-wrap gap-2">
                      {analytics.engagement.topDishes.map((d) => (
                        <span key={d.name} className="text-xs px-3 py-1.5 border border-gold/20 bg-gold/5 text-gold">
                          {d.name} <span className="text-cream-muted/50 ml-1">({d.count})</span>
                        </span>
                      ))}
                      {analytics.engagement.topDishes.length === 0 && <p className="text-xs text-cream-muted/50">No dish data yet</p>}
                    </div>
                  </div>

                  {/* Device & Location */}
                  <div>
                    <h4 className="text-[10px] font-bold tracking-wider uppercase text-cream-muted mb-3">Devices & Locations</h4>
                    {analytics.engagement.deviceBreakdown.length > 0 && (
                      <div className="flex gap-3 mb-3">
                        {analytics.engagement.deviceBreakdown.map((d) => (
                          <span key={d.type} className="text-xs px-3 py-1.5 border border-dark-border bg-dark">
                            {d.type === "mobile" ? "📱" : d.type === "tablet" ? "📋" : "🖥️"} {d.type} <span className="text-cream-muted/50">({d.count})</span>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="space-y-1">
                      {analytics.engagement.topCities.map((c, i) => (
                        <div key={c.name} className="flex items-center justify-between text-sm">
                          <span><span className="text-cream-muted/40 mr-2">#{i + 1}</span>{c.name}</span>
                          <span className="text-xs text-cream-muted">{c.count}</span>
                        </div>
                      ))}
                      {analytics.engagement.topCities.length === 0 && <p className="text-xs text-cream-muted/50">No location data yet</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-cream-muted">Loading analytics...</p>
          )
        )}
        {!loading && tab === "audit" && (
          /* ========== AUDIT LOG TAB ========== */
          <div className="bg-dark-card border border-dark-border overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark text-left border-b border-dark-border">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider uppercase text-cream-muted">Time</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider uppercase text-cream-muted">Action</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider uppercase text-cream-muted">Target</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider uppercase text-cream-muted">Details</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider uppercase text-cream-muted">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-dark-hover transition-colors">
                    <td className="px-6 py-4 text-xs text-cream-muted">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold px-3 py-1 bg-blue-500/10 text-blue-400">{log.action}</span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="text-cream-muted/60">{log.targetType}:</span> <span className="text-xs font-mono">{log.targetId.slice(0, 8)}...</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-cream-muted max-w-xs truncate">
                      {typeof log.details === "string" ? log.details : JSON.stringify(log.details)}
                    </td>
                    <td className="px-6 py-4 text-xs text-cream-muted/50">{log.ipAddress || "—"}</td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-cream-muted">No audit logs yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {!loading && tab === "incidents" && (
          /* ========== INCIDENTS TAB ========== */
          <div className="space-y-4">
            {incidents.length === 0 ? (
              <div className="text-center py-16 bg-dark-card border border-dark-border">
                <p className="text-4xl mb-3">✅</p>
                <p className="text-cream-muted">No incident reports.</p>
              </div>
            ) : (
              incidents.map((inc) => {
                const severityColors: Record<string, string> = {
                  LOW: "bg-blue-500/10 text-blue-400",
                  MEDIUM: "bg-amber-500/10 text-amber-400",
                  HIGH: "bg-orange-500/10 text-orange-400",
                  CRITICAL: "bg-red-500/10 text-red-400",
                };
                const statusColors: Record<string, string> = {
                  OPEN: "bg-red-500/10 text-red-400 border border-red-500/20",
                  INVESTIGATING: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                  RESOLVED: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                  DISMISSED: "bg-dark-border text-cream-muted",
                };
                return (
                  <div key={inc.id} className="bg-dark-card border border-dark-border">
                    <div
                      className="px-6 py-4 cursor-pointer hover:bg-dark-hover transition-colors"
                      onClick={() => setExpandedIncident(expandedIncident === inc.id ? null : inc.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 tracking-wider uppercase ${severityColors[inc.severity] || ""}`}>{inc.severity}</span>
                          <span className="text-xs font-bold px-2 py-0.5 bg-dark-border text-cream-muted tracking-wider uppercase">{inc.type.replace("_", " ")}</span>
                          <span className="text-sm font-medium">{inc.reporter.name}</span>
                          {inc.reportedUser && (
                            <span className="text-xs text-cream-muted">→ {inc.reportedUser.name}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`text-[10px] font-bold px-3 py-1 tracking-wider uppercase ${statusColors[inc.status] || ""}`}>{inc.status}</span>
                          <span className="text-xs text-cream-muted">{new Date(inc.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <p className="text-sm text-cream-muted mt-2 line-clamp-2">{inc.description}</p>
                    </div>
                    {expandedIncident === inc.id && (
                      <div className="px-6 pb-5 border-t border-dark-border pt-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-cream-muted/60 text-xs">Reporter:</span>
                            <p>{inc.reporter.name} ({inc.reporter.email})</p>
                          </div>
                          {inc.reportedUser && (
                            <div>
                              <span className="text-cream-muted/60 text-xs">Reported User:</span>
                              <p>{inc.reportedUser.name} ({inc.reportedUser.email})</p>
                            </div>
                          )}
                          {inc.bookingId && (
                            <div>
                              <span className="text-cream-muted/60 text-xs">Booking:</span>
                              <p className="text-xs font-mono">{inc.bookingId.slice(0, 12)}...</p>
                              <button
                                onClick={() => fetchLocationEvidence(inc.bookingId!)}
                                className="mt-1 text-xs text-blue-400 hover:text-blue-300 underline"
                              >
                                📍 View Location Evidence
                              </button>
                            </div>
                          )}
                          {inc.resolvedAt && (
                            <div>
                              <span className="text-cream-muted/60 text-xs">Resolved:</span>
                              <p>{new Date(inc.resolvedAt).toLocaleString()}</p>
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="text-cream-muted/60 text-xs">Full Description:</span>
                          <p className="text-sm mt-1">{inc.description}</p>
                        </div>
                        {locationBookingId === inc.bookingId && locationEvidence && (
                          <div className="bg-blue-500/5 border border-blue-500/20 p-4 space-y-3">
                            <h4 className="text-sm font-semibold text-blue-400">📍 Location Evidence</h4>
                            {locationEvidence.summary ? (
                              <>
                                <div className="grid grid-cols-3 gap-4 text-xs">
                                  <div><span className="text-cream-muted/60">Check-ins:</span><p className="font-bold">{locationEvidence.summary.totalCheckins}</p></div>
                                  <div><span className="text-cream-muted/60">Duration:</span><p className="font-bold">{locationEvidence.summary.durationMinutes} min</p></div>
                                  <div><span className="text-cream-muted/60">Arrival:</span><p className="font-bold">{locationEvidence.summary.arrivalRecorded ? "✅ Yes" : "❌ No"}</p></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                  <div><span className="text-cream-muted/60">First:</span><p>{new Date(locationEvidence.summary.firstCheckin).toLocaleString()}</p></div>
                                  <div><span className="text-cream-muted/60">Last:</span><p>{new Date(locationEvidence.summary.lastCheckin).toLocaleString()}</p></div>
                                </div>
                                <details className="text-xs">
                                  <summary className="cursor-pointer text-cream-muted hover:text-cream transition-colors">View all check-ins ({locationEvidence.checkins.length})</summary>
                                  <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                                    {locationEvidence.checkins.map((c, i) => (
                                      <div key={i} className="flex justify-between text-cream-muted/80 border-b border-dark-border pb-1">
                                        <span>{c.checkinType}</span>
                                        <span>{c.latitude.toFixed(5)}, {c.longitude.toFixed(5)}</span>
                                        <span>{new Date(c.createdAt).toLocaleTimeString()}</span>
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              </>
                            ) : (
                              <p className="text-sm text-cream-muted">No location data recorded for this booking.</p>
                            )}
                          </div>
                        )}
                        {inc.adminNotes && (
                          <div className="bg-dark border border-dark-border p-3">
                            <span className="text-cream-muted/60 text-xs">Admin Notes:</span>
                            <p className="text-sm mt-1">{inc.adminNotes}</p>
                          </div>
                        )}
                        {inc.status !== "RESOLVED" && inc.status !== "DISMISSED" && (
                          <div className="space-y-3">
                            <textarea
                              placeholder="Admin notes..."
                              value={incidentNotes}
                              onChange={(e) => setIncidentNotes(e.target.value)}
                              className="w-full border border-dark-border bg-dark px-4 py-3 h-20 text-cream text-sm"
                            />
                            <div className="flex gap-2">
                              {inc.status === "OPEN" && (
                                <button
                                  onClick={() => updateIncident(inc.id, "INVESTIGATING")}
                                  className="bg-amber-500/10 text-amber-400 px-5 py-2 text-xs font-semibold tracking-wider uppercase hover:bg-amber-500/20 transition-colors"
                                >
                                  Investigate
                                </button>
                              )}
                              <button
                                onClick={() => updateIncident(inc.id, "RESOLVED")}
                                className="bg-emerald-500/10 text-emerald-400 px-5 py-2 text-xs font-semibold tracking-wider uppercase hover:bg-emerald-500/20 transition-colors"
                              >
                                Resolve
                              </button>
                              <button
                                onClick={() => updateIncident(inc.id, "DISMISSED")}
                                className="text-cream-muted/50 text-xs font-medium hover:text-cream-muted transition-colors px-3"
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
        {!loading && tab === "alerts" && (
          /* ========== EXPIRY ALERTS TAB ========== */
          <div className="space-y-4">
            {expiryAlerts.length === 0 ? (
              <div className="text-center py-16 bg-dark-card border border-dark-border">
                <p className="text-4xl mb-3">✅</p>
                <p className="text-cream-muted">No expiring certifications in the next 30 days.</p>
              </div>
            ) : (
              expiryAlerts.map((alert, i) => (
                <div key={i} className={`border p-5 ${alert.isExpired ? "bg-red-500/10 border-red-500/30" : "bg-amber-500/10 border-amber-500/30"}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{alert.chefName}</h3>
                      <p className="text-sm text-cream-muted">{alert.chefEmail}</p>
                      <p className="text-sm mt-1">
                        <span className="text-cream-muted/60">{alert.docType}:</span>{" "}
                        <span className={alert.isExpired ? "text-red-400 font-bold" : "text-amber-400"}>
                          {alert.isExpired ? "EXPIRED" : `Expires in ${alert.daysUntilExpiry} days`}
                        </span>
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 ${alert.isExpired ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"}`}>
                      {new Date(alert.expiryDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}
