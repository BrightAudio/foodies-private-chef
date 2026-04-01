// ===== Session & Device Context (like Meta Pixel captures) =====

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = sessionStorage.getItem("foodies_sid");
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem("foodies_sid", sid);
  }
  return sid;
}

function getDeviceType(): string {
  if (typeof window === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/Mobi|Android.*Mobile|iPhone|iPod/.test(ua)) return "mobile";
  if (/iPad|Android(?!.*Mobile)|Tablet/.test(ua)) return "tablet";
  return "desktop";
}

function getUTMParams(): { utmSource?: string; utmMedium?: string; utmCampaign?: string } {
  if (typeof window === "undefined") return {};
  // Cache UTM params from first landing in sessionStorage
  let stored = sessionStorage.getItem("foodies_utm");
  if (!stored) {
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get("utm_source") || undefined;
    const utmMedium = params.get("utm_medium") || undefined;
    const utmCampaign = params.get("utm_campaign") || undefined;
    if (utmSource || utmMedium || utmCampaign) {
      stored = JSON.stringify({ utmSource, utmMedium, utmCampaign });
      sessionStorage.setItem("foodies_utm", stored);
    }
  }
  return stored ? JSON.parse(stored) : {};
}

function getReferrer(): string | undefined {
  if (typeof window === "undefined") return undefined;
  let ref = sessionStorage.getItem("foodies_ref");
  if (!ref) {
    const docRef = document.referrer;
    // Only store external referrers
    if (docRef && !docRef.includes(window.location.hostname)) {
      ref = docRef;
      sessionStorage.setItem("foodies_ref", ref);
    }
  }
  return ref || undefined;
}

// ===== Core Tracking =====

interface TrackSignal {
  signalType: string;
  cuisineType?: string;
  dishKeyword?: string;
  chefProfileId?: string;
  dwellSeconds?: number;
  scrollPercent?: number;
}

// Fire-and-forget interest tracking — like a pixel/beacon
export function trackInterest(signal: TrackSignal) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (!token) return;

  const payload = {
    ...signal,
    sessionId: getSessionId(),
    deviceType: getDeviceType(),
    referrer: getReferrer(),
    pageUrl: typeof window !== "undefined" ? window.location.pathname : undefined,
    ...getUTMParams(),
  };

  fetch("/api/interests/track", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  }).catch(() => {}); // Silent — never block UI
}

// Extract keywords from a dish name/description for tracking
export function extractDishKeywords(text: string): string[] {
  const stopWords = new Set(["the", "and", "with", "our", "for", "from", "this", "that", "its", "has", "are", "was", "chef"]);
  return text
    .toLowerCase()
    .split(/[\s,.\-/]+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w))
    .slice(0, 5);
}

// ===== Dwell Time Tracker (like Facebook's time-on-content) =====

export function useDwellTracker(signal: {
  chefProfileId?: string;
  cuisineType?: string;
}) {
  if (typeof window === "undefined") return;

  const start = Date.now();
  let sent = false;

  const sendDwell = () => {
    if (sent) return;
    sent = true;
    const seconds = Math.round((Date.now() - start) / 1000);
    if (seconds < 3) return; // Ignore bounces under 3s
    // Weight: 0.5 base + 0.1 per 10 seconds, capped at 3.0
    trackInterest({
      signalType: "DWELL",
      dwellSeconds: seconds,
      ...signal,
    });
  };

  // Fire on page hide (tab switch, navigate away, close)
  window.addEventListener("pagehide", sendDwell, { once: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") sendDwell();
  }, { once: true });

  // Cleanup function for React useEffect
  return () => sendDwell();
}

// ===== Scroll Depth Tracker (engagement depth like Facebook) =====

export function useScrollTracker(signal: {
  chefProfileId?: string;
  cuisineType?: string;
}) {
  if (typeof window === "undefined") return;

  let maxScroll = 0;
  let sent25 = false;
  let sent50 = false;
  let sent75 = false;
  let sent100 = false;

  const onScroll = () => {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollHeight <= 0) return;
    const pct = Math.round((window.scrollY / scrollHeight) * 100);
    if (pct > maxScroll) maxScroll = pct;

    // Fire at 25% milestones
    if (pct >= 25 && !sent25) {
      sent25 = true;
      trackInterest({ signalType: "SCROLL_DEPTH", scrollPercent: 25, ...signal });
    }
    if (pct >= 50 && !sent50) {
      sent50 = true;
      trackInterest({ signalType: "SCROLL_DEPTH", scrollPercent: 50, ...signal });
    }
    if (pct >= 75 && !sent75) {
      sent75 = true;
      trackInterest({ signalType: "SCROLL_DEPTH", scrollPercent: 75, ...signal });
    }
    if (pct >= 95 && !sent100) {
      sent100 = true;
      trackInterest({ signalType: "SCROLL_DEPTH", scrollPercent: 100, ...signal });
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  return () => window.removeEventListener("scroll", onScroll);
}

// ===== Return Visit Detection =====

export function trackReturnVisit(chefProfileId: string, cuisineType?: string) {
  if (typeof window === "undefined") return;
  const key = `foodies_visited_${chefProfileId}`;
  const last = localStorage.getItem(key);
  if (last) {
    // They've been here before — this is a return visit (strong signal)
    trackInterest({ signalType: "RETURN_VISIT", chefProfileId, cuisineType });
  }
  localStorage.setItem(key, Date.now().toString());
}
