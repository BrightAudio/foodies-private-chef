"use client";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import StarRating from "@/components/StarRating";
import { usePageTitle } from "@/hooks/usePageTitle";
import toast from "react-hot-toast";
import { getStoredUser } from "@/lib/stored-user";
import Image from "next/image";
import { compressImage } from "@/lib/compressImage";

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
  SOUS_CHEF: 75,
  CHEF: 120,
  MASTER_CHEF: 200,
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
  chefLatitude: number | null;
  chefLongitude: number | null;
  declinedAt: string | null;
  declineReason: string | null;
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

interface StripeStatus {
  hasAccount: boolean;
  onboarded: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
}

interface InsuranceData {
  insuranceDocUrl: string | null;
  insuranceExpiry: string | null;
  insuranceVerified: boolean;
  isExpired: boolean;
  insuranceStatus?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  activationStatus?: string;
  trustScore?: number;
  boostActive?: boolean;
  boostExpiresAt?: string;
}

interface LegalTerms {
  clientTos: string | null;
  liabilityWaiver: string | null;
  chefTerms: string | null;
  antiPoaching: string | null;
  nonCompete: string | null;
}

export default function ChefDashboard() {
  usePageTitle("Chef Dashboard");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [tierData, setTierData] = useState<TierData | null>(null);
  const [verification, setVerification] = useState<VerificationData | null>(null);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [dashTab, setDashTab] = useState<"bookings" | "specials" | "gallery" | "availability" | "payments" | "earnings" | "settings">("bookings");
  const [earningsReport, setEarningsReport] = useState<{
    yearlyReports: { year: number; totalJobs: number; grossRevenue: number; platformFees: number; chefEarnings: number; needs1099: boolean; quarters: { quarter: number; jobs: number; grossRevenue: number; platformFees: number; chefEarnings: number }[] }[];
    currentYearTransactions: { id: string; date: string; clientName: string; grossAmount: number; platformFee: number; netEarnings: number; paymentStatus: string; payoutStatus: string; payoutReleasedAt: string | null }[];
    currentYear: number;
  } | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [earningsYear, setEarningsYear] = useState<number>(new Date().getFullYear());

  // New feature state
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [insurance, setInsurance] = useState<InsuranceData | null>(null);

  // Custom dish requests state
  interface DishRequestItem {
    id: string;
    dishName: string;
    description: string;
    guestCount: number;
    status: string;
    groceryItems: string | null;
    estimatedGroceryCost: number | null;
    chefNotes: string | null;
    clientNotes: string | null;
    client: { name: string };
    bookingId: string;
    createdAt: string;
  }
  const [dishRequests, setDishRequests] = useState<DishRequestItem[]>([]);
  const [quoteForm, setQuoteForm] = useState<{ requestId: string; groceryRows: { item: string; qty: string; estCost: string }[]; notes: string } | null>(null);
  const [insuranceUploading, setInsuranceUploading] = useState(false);
  const [insuranceDocUrl, setInsuranceDocUrl] = useState("");
  const [insuranceExpiry, setInsuranceExpiry] = useState("");
  const [legalTerms, setLegalTerms] = useState<LegalTerms | null>(null);
  const [signingTerms, setSigningTerms] = useState<string | null>(null);
  const [signature, setSignature] = useState("");
  const [boostLoading, setBoostLoading] = useState(false);
  const [groceryCards, setGroceryCards] = useState<Record<string, { id: string; cardNumber: string; budget: number; spent: number; status: string; approvedItems: string | null; stripeCardId: string | null }>>({});
  const [spendAmount, setSpendAmount] = useState<Record<string, string>>({});
  const [cardDetails, setCardDetails] = useState<Record<string, { number: string; exp_month: number; exp_year: number; cvc: string } | null>>({});
  const [cardDetailsLoading, setCardDetailsLoading] = useState<Record<string, boolean>>({});

  // Fetch earnings report when tab opens
  useEffect(() => {
    if (dashTab !== "earnings" || earningsReport) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    setEarningsLoading(true);
    fetch("/api/chefs/earnings", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (data.yearlyReports) setEarningsReport(data); })
      .catch(() => {})
      .finally(() => setEarningsLoading(false));
  }, [dashTab, earningsReport]);
  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState("");

  // Menu items state
  const [specials, setSpecials] = useState<{ id: string; name: string; description: string; price: number; imageUrl: string | null; isFeatured: boolean; featuredStartDate: string | null; groceryItems: string | null; estimatedGroceryCost: number | null }[]>([]);
  const [needsRotation, setNeedsRotation] = useState(false);
  const [specialForm, setSpecialForm] = useState({ name: "", description: "", price: "", isFeatured: false });
  const [groceryRows, setGroceryRows] = useState<{ item: string; qty: string; estCost: string }[]>([]);
  const [specialSaving, setSpecialSaving] = useState(false);
  const [showSpecialForm, setShowSpecialForm] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("token")) { window.location.href = "/login"; return; }
    fetchBookings();
    fetchTierData();
    fetchVerification();
    fetchGallery();
    fetchBlockedDates();
    fetchStripeStatus();
    fetchInsurance();
    fetchLegalTerms();
    fetchSpecials();
    fetchDishRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const fetchDishRequests = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("/api/dish-requests", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setDishRequests(await res.json());
    } catch { /* ignore */ }
  };

  const submitQuote = async () => {
    if (!quoteForm) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const validGrocery = quoteForm.groceryRows.filter((g) => g.item.trim());
    const estCost = validGrocery.reduce((s, g) => s + (Number(g.estCost) || 0), 0);
    try {
      const res = await fetch("/api/dish-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          requestId: quoteForm.requestId,
          action: "quote",
          groceryItems: validGrocery,
          estimatedGroceryCost: estCost,
          chefNotes: quoteForm.notes,
        }),
      });
      if (res.ok) { setQuoteForm(null); fetchDishRequests(); }
    } catch { /* ignore */ }
  };

  const fetchSpecials = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("/api/chefs/specials", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setSpecials(data.specials);
        setNeedsRotation(data.needsRotation);
      }
    } catch { /* ignore */ }
  };

  const createSpecial = async () => {
    const token = localStorage.getItem("token");
    if (!token || !specialForm.name.trim() || !specialForm.description.trim()) return;
    setSpecialSaving(true);
    const validGrocery = groceryRows.filter((g) => g.item.trim());
    const estGroceryCost = validGrocery.reduce((sum, g) => sum + (Number(g.estCost) || 0), 0);
    try {
      const res = await fetch("/api/chefs/specials", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...specialForm,
          price: specialForm.price ? Number(specialForm.price) : 0,
          groceryItems: validGrocery.length > 0 ? validGrocery : null,
          estimatedGroceryCost: validGrocery.length > 0 ? estGroceryCost : null,
        }),
      });
      if (res.ok) {
        setSpecialForm({ name: "", description: "", price: "", isFeatured: false });
        setGroceryRows([]);
        setShowSpecialForm(false);
        fetchSpecials();
      }
    } catch { /* ignore */ }
    setSpecialSaving(false);
  };

  const setWeeklySpecial = async (specialId: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      await fetch("/api/chefs/specials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ specialId }),
      });
      fetchSpecials();
    } catch { /* ignore */ }
  };

  const deleteSpecial = async (id: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      await fetch(`/api/chefs/specials?id=${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      fetchSpecials();
    } catch { /* ignore */ }
  };

  const fetchTierData = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const user = getStoredUser();
    if (!user) return;
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
    const apiFilter = filter === "active" ? "" : filter;
    const url = apiFilter ? `/api/bookings?status=${apiFilter}&limit=50` : "/api/bookings?limit=50";
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    let results = data.bookings || data;
    if (filter === "active") {
      results = results.filter((b: Booking) => b.status === "CONFIRMED" || b.status === "PREPARING" || b.status === "PENDING_COMPLETION");
    }
    setBookings(results);
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
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append("file", compressed);
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

  const fetchStripeStatus = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("/api/stripe/connect", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setStripeStatus(await res.json());
    } catch { /* ignore */ }
  };

  const fetchInsurance = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("/api/chefs/insurance", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setInsurance(await res.json());
    } catch { /* ignore */ }
  };

  const fetchLegalTerms = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("/api/legal/accept-terms", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setLegalTerms(await res.json());
    } catch { /* ignore */ }
  };

  const setupStripeConnect = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setStripeLoading(true);
    const newWindow = window.open("about:blank", "_blank");
    try {
      const res = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { newWindow?.close(); toast.error(data.error); return; }
      if (data.alreadyOnboarded && data.dashboardUrl) {
        if (newWindow) newWindow.location.href = data.dashboardUrl;
        else window.location.href = data.dashboardUrl;
      } else if (data.onboardingUrl) {
        if (newWindow) newWindow.location.href = data.onboardingUrl;
        else window.location.href = data.onboardingUrl;
      } else {
        newWindow?.close();
      }
    } catch { newWindow?.close(); toast.error("Failed to set up payments"); }
    finally { setStripeLoading(false); }
  };

  const uploadInsurance = async () => {
    const token = localStorage.getItem("token");
    if (!token || !insuranceDocUrl || !insuranceExpiry) return;
    setInsuranceUploading(true);
    try {
      const res = await fetch("/api/chefs/insurance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ insuranceDocUrl, insuranceExpiry }),
      });
      if (res.ok) {
        setInsuranceDocUrl("");
        setInsuranceExpiry("");
        fetchInsurance();
      } else {
        const data = await res.json();
        toast.error(data.error);
      }
    } finally { setInsuranceUploading(false); }
  };

  const acceptTerms = async (termsType: string) => {
    const token = localStorage.getItem("token");
    if (!token || !signature.trim()) return;
    try {
      const res = await fetch("/api/legal/accept-terms", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ termsType, signature: signature.trim() }),
      });
      if (res.ok) {
        setSigningTerms(null);
        setSignature("");
        fetchLegalTerms();
      } else {
        const data = await res.json();
        toast.error(data.error);
      }
    } catch { toast.error("Failed to accept terms"); }
  };

  const handleInsuranceFileUpload = async (file: File) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const compressed = await compressImage(file);
    const formData = new FormData();
    formData.append("file", compressed);
    try {
      const res = await fetch("/api/uploads", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
      if (res.ok) {
        const { url } = await res.json();
        setInsuranceDocUrl(url);
      }
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

    // Send location check-in on job status changes
    if (["EN_ROUTE", "ARRIVED", "IN_PROGRESS", "COMPLETED"].includes(jobStatus) && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const checkinType = jobStatus === "EN_ROUTE" ? "ARRIVAL" : jobStatus === "COMPLETED" ? "DEPARTURE" : "PERIODIC";
        fetch(`/api/bookings/${bookingId}/location`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy, checkinType }),
        }).catch(() => {});
      }, () => {}, { enableHighAccuracy: true });
    }

    fetchBookings();
  };

  // Silent periodic location tracking for active jobs
  useEffect(() => {
    const activeBooking = bookings.find((b) =>
      (b.status === "CONFIRMED" || b.status === "PREPARING") && ["EN_ROUTE", "ARRIVED", "IN_PROGRESS"].includes(b.jobStatus)
    );
    if (!activeBooking || !navigator.geolocation) return;

    const token = localStorage.getItem("token");
    const sendLocation = () => {
      navigator.geolocation.getCurrentPosition((pos) => {
        // Silent check-in for dispute resolution
        fetch(`/api/bookings/${activeBooking.id}/location`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy, checkinType: "PERIODIC" }),
        }).catch(() => {});
        // Live location update for client tracking (when en route)
        if (activeBooking.jobStatus === "EN_ROUTE") {
          fetch(`/api/bookings/${activeBooking.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ chefLatitude: pos.coords.latitude, chefLongitude: pos.coords.longitude }),
          }).catch(() => {});
        }
      }, () => {}, { enableHighAccuracy: true });
    };

    sendLocation(); // immediate
    const interval = setInterval(sendLocation, 30_000); // every 30s for live tracking
    return () => clearInterval(interval);
  }, [bookings]);

  const openInMaps = (address: string) => {
    const encoded = encodeURIComponent(address);
    window.open(`https://maps.apple.com/?daddr=${encoded}`, "_blank");
  };

  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  const acceptBooking = async (bookingId: string) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: "ACCEPTED" }),
    });
    if (res.ok) {
      toast.success("Booking accepted!");
      fetchBookings();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to accept");
    }
  };

  const declineBooking = async (bookingId: string) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: "DECLINED", declineReason: declineReason.trim() || undefined }),
    });
    if (res.ok) {
      const data = await res.json();
      setDecliningId(null);
      setDeclineReason("");
      if (data.warningLevel) {
        toast.error(`Warning: ${data.warningLevel} — excessive declines may lead to account restrictions.`);
      } else {
        toast("Booking declined.");
      }
      fetchBookings();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to decline");
    }
  };

  const fetchGroceryCard = async (bookingId: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`/api/grocery-cards?bookingId=${bookingId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const cards = await res.json();
        if (cards.length > 0) {
          setGroceryCards(prev => ({ ...prev, [bookingId]: cards[0] }));
        }
      }
    } catch {}
  };

  const recordSpending = async (cardId: string, bookingId: string) => {
    const token = localStorage.getItem("token");
    const amt = parseFloat(spendAmount[bookingId] || "0");
    if (!token || !amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    const res = await fetch("/api/grocery-cards", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ cardId, action: "spend", amount: amt }),
    });
    if (res.ok) {
      toast("Spending recorded!");
      setSpendAmount(prev => ({ ...prev, [bookingId]: "" }));
      fetchGroceryCard(bookingId);
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to record spending");
    }
  };

  const viewCardDetails = async (cardDbId: string, bookingId: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setCardDetailsLoading(prev => ({ ...prev, [bookingId]: true }));
    try {
      const res = await fetch(`/api/grocery-cards?cardId=${cardDbId}&action=details`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const details = await res.json();
        setCardDetails(prev => ({ ...prev, [bookingId]: details }));
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to load card details");
      }
    } catch { toast.error("Network error"); }
    finally { setCardDetailsLoading(prev => ({ ...prev, [bookingId]: false })); }
  };

  const statusColors: Record<string, string> = {
    PENDING: "bg-gold/10 text-gold",
    CONFIRMED: "bg-blue-500/10 text-blue-400",
    PREPARING: "bg-purple-500/10 text-purple-400",
    PENDING_COMPLETION: "bg-amber-500/10 text-amber-400",
    COMPLETED: "bg-emerald-500/10 text-emerald-400",
    DECLINED: "bg-red-500/10 text-red-400",
    CANCELLED: "bg-red-500/10 text-red-400",
  };

  const jobStatusLabels: Record<string, string> = {
    SCHEDULED: "Scheduled",
    PREPARING: "Preparing",
    EN_ROUTE: "En Route",
    ARRIVED: "Arrived",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Job Complete",
  };

  const jobStatusColors: Record<string, string> = {
    SCHEDULED: "bg-dark-border text-cream-muted",
    PREPARING: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
    EN_ROUTE: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    ARRIVED: "bg-gold/10 text-gold border border-gold/20",
    IN_PROGRESS: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
    COMPLETED: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  };

  const earnings = bookings
    .filter((b) => b.status === "COMPLETED" || b.status === "PENDING_COMPLETION")
    .reduce((sum, b) => sum + (b.subtotal - b.platformFee), 0);

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <button onClick={() => { setDashTab("bookings"); setFilter(""); }} className="bg-dark-card border border-dark-border p-6 text-left hover:border-gold/30 transition-colors">
            <p className="text-xs font-medium tracking-wider uppercase text-cream-muted">Total Bookings</p>
            <p className="text-3xl font-bold mt-1">{bookings.length}</p>
          </button>
          <button onClick={() => { setDashTab("bookings"); setFilter("active"); }} className="bg-dark-card border border-dark-border p-6 text-left hover:border-blue-500/30 transition-colors">
            <p className="text-xs font-medium tracking-wider uppercase text-cream-muted">Active Jobs</p>
            <p className="text-3xl font-bold text-blue-400 mt-1">
              {bookings.filter((b) => b.status === "CONFIRMED" || b.status === "PREPARING" || b.status === "PENDING_COMPLETION").length}
            </p>
          </button>
          <button onClick={() => { setDashTab("bookings"); setFilter("PENDING"); }} className="bg-dark-card border border-dark-border p-6 text-left hover:border-gold/30 transition-colors">
            <p className="text-xs font-medium tracking-wider uppercase text-cream-muted">Pending</p>
            <p className="text-3xl font-bold text-gold mt-1">
              {bookings.filter((b) => b.status === "PENDING").length}
            </p>
          </button>
          <button onClick={() => { setDashTab("earnings"); }} className="bg-dark-card border border-dark-border p-6 text-left hover:border-emerald-500/30 transition-colors">
            <p className="text-xs font-medium tracking-wider uppercase text-cream-muted">Earnings</p>
            <p className="text-3xl font-bold text-emerald-400 mt-1">${earnings.toFixed(2)}</p>
          </button>
        </div>

        {/* Dashboard Tabs */}
        <div className="flex gap-2 mb-6 border-b border-dark-border pb-4 overflow-x-auto">
          {([
            { key: "bookings" as const, label: "📋 Bookings" },
            { key: "specials" as const, label: "🍽️ Specials" },
            { key: "gallery" as const, label: "📸 Gallery" },
            { key: "availability" as const, label: "📅 Availability" },
            { key: "payments" as const, label: "💳 Payments" },
            { key: "earnings" as const, label: "📊 Earnings Report" },
            { key: "settings" as const, label: "⚙️ Settings" },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setDashTab(t.key)}
              className={`px-5 py-2.5 text-sm font-semibold tracking-wider uppercase transition-colors whitespace-nowrap ${
                dashTab === t.key ? "bg-gold text-dark" : "bg-dark-card border border-dark-border text-cream-muted hover:border-gold/30"
              }`}
            >
              {t.label}
              {t.key === "specials" && needsRotation && (
                <span className="ml-2 w-2 h-2 bg-amber-400 rounded-full inline-block animate-pulse" />
              )}
              {t.key === "payments" && stripeStatus && !stripeStatus.onboarded && (
                <span className="ml-2 w-2 h-2 bg-amber-400 inline-block" />
              )}
            </button>
          ))}
        </div>

        {/* Specials Tab */}
        {dashTab === "specials" && (
          <div className="space-y-6">
            {/* Featured Dish Rotation Prompt */}
            {needsRotation && specials.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 p-5">
                <h3 className="text-amber-400 font-bold text-lg mb-1">🔄 Time to Set Your Featured Dish!</h3>
                <p className="text-cream-muted text-sm mb-3">Pick a dish from your menu to feature for the next 2 weeks. Featured dishes get extra visibility in the For You feed!</p>
                <div className="flex flex-wrap gap-2">
                  {specials.filter(s => !s.isFeatured).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setWeeklySpecial(s.id)}
                      className="bg-gold/10 border border-gold/30 text-gold px-4 py-2 text-sm font-medium hover:bg-gold/20 transition-colors"
                    >
                      Feature &ldquo;{s.name}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Your Menu</h2>
              <button
                onClick={() => setShowSpecialForm(!showSpecialForm)}
                className="bg-gold text-dark px-5 py-2 text-sm font-semibold tracking-wider uppercase hover:bg-gold-light transition-colors"
              >
                {showSpecialForm ? "Cancel" : "+ Add Special"}
              </button>
            </div>

            {/* Add Special Form */}
            {showSpecialForm && (
              <div className="bg-dark-card border border-dark-border p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Dish Name</label>
                  <input
                    type="text"
                    className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                    placeholder="e.g. Pan-Seared Chilean Sea Bass"
                    value={specialForm.name}
                    onChange={(e) => setSpecialForm({ ...specialForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Description</label>
                  <textarea
                    className="w-full border border-dark-border bg-dark px-4 py-3 h-20 text-cream"
                    placeholder="Describe the dish, ingredients, and what makes it special..."
                    value={specialForm.description}
                    onChange={(e) => setSpecialForm({ ...specialForm, description: e.target.value })}
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Price ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                      placeholder="0.00"
                      value={specialForm.price}
                      onChange={(e) => setSpecialForm({ ...specialForm, price: e.target.value })}
                    />
                  </div>
                  <div className="flex-1 flex items-end">
                    <label className="flex items-center gap-3 cursor-pointer pb-3">
                      <input
                        type="checkbox"
                        checked={specialForm.isFeatured}
                        onChange={(e) => setSpecialForm({ ...specialForm, isFeatured: e.target.checked })}
                        className="w-5 h-5 accent-gold"
                      />
                      <span className="text-sm text-cream-muted">Set as featured dish (bi-weekly)</span>
                    </label>
                  </div>
                </div>

                {/* Grocery List Builder */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted">🛒 Grocery List (optional)</label>
                    <button
                      type="button"
                      onClick={() => setGroceryRows([...groceryRows, { item: "", qty: "", estCost: "" }])}
                      className="text-xs text-gold hover:text-gold-light transition-colors"
                    >
                      + Add Item
                    </button>
                  </div>
                  {groceryRows.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => setGroceryRows([{ item: "", qty: "", estCost: "" }])}
                      className="w-full border border-dashed border-dark-border bg-dark/50 px-4 py-3 text-cream-muted text-sm hover:border-gold/30 transition-colors"
                    >
                      Add grocery items for this dish...
                    </button>
                  ) : (
                    <div className="space-y-2">
                      {groceryRows.map((row, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Item (e.g. Chilean Sea Bass)"
                            className="flex-1 border border-dark-border bg-dark px-3 py-2 text-sm text-cream"
                            value={row.item}
                            onChange={(e) => { const nr = [...groceryRows]; nr[idx] = { ...nr[idx], item: e.target.value }; setGroceryRows(nr); }}
                          />
                          <input
                            type="text"
                            placeholder="Qty"
                            className="w-20 border border-dark-border bg-dark px-3 py-2 text-sm text-cream"
                            value={row.qty}
                            onChange={(e) => { const nr = [...groceryRows]; nr[idx] = { ...nr[idx], qty: e.target.value }; setGroceryRows(nr); }}
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Cost"
                            className="w-24 border border-dark-border bg-dark px-3 py-2 text-sm text-cream"
                            value={row.estCost}
                            onChange={(e) => { const nr = [...groceryRows]; nr[idx] = { ...nr[idx], estCost: e.target.value }; setGroceryRows(nr); }}
                          />
                          <button
                            type="button"
                            onClick={() => setGroceryRows(groceryRows.filter((_, i) => i !== idx))}
                            className="text-red-400 hover:text-red-300 px-2"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      {groceryRows.some((g) => g.item.trim()) && (
                        <p className="text-xs text-cream-muted text-right">
                          Est. total: <span className="text-gold font-semibold">${groceryRows.reduce((s, g) => s + (Number(g.estCost) || 0), 0).toFixed(2)}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={createSpecial}
                  disabled={specialSaving || !specialForm.name.trim() || !specialForm.description.trim()}
                  className="bg-gold text-dark px-6 py-3 font-semibold text-sm tracking-[0.15em] uppercase hover:bg-gold-light transition-colors disabled:opacity-40"
                >
                  {specialSaving ? "Saving..." : "Add to Menu"}
                </button>
              </div>
            )}

            {/* Specials List */}
            {specials.length === 0 ? (
              <div className="text-center py-16 bg-dark-card border border-dark-border">
                <p className="text-4xl mb-4">🍽️</p>
                <p className="text-cream-muted mb-2">No menu items yet</p>
                <p className="text-cream-muted text-sm">Add your signature dishes so clients can see what you offer!</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {specials.map((s) => (
                  <div key={s.id} className={`bg-dark-card border overflow-hidden relative ${
                    s.isFeatured ? "border-gold/60 ring-1 ring-gold/30" : "border-dark-border"
                  }`}>
                    {s.isFeatured && (
                      <div className="absolute top-2 left-2 bg-gold text-dark px-3 py-1 text-xs font-bold uppercase tracking-wider z-10">
                        🔥 Featured Dish
                      </div>
                    )}
                    {s.imageUrl && (
                      <div className="h-36 relative">
                        <Image src={s.imageUrl} alt={s.name} width={400} height={144} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-1">{s.name}</h3>
                      <p className="text-cream-muted text-sm mb-3 leading-relaxed line-clamp-2">{s.description}</p>
                      {s.price > 0 && <p className="text-gold font-bold mb-1">${s.price.toFixed(2)}</p>}
                      {s.estimatedGroceryCost != null && s.estimatedGroceryCost > 0 && (
                        <p className="text-cream-muted text-xs mb-3">🛒 Groceries: ~${s.estimatedGroceryCost.toFixed(2)}</p>
                      )}
                      <div className="flex gap-2">
                        {!s.isFeatured && (
                          <button
                            onClick={() => setWeeklySpecial(s.id)}
                            className="text-xs bg-gold/10 border border-gold/30 text-gold px-3 py-1.5 hover:bg-gold/20 transition-colors"
                          >
                            Set as Featured
                          </button>
                        )}
                        <button
                          onClick={() => deleteSpecial(s.id)}
                          className="text-xs bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-1.5 hover:bg-red-500/20 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
                    <Image src={img.url} alt={img.caption || "Gallery"} width={400} height={192} className="w-full h-48 object-cover" />
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
          {["", "active", "PENDING", "CONFIRMED", "PREPARING", "PENDING_COMPLETION", "COMPLETED", "DECLINED", "CANCELLED"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-5 py-2.5 text-sm font-medium transition-colors ${filter === s ? "bg-gold text-dark" : "bg-dark-card border border-dark-border text-cream-muted hover:border-gold/30"}`}
            >
              {s === "active" ? "Active" : s || "All"}
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
                    <p className="text-xs text-cream-muted/50">You earn: ${(b.subtotal - b.platformFee).toFixed(2)}</p>
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
                  {/* Accept / Decline for pending bookings */}
                  {b.status === "PENDING" && (
                    <div className="flex gap-2 items-center">
                      <button
                        onClick={() => acceptBooking(b.id)}
                        className="bg-emerald-600 text-white px-5 py-2 text-sm font-semibold tracking-wider uppercase hover:bg-emerald-500 transition-colors"
                      >
                        ✓ Accept Booking
                      </button>
                      <button
                        onClick={() => setDecliningId(b.id)}
                        className="bg-red-500/10 text-red-400 px-5 py-2 text-sm font-semibold tracking-wider uppercase hover:bg-red-500/20 transition-colors border border-red-500/20"
                      >
                        ✗ Decline
                      </button>
                    </div>
                  )}

                  {/* Decline reason modal */}
                  {decliningId === b.id && (
                    <div className="w-full mt-3 bg-dark border border-red-500/20 p-4 space-y-3">
                      <p className="text-sm text-red-400 font-medium">Why are you declining this booking?</p>
                      <textarea
                        value={declineReason}
                        onChange={(e) => setDeclineReason(e.target.value)}
                        placeholder="Optional reason (visible to client)..."
                        className="w-full border border-dark-border bg-dark-card px-4 py-3 h-20 text-cream text-sm"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => declineBooking(b.id)}
                          className="bg-red-600 text-white px-5 py-2 text-sm font-semibold tracking-wider uppercase hover:bg-red-500 transition-colors"
                        >
                          Confirm Decline
                        </button>
                        <button
                          onClick={() => { setDecliningId(null); setDeclineReason(""); }}
                          className="text-cream-muted text-sm hover:text-cream transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Preparing step (after confirmed, before en route) */}
                  {b.status === "CONFIRMED" && b.jobStatus === "SCHEDULED" && (
                    <button
                      onClick={() => updateJobStatus(b.id, "PREPARING")}
                      className="bg-purple-600 text-white px-5 py-2 text-sm font-semibold tracking-wider uppercase hover:bg-purple-500 transition-colors"
                    >
                      🍳 Start Preparing
                    </button>
                  )}

                  {/* En Route step */}
                  {(b.status === "CONFIRMED" || b.status === "PREPARING") && b.jobStatus === "PREPARING" && (
                    <button
                      onClick={() => updateJobStatus(b.id, "EN_ROUTE")}
                      className="bg-gold text-dark px-5 py-2 text-sm font-semibold tracking-wider uppercase hover:bg-gold-light transition-colors"
                    >
                      🚗 Mark En Route
                    </button>
                  )}

                  {(b.status === "CONFIRMED" || b.status === "PREPARING") && b.jobStatus === "EN_ROUTE" && (
                    <>
                      {b.address && b.addressRevealedAt && (
                        <button
                          onClick={() => openInMaps(b.address)}
                          className="bg-blue-600 text-white px-5 py-2 text-sm font-semibold tracking-wider uppercase hover:bg-blue-500 transition-colors"
                        >
                          📍 Navigate to Client
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

                  {(b.status === "CONFIRMED" || b.status === "PREPARING") && b.jobStatus === "ARRIVED" && (
                    <button
                      onClick={() => updateJobStatus(b.id, "IN_PROGRESS")}
                      className="bg-purple-600 text-white px-5 py-2 text-sm font-semibold tracking-wider uppercase hover:bg-purple-500 transition-colors"
                    >
                      🍳 Begin Cooking
                    </button>
                  )}

                  {(b.status === "CONFIRMED" || b.status === "PREPARING") && b.jobStatus === "IN_PROGRESS" && (
                    <button
                      onClick={() => { updateJobStatus(b.id, "COMPLETED"); updateStatus(b.id, "PENDING_COMPLETION"); }}
                      className="bg-emerald-600 text-white px-5 py-2 text-sm font-semibold tracking-wider uppercase hover:bg-emerald-500 transition-colors"
                    >
                      ✨ Complete Job
                    </button>
                  )}

                  {b.status === "PENDING_COMPLETION" && (
                    <span className="text-amber-400 text-sm font-medium">⏳ Awaiting client confirmation...</span>
                  )}

                  {b.status === "DECLINED" && (
                    <span className="text-red-400 text-sm font-medium">Declined{b.declineReason ? `: ${b.declineReason}` : ""}</span>
                  )}

                  {b.status !== "CANCELLED" && b.status !== "COMPLETED" && b.status !== "PENDING_COMPLETION" && (
                    <a
                      href={`/messages/${b.id}`}
                      className="border border-dark-border px-4 py-2 text-sm font-medium text-cream-muted hover:border-gold/30 hover:text-cream transition-colors"
                    >
                      💬 Message Client
                    </a>
                  )}
                </div>

                {/* Grocery Card Section */}
                {["CONFIRMED", "PREPARING"].includes(b.status) && (
                  <div className="mt-4 border-t border-dark-border pt-4">
                    {!groceryCards[b.id] ? (
                      <button onClick={() => fetchGroceryCard(b.id)} className="text-sm text-gold hover:text-gold-light transition-colors">
                        🛒 Check Grocery Card
                      </button>
                    ) : (
                      <div className="bg-dark border border-dark-border p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-gold">💳 Stripe Virtual Grocery Card</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 ${
                            groceryCards[b.id].status === "ACTIVE" ? "text-emerald-400 bg-emerald-500/10" :
                            groceryCards[b.id].status === "FROZEN" ? "text-blue-400 bg-blue-500/10" :
                            groceryCards[b.id].status === "DEPLETED" ? "text-amber-400 bg-amber-500/10" :
                            "text-cream-muted bg-dark-border"
                          }`}>{groceryCards[b.id].status}</span>
                        </div>
                        <p className="text-xs text-cream-muted">Card: {groceryCards[b.id].cardNumber}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span>Budget: <strong className="text-gold">${groceryCards[b.id].budget.toFixed(2)}</strong></span>
                          <span>Spent: <strong>${groceryCards[b.id].spent.toFixed(2)}</strong></span>
                          <span>Remaining: <strong className="text-emerald-400">${(groceryCards[b.id].budget - groceryCards[b.id].spent).toFixed(2)}</strong></span>
                        </div>
                        {groceryCards[b.id].approvedItems && (
                          <div className="text-xs text-cream-muted">
                            <span className="font-medium">Approved items:</span> {(() => { try { return JSON.parse(groceryCards[b.id].approvedItems!).join(", "); } catch { return groceryCards[b.id].approvedItems; } })()}
                          </div>
                        )}

                        {/* Card Details (number, exp, cvc) */}
                        {groceryCards[b.id].stripeCardId && groceryCards[b.id].status === "ACTIVE" && (
                          <div className="space-y-2">
                            {!cardDetails[b.id] ? (
                              <button
                                onClick={() => viewCardDetails(groceryCards[b.id].id, b.id)}
                                disabled={cardDetailsLoading[b.id]}
                                className="text-sm text-gold hover:text-gold-light transition-colors disabled:opacity-40"
                              >
                                {cardDetailsLoading[b.id] ? "Loading..." : "👁 View Card Details (Number, Exp, CVC)"}
                              </button>
                            ) : (
                              <div className="bg-gradient-to-br from-dark-card to-dark border border-gold/30 p-4 rounded space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-cream-muted/60 uppercase tracking-wider">Virtual Card Details</span>
                                  <button onClick={() => setCardDetails(prev => ({ ...prev, [b.id]: null }))} className="text-cream-muted/40 text-xs hover:text-cream transition-colors">Hide</button>
                                </div>
                                <p className="font-mono text-lg tracking-widest text-cream">{cardDetails[b.id]!.number.replace(/(\d{4})/g, "$1 ").trim()}</p>
                                <div className="flex gap-6 text-sm">
                                  <span className="text-cream-muted">EXP <strong className="text-cream">{String(cardDetails[b.id]!.exp_month).padStart(2, "0")}/{cardDetails[b.id]!.exp_year}</strong></span>
                                  <span className="text-cream-muted">CVC <strong className="text-cream">{cardDetails[b.id]!.cvc}</strong></span>
                                </div>
                                <p className="text-[10px] text-gold/70 mt-2"> Add to Apple Pay: Open Wallet app → + → Debit Card → Enter details above</p>
                              </div>
                            )}
                          </div>
                        )}

                        {groceryCards[b.id].status === "ACTIVE" && (
                          <div className="flex gap-2 mt-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Amount spent"
                              value={spendAmount[b.id] || ""}
                              onChange={(e) => setSpendAmount(prev => ({ ...prev, [b.id]: e.target.value }))}
                              className="border border-dark-border bg-dark px-3 py-2 text-sm text-cream w-32"
                            />
                            <button
                              onClick={() => recordSpending(groceryCards[b.id].id, b.id)}
                              className="bg-gold text-dark px-4 py-2 text-xs font-semibold hover:bg-gold-light transition-colors"
                            >
                              Record Spending
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

          {/* Custom Dish Requests */}
          {dishRequests.length > 0 && (
            <div className="mt-8 space-y-4">
              <h2 className="text-xl font-bold">✨ Custom Dish Requests</h2>
              {dishRequests.filter((r) => r.status !== "CANCELLED").map((r) => (
                <div key={r.id} className={`bg-dark-card border p-5 ${r.status === "PENDING" ? "border-gold/40" : "border-dark-border"}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{r.dishName}</h3>
                      <p className="text-cream-muted text-sm">From {r.client.name} · {r.guestCount} guests</p>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 uppercase tracking-wider ${
                      r.status === "PENDING" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                      r.status === "QUOTED" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                      r.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                      "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}>{r.status}</span>
                  </div>
                  <p className="text-cream-muted text-sm mb-4">{r.description}</p>

                  {r.status === "QUOTED" && r.estimatedGroceryCost != null && (
                    <div className="bg-dark border border-dark-border p-3 mb-4">
                      <p className="text-sm text-cream-muted">Your quote: <span className="text-gold font-bold">${r.estimatedGroceryCost.toFixed(2)}</span> groceries</p>
                      {r.chefNotes && <p className="text-xs text-cream-muted/60 mt-1">{r.chefNotes}</p>}
                      <p className="text-xs text-cream-muted/40 mt-2">Waiting for client approval...</p>
                    </div>
                  )}

                  {r.status === "APPROVED" && (
                    <div className="bg-emerald-500/5 border border-emerald-500/20 p-3 mb-4">
                      <p className="text-sm text-emerald-400">✓ Client approved! Grocery budget: ${r.estimatedGroceryCost?.toFixed(2)}</p>
                    </div>
                  )}

                  {r.status === "PENDING" && quoteForm?.requestId !== r.id && (
                    <button
                      onClick={() => setQuoteForm({ requestId: r.id, groceryRows: [{ item: "", qty: "", estCost: "" }], notes: "" })}
                      className="bg-gold text-dark px-5 py-2 text-sm font-semibold tracking-wider uppercase hover:bg-gold-light transition-colors"
                    >
                      Send Quote with Grocery List
                    </button>
                  )}

                  {quoteForm?.requestId === r.id && (
                    <div className="border border-gold/30 bg-gold/5 p-4 space-y-3">
                      <p className="text-xs font-medium tracking-wider uppercase text-gold">🛒 Grocery List for {r.dishName}</p>
                      {quoteForm.groceryRows.map((row, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Item"
                            className="flex-1 border border-dark-border bg-dark px-3 py-2 text-sm text-cream"
                            value={row.item}
                            onChange={(e) => { const nr = [...quoteForm.groceryRows]; nr[idx] = { ...nr[idx], item: e.target.value }; setQuoteForm({ ...quoteForm, groceryRows: nr }); }}
                          />
                          <input
                            type="text"
                            placeholder="Qty"
                            className="w-20 border border-dark-border bg-dark px-3 py-2 text-sm text-cream"
                            value={row.qty}
                            onChange={(e) => { const nr = [...quoteForm.groceryRows]; nr[idx] = { ...nr[idx], qty: e.target.value }; setQuoteForm({ ...quoteForm, groceryRows: nr }); }}
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Cost"
                            className="w-24 border border-dark-border bg-dark px-3 py-2 text-sm text-cream"
                            value={row.estCost}
                            onChange={(e) => { const nr = [...quoteForm.groceryRows]; nr[idx] = { ...nr[idx], estCost: e.target.value }; setQuoteForm({ ...quoteForm, groceryRows: nr }); }}
                          />
                          <button type="button" onClick={() => setQuoteForm({ ...quoteForm, groceryRows: quoteForm.groceryRows.filter((_, i) => i !== idx) })} className="text-red-400 px-2">✕</button>
                        </div>
                      ))}
                      <button type="button" onClick={() => setQuoteForm({ ...quoteForm, groceryRows: [...quoteForm.groceryRows, { item: "", qty: "", estCost: "" }] })} className="text-xs text-gold hover:text-gold-light">+ Add Item</button>
                      {quoteForm.groceryRows.some((g) => g.item.trim()) && (
                        <p className="text-xs text-cream-muted text-right">Est. total: <span className="text-gold font-semibold">${quoteForm.groceryRows.reduce((s, g) => s + (Number(g.estCost) || 0), 0).toFixed(2)}</span></p>
                      )}
                      <textarea
                        placeholder="Notes for the client (optional)"
                        className="w-full border border-dark-border bg-dark px-3 py-2 h-16 text-sm text-cream"
                        value={quoteForm.notes}
                        onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                      />
                      <div className="flex gap-3">
                        <button onClick={submitQuote} disabled={!quoteForm.groceryRows.some((g) => g.item.trim())} className="bg-gold text-dark px-5 py-2 text-sm font-semibold tracking-wider uppercase hover:bg-gold-light transition-colors disabled:opacity-40">Send Quote</button>
                        <button onClick={() => setQuoteForm(null)} className="text-cream-muted text-sm hover:text-cream">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          </>
        )}

        {/* Payments Tab */}
        {dashTab === "payments" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Payment Setup</h2>
            <p className="text-sm text-cream-muted">Connect your bank account to receive payouts from bookings.</p>

            <div className="bg-dark-card border border-dark-border p-6">
              {!stripeStatus || !stripeStatus.hasAccount ? (
                <div className="text-center py-8 space-y-4">
                  <div className="text-4xl">🏦</div>
                  <h3 className="font-semibold text-lg">Set Up Payouts</h3>
                  <p className="text-sm text-cream-muted max-w-md mx-auto">
                    Connect your bank account through Foodies to receive earnings from completed bookings. Setup takes 2-3 minutes.
                  </p>
                  <button
                    onClick={setupStripeConnect}
                    disabled={stripeLoading}
                    className="bg-gold text-dark px-8 py-3 font-semibold text-sm tracking-[0.15em] uppercase hover:bg-gold-light transition-colors disabled:opacity-40"
                  >
                    {stripeLoading ? "Setting up..." : "Connect Bank Account"}
                  </button>
                </div>
              ) : stripeStatus.onboarded ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">✅</span>
                    <div>
                      <h3 className="font-semibold text-emerald-400">Payments Active</h3>
                      <p className="text-sm text-cream-muted">Your account is fully set up to receive payouts.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-dark border border-dark-border p-4">
                      <p className="text-[10px] font-medium tracking-wider uppercase text-cream-muted">Charges</p>
                      <p className={`text-sm font-bold mt-1 ${stripeStatus.chargesEnabled ? "text-emerald-400" : "text-red-400"}`}>
                        {stripeStatus.chargesEnabled ? "Enabled" : "Disabled"}
                      </p>
                    </div>
                    <div className="bg-dark border border-dark-border p-4">
                      <p className="text-[10px] font-medium tracking-wider uppercase text-cream-muted">Payouts</p>
                      <p className={`text-sm font-bold mt-1 ${stripeStatus.payoutsEnabled ? "text-emerald-400" : "text-amber-400"}`}>
                        {stripeStatus.payoutsEnabled ? "Enabled" : "Pending"}
                      </p>
                    </div>
                    <div className="bg-dark border border-dark-border p-4">
                      <p className="text-[10px] font-medium tracking-wider uppercase text-cream-muted">Details</p>
                      <p className={`text-sm font-bold mt-1 ${stripeStatus.detailsSubmitted ? "text-emerald-400" : "text-amber-400"}`}>
                        {stripeStatus.detailsSubmitted ? "Complete" : "Incomplete"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={setupStripeConnect}
                    disabled={stripeLoading}
                    className="border border-gold/40 text-gold px-6 py-2 font-semibold text-sm tracking-[0.15em] uppercase hover:bg-gold/10 transition-colors disabled:opacity-40"
                  >
                    {stripeLoading ? "Loading..." : "Open Payments Dashboard"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⏳</span>
                    <div>
                      <h3 className="font-semibold text-amber-400">Onboarding Incomplete</h3>
                      <p className="text-sm text-cream-muted">You started setup but haven&apos;t finished. Complete onboarding to receive payouts.</p>
                    </div>
                  </div>
                  <button
                    onClick={setupStripeConnect}
                    disabled={stripeLoading}
                    className="bg-gold text-dark px-8 py-3 font-semibold text-sm tracking-[0.15em] uppercase hover:bg-gold-light transition-colors disabled:opacity-40"
                  >
                    {stripeLoading ? "Loading..." : "Continue Setup"}
                  </button>
                </div>
              )}
            </div>

            <div className="bg-blue-500/5 border border-blue-500/20 px-5 py-4">
              <p className="text-sm text-blue-300">
                💡 Earnings are deposited directly to your bank account after job completion.
              </p>
            </div>
          </div>
        )}

        {/* Earnings Report Tab */}
        {dashTab === "earnings" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold tracking-tight">Earnings Report</h3>
              {earningsReport && earningsReport.yearlyReports.length > 0 && (
                <button
                  onClick={() => {
                    const report = earningsReport.yearlyReports.find(r => r.year === earningsYear);
                    if (!report) return;
                    const txns = earningsYear === earningsReport.currentYear ? earningsReport.currentYearTransactions : [];
                    let csv = `Foodies Earnings Report - ${earningsYear}\n\n`;
                    csv += `Year,${report.year}\n`;
                    csv += `Total Jobs,${report.totalJobs}\n`;
                    csv += `Gross Revenue,$${report.grossRevenue.toFixed(2)}\n`;
                    csv += `Platform Fees,$${report.platformFees.toFixed(2)}\n`;
                    csv += `Net Earnings,$${report.chefEarnings.toFixed(2)}\n`;
                    csv += `1099 Required,${report.needs1099 ? "Yes" : "No"}\n\n`;
                    csv += `Quarterly Breakdown\nQuarter,Jobs,Gross Revenue,Platform Fees,Net Earnings\n`;
                    report.quarters.forEach(q => {
                      csv += `Q${q.quarter},${q.jobs},$${q.grossRevenue.toFixed(2)},$${q.platformFees.toFixed(2)},$${q.chefEarnings.toFixed(2)}\n`;
                    });
                    if (txns.length > 0) {
                      csv += `\nTransaction Detail\nDate,Client,Gross Amount,Platform Fee,Net Earnings,Payment Status,Payout Status\n`;
                      txns.forEach(t => {
                        csv += `${new Date(t.date).toLocaleDateString()},${t.clientName},$${t.grossAmount.toFixed(2)},$${t.platformFee.toFixed(2)},$${t.netEarnings.toFixed(2)},${t.paymentStatus},${t.payoutStatus}\n`;
                      });
                    }
                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url; a.download = `foodies-earnings-${earningsYear}.csv`; a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="bg-gold text-dark px-4 py-2 text-xs font-bold tracking-wider uppercase hover:bg-gold-light transition-colors"
                >
                  ⬇ Download CSV
                </button>
              )}
            </div>

            {earningsLoading ? (
              <div className="bg-dark-card border border-dark-border p-12 text-center">
                <div className="animate-spin text-gold text-2xl mb-2">⟳</div>
                <p className="text-cream-muted text-sm">Loading earnings data…</p>
              </div>
            ) : !earningsReport || earningsReport.yearlyReports.length === 0 ? (
              <div className="bg-dark-card border border-dark-border p-12 text-center">
                <p className="text-cream-muted">No completed bookings yet. Earnings will appear here after your first job.</p>
              </div>
            ) : (
              <>
                {/* Year selector */}
                {earningsReport.yearlyReports.length > 1 && (
                  <div className="flex gap-2">
                    {earningsReport.yearlyReports.map(r => (
                      <button
                        key={r.year}
                        onClick={() => setEarningsYear(r.year)}
                        className={`px-4 py-2 text-sm font-bold tracking-wider ${earningsYear === r.year ? "bg-gold text-dark" : "bg-dark-card border border-dark-border text-cream-muted hover:border-gold/30"}`}
                      >
                        {r.year}
                      </button>
                    ))}
                  </div>
                )}

                {(() => {
                  const report = earningsReport.yearlyReports.find(r => r.year === earningsYear);
                  if (!report) return null;
                  return (
                    <>
                      {/* Annual summary */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-dark-card border border-dark-border p-5">
                          <p className="text-[10px] text-cream-muted uppercase tracking-wider">Net Earnings</p>
                          <p className="text-2xl font-bold text-emerald-400 mt-1">${report.chefEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-dark-card border border-dark-border p-5">
                          <p className="text-[10px] text-cream-muted uppercase tracking-wider">Gross Revenue</p>
                          <p className="text-2xl font-bold mt-1">${report.grossRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-dark-card border border-dark-border p-5">
                          <p className="text-[10px] text-cream-muted uppercase tracking-wider">Platform Fees</p>
                          <p className="text-2xl font-bold text-gold mt-1">${report.platformFees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-dark-card border border-dark-border p-5">
                          <p className="text-[10px] text-cream-muted uppercase tracking-wider">Jobs Completed</p>
                          <p className="text-2xl font-bold mt-1">{report.totalJobs}</p>
                        </div>
                        <div className="bg-dark-card border border-dark-border p-5">
                          <p className="text-[10px] text-cream-muted uppercase tracking-wider">1099 Status</p>
                          <p className={`text-2xl font-bold mt-1 ${report.needs1099 ? "text-amber-400" : "text-cream-muted/50"}`}>
                            {report.needs1099 ? "Required" : "Under $600"}
                          </p>
                          {report.needs1099 && <p className="text-[10px] text-amber-400/60 mt-1">You will receive a 1099 form</p>}
                        </div>
                      </div>

                      {/* Quarterly breakdown */}
                      <div className="bg-dark-card border border-dark-border">
                        <div className="px-5 py-3 border-b border-dark-border">
                          <h4 className="text-xs font-bold tracking-wider uppercase text-cream-muted">Quarterly Breakdown</h4>
                        </div>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-dark-border text-cream-muted/60 text-xs">
                              <th className="text-left px-5 py-2">Quarter</th>
                              <th className="text-right px-5 py-2">Jobs</th>
                              <th className="text-right px-5 py-2">Gross</th>
                              <th className="text-right px-5 py-2">Fees</th>
                              <th className="text-right px-5 py-2">Net Earnings</th>
                            </tr>
                          </thead>
                          <tbody>
                            {report.quarters.map(q => (
                              <tr key={q.quarter} className="border-b border-dark-border/50">
                                <td className="px-5 py-3 font-medium">Q{q.quarter} {report.year}</td>
                                <td className="px-5 py-3 text-right">{q.jobs}</td>
                                <td className="px-5 py-3 text-right">${q.grossRevenue.toFixed(2)}</td>
                                <td className="px-5 py-3 text-right text-gold">${q.platformFees.toFixed(2)}</td>
                                <td className="px-5 py-3 text-right text-emerald-400 font-bold">${q.chefEarnings.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Transaction detail — current year only */}
                      {earningsYear === earningsReport.currentYear && earningsReport.currentYearTransactions.length > 0 && (
                        <div className="bg-dark-card border border-dark-border">
                          <div className="px-5 py-3 border-b border-dark-border">
                            <h4 className="text-xs font-bold tracking-wider uppercase text-cream-muted">Transaction Detail — {earningsYear}</h4>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-dark-border text-cream-muted/60 text-xs">
                                  <th className="text-left px-5 py-2">Date</th>
                                  <th className="text-left px-5 py-2">Client</th>
                                  <th className="text-right px-5 py-2">Gross</th>
                                  <th className="text-right px-5 py-2">Fee</th>
                                  <th className="text-right px-5 py-2">Net</th>
                                  <th className="text-right px-5 py-2">Payout</th>
                                </tr>
                              </thead>
                              <tbody>
                                {earningsReport.currentYearTransactions.map(t => (
                                  <tr key={t.id} className="border-b border-dark-border/50">
                                    <td className="px-5 py-3">{new Date(t.date).toLocaleDateString()}</td>
                                    <td className="px-5 py-3">{t.clientName}</td>
                                    <td className="px-5 py-3 text-right">${t.grossAmount.toFixed(2)}</td>
                                    <td className="px-5 py-3 text-right text-gold">${t.platformFee.toFixed(2)}</td>
                                    <td className="px-5 py-3 text-right text-emerald-400 font-bold">${t.netEarnings.toFixed(2)}</td>
                                    <td className="px-5 py-3 text-right">
                                      <span className={`text-[10px] font-bold px-2 py-0.5 ${
                                        t.payoutStatus === "PAID" ? "bg-emerald-500/10 text-emerald-400" :
                                        t.payoutStatus === "RELEASED" ? "bg-blue-500/10 text-blue-400" :
                                        t.payoutStatus === "FAILED" ? "bg-red-500/10 text-red-400" :
                                        "bg-dark-border text-cream-muted/50"
                                      }`}>{t.payoutStatus}</span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Tax info */}
                      <div className="bg-dark-card border border-dark-border p-5">
                        <p className="text-xs text-cream-muted/60 leading-relaxed">
                          💡 This report is provided for your records. If your net earnings for the tax year exceed $600, Foodies will issue a 1099-NEC form by January 31 of the following year. Consult a tax professional for advice on reporting self-employment income.
                        </p>
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {/* Settings Tab — Insurance Compliance + Legal + Boost */}
        {dashTab === "settings" && (
          <div className="space-y-8">
            {/* Activation Status Banner */}
            {insurance && (
              <div className={`border p-5 ${
                insurance.activationStatus === "ACTIVE" ? "bg-emerald-500/10 border-emerald-500/30" :
                insurance.activationStatus === "RESTRICTED" ? "bg-red-500/10 border-red-500/30" :
                insurance.activationStatus === "PENDING_COMPLIANCE" ? "bg-amber-500/10 border-amber-500/30" :
                "bg-blue-500/10 border-blue-500/30"
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {insurance.activationStatus === "ACTIVE" ? "✅" :
                     insurance.activationStatus === "RESTRICTED" ? "🚫" :
                     insurance.activationStatus === "PENDING_COMPLIANCE" ? "⚠️" : "🔄"}
                  </span>
                  <div>
                    <h3 className={`font-bold text-sm ${
                      insurance.activationStatus === "ACTIVE" ? "text-emerald-400" :
                      insurance.activationStatus === "RESTRICTED" ? "text-red-400" :
                      insurance.activationStatus === "PENDING_COMPLIANCE" ? "text-amber-400" :
                      "text-blue-400"
                    }`}>
                      {insurance.activationStatus === "ACTIVE" && "Active — Ready for Bookings"}
                      {insurance.activationStatus === "RESTRICTED" && "Restricted — Under Compliance Review"}
                      {insurance.activationStatus === "PENDING_COMPLIANCE" && "Pending Compliance — Action Required"}
                      {insurance.activationStatus === "INCOMPLETE" && "Incomplete — Complete Setup to Go Live"}
                      {!insurance.activationStatus && "Checking status..."}
                    </h3>
                    <p className="text-xs text-cream-muted mt-0.5">
                      {insurance.activationStatus === "ACTIVE" && "Your profile is live and accepting bookings."}
                      {insurance.activationStatus === "RESTRICTED" && "Your profile is temporarily hidden from search. Please contact support."}
                      {insurance.activationStatus === "PENDING_COMPLIANCE" && "Upload your insurance and complete verification to activate your profile."}
                      {insurance.activationStatus === "INCOMPLETE" && "Complete all onboarding steps to start accepting bookings."}
                    </p>
                    {insurance.trustScore !== undefined && insurance.trustScore > 0 && (
                      <p className="text-xs text-cream-muted/50 mt-1">Trust Score: {insurance.trustScore}/100</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Insurance Compliance Section */}
            <div>
              <h2 className="text-xl font-bold mb-4">Insurance Compliance</h2>
              <div className="bg-dark-card border border-dark-border p-6 space-y-4">
                {/* Current insurance status */}
                {insurance && insurance.insuranceDocUrl ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {insurance.insuranceStatus === "verified" ? "✅" :
                           insurance.insuranceStatus === "expired" || insurance.isExpired ? "🔴" :
                           insurance.insuranceStatus === "rejected" ? "❌" : "⏳"}
                        </span>
                        <div>
                          <h3 className={`font-semibold ${
                            insurance.insuranceStatus === "verified" ? "text-emerald-400" :
                            insurance.insuranceStatus === "expired" || insurance.isExpired ? "text-red-400" :
                            insurance.insuranceStatus === "rejected" ? "text-red-400" : "text-amber-400"
                          }`}>
                            {insurance.insuranceStatus === "verified" && "Insurance Verified"}
                            {insurance.insuranceStatus === "pending" && "Pending Admin Verification"}
                            {(insurance.insuranceStatus === "expired" || insurance.isExpired) && "Insurance Expired"}
                            {insurance.insuranceStatus === "rejected" && "Insurance Rejected — Please Resubmit"}
                            {insurance.insuranceStatus === "missing" && "Insurance Upload Required"}
                          </h3>
                          <p className="text-sm text-cream-muted">
                            Expires: {insurance.insuranceExpiry ? new Date(insurance.insuranceExpiry).toLocaleDateString() : "N/A"}
                            {insurance.insuranceProvider && ` · Provider: ${insurance.insuranceProvider}`}
                          </p>
                        </div>
                      </div>
                      <a
                        href={insurance.insuranceDocUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gold text-sm font-medium hover:text-gold-light transition-colors"
                      >
                        View Document →
                      </a>
                    </div>
                    {(insurance.insuranceStatus === "expired" || insurance.isExpired) && (
                      <div className="bg-red-500/10 border border-red-500/20 px-4 py-3">
                        <p className="text-sm text-red-400">Your insurance has expired. Bookings are blocked until you upload a valid policy.</p>
                      </div>
                    )}
                    {insurance.insuranceStatus === "rejected" && (
                      <div className="bg-red-500/10 border border-red-500/20 px-4 py-3">
                        <p className="text-sm text-red-400">Your insurance was rejected by our admin team. Please upload a valid general liability policy.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-cream-muted text-sm mb-1">No insurance document on file.</p>
                    <p className="text-xs text-cream-muted/50">Insurance is required to accept bookings on Foodies.</p>
                  </div>
                )}

                {/* Get Insured — Thimble Referral */}
                {(!insurance?.insuranceDocUrl || insurance.insuranceStatus !== "verified") && (
                  <div className="bg-blue-500/5 border border-blue-500/20 p-5 space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">🛡️</span>
                      <div>
                        <h4 className="font-semibold text-blue-300 text-sm">Need Insurance? Get Covered in Minutes</h4>
                        <p className="text-xs text-cream-muted mt-1">
                          Our partner Thimble offers on-demand general liability insurance starting at $5/day.
                          Policies purchased through our link are fast-tracked for verification.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        const token = localStorage.getItem("token");
                        if (!token) return;
                        // Open window synchronously (on user click) to avoid popup blocker
                        const newWindow = window.open("about:blank", "_blank");
                        try {
                          const res = await fetch("/api/insurance/referral", {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ provider: "thimble" }),
                          });
                          const data = await res.json();
                          if (data.redirectUrl && newWindow) {
                            newWindow.location.href = data.redirectUrl;
                          } else if (data.redirectUrl) {
                            window.location.href = data.redirectUrl;
                          } else {
                            newWindow?.close();
                          }
                        } catch {
                          newWindow?.close();
                        }
                      }}
                      className="bg-blue-600 text-white px-6 py-2 font-semibold text-xs tracking-[0.15em] uppercase hover:bg-blue-500 transition-colors"
                    >
                      Get Insured with Thimble →
                    </button>
                  </div>
                )}

                {/* Upload insurance form */}
                <div className="border-t border-dark-border pt-4 space-y-4">
                  <h4 className="text-sm font-semibold">{insurance?.insuranceDocUrl ? "Update Insurance" : "Upload Insurance"}</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Insurance Document</label>
                      <div className="flex gap-3 items-center">
                        <label className="cursor-pointer border border-dark-border bg-dark px-4 py-2 text-sm text-cream-muted hover:border-gold/30 transition-colors">
                          Choose File
                          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleInsuranceFileUpload(e.target.files[0]); }} />
                        </label>
                        {insuranceDocUrl && <span className="text-xs text-emerald-400">✓ Uploaded</span>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Provider Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Thimble, State Farm"
                          value={insuranceProvider}
                          onChange={(e) => setInsuranceProvider(e.target.value)}
                          className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Policy Number</label>
                        <input
                          type="text"
                          placeholder="Policy #"
                          value={insurancePolicyNumber}
                          onChange={(e) => setInsurancePolicyNumber(e.target.value)}
                          className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Expiry Date</label>
                      <input
                        type="date"
                        value={insuranceExpiry}
                        onChange={(e) => setInsuranceExpiry(e.target.value)}
                        className="w-full max-w-xs border border-dark-border bg-dark px-4 py-3 text-cream"
                      />
                    </div>
                    <button
                      onClick={uploadInsurance}
                      disabled={insuranceUploading || !insuranceDocUrl || !insuranceExpiry}
                      className="bg-gold text-dark px-6 py-2 font-semibold text-sm tracking-[0.15em] uppercase hover:bg-gold-light transition-colors disabled:opacity-40"
                    >
                      {insuranceUploading ? "Saving..." : "Save Insurance"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Boost Section */}
            <div>
              <h2 className="text-xl font-bold mb-4">Profile Boost</h2>
              <div className="bg-dark-card border border-dark-border p-6">
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-2xl">🔥</span>
                  <div>
                    <h3 className="font-semibold">Boost Your Profile</h3>
                    <p className="text-sm text-cream-muted">
                      Appear at the top of search results for 7 days. Boosted profiles get 3x more views.
                    </p>
                  </div>
                </div>
                {insurance?.boostActive && insurance?.boostExpiresAt ? (
                  <div className="bg-purple-500/10 border border-purple-500/20 px-4 py-3 mb-4">
                    <p className="text-sm text-purple-400">
                      🔥 Boost active until {new Date(insurance.boostExpiresAt).toLocaleDateString()}
                    </p>
                  </div>
                ) : null}
                <button
                  onClick={async () => {
                    const token = localStorage.getItem("token");
                    if (!token) return;
                    setBoostLoading(true);
                    try {
                      const res = await fetch("/api/chefs/boost", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      const data = await res.json();
                      if (!res.ok) { toast.error(data.error); return; }
                      fetchInsurance();
                      toast.success(data.message);
                    } catch { toast.error("Failed to boost"); }
                    finally { setBoostLoading(false); }
                  }}
                  disabled={boostLoading || insurance?.activationStatus !== "ACTIVE"}
                  className="bg-purple-600 text-white px-6 py-2 font-semibold text-sm tracking-[0.15em] uppercase hover:bg-purple-500 transition-colors disabled:opacity-40"
                >
                  {boostLoading ? "Processing..." : "Boost for $19.99/week"}
                </button>
                {insurance?.activationStatus !== "ACTIVE" && (
                  <p className="text-xs text-cream-muted/50 mt-2">Must be fully active to boost your profile.</p>
                )}
              </div>
            </div>

            {/* Legal Agreements Section */}
            <div>
              <h2 className="text-xl font-bold mb-4">Legal Agreements</h2>
              <div className="space-y-3">
                {([
                  { key: "CHEF_NON_COMPETE", label: "Non-Compete Agreement", field: "nonCompete" as const, desc: "Agreement not to solicit clients outside the platform for 12 months." },
                  { key: "CHEF_ANTI_POACHING", label: "Anti-Poaching Policy", field: "antiPoaching" as const, desc: "Agreement not to exchange personal contact info or arrange off-platform bookings." },
                  { key: "CLIENT_TOS", label: "Terms of Service", field: "clientTos" as const, desc: "General terms governing use of the Foodies platform." },
                  { key: "LIABILITY_WAIVER", label: "Liability Waiver", field: "liabilityWaiver" as const, desc: "Acknowledgment of risks and liability limitations." },
                ]).map((term) => {
                  const accepted = legalTerms?.[term.field];
                  return (
                    <div key={term.key} className="bg-dark-card border border-dark-border p-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{accepted ? "✅" : "⬜"}</span>
                        <div>
                          <h4 className="font-semibold text-sm">{term.label}</h4>
                          <p className="text-xs text-cream-muted">{term.desc}</p>
                          {accepted && (
                            <p className="text-[10px] text-cream-muted/50 mt-1">
                              Accepted {new Date(accepted).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      {!accepted && (
                        <button
                          onClick={() => { setSigningTerms(term.key); setSignature(""); }}
                          className="bg-gold text-dark px-5 py-2 font-semibold text-xs tracking-[0.15em] uppercase hover:bg-gold-light transition-colors shrink-0"
                        >
                          Accept
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Signing Modal */}
              {signingTerms && (
                <div className="mt-4 bg-dark border border-gold/20 p-6 space-y-4">
                  <h4 className="font-semibold">Digital Signature Required</h4>
                  <p className="text-sm text-cream-muted">
                    Type your full legal name to accept the agreement.
                  </p>
                  <input
                    type="text"
                    placeholder="Your full legal name"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    className="w-full border border-dark-border bg-dark-card px-4 py-3 text-cream"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => acceptTerms(signingTerms)}
                      disabled={!signature.trim()}
                      className="bg-gold text-dark px-6 py-2 font-semibold text-sm tracking-[0.15em] uppercase hover:bg-gold-light transition-colors disabled:opacity-40"
                    >
                      Sign &amp; Accept
                    </button>
                    <button
                      onClick={() => { setSigningTerms(null); setSignature(""); }}
                      className="text-cream-muted text-sm hover:text-cream transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
