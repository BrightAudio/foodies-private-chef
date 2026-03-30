// Chef Tier System
// Sous Chef → Chef → Master Chef
// Progression based on completed jobs + average review rating

export const TIERS = {
  SOUS_CHEF: {
    label: "Sous Chef",
    emoji: "🔪",
    maxRate: 60,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10 border-blue-500/20",
    badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  },
  CHEF: {
    label: "Chef",
    emoji: "👨‍🍳",
    maxRate: 125,
    color: "text-gold",
    bgColor: "bg-gold/10 border-gold/20",
    badgeColor: "bg-gold/10 text-gold border border-gold/20",
  },
  MASTER_CHEF: {
    label: "Master Chef",
    emoji: "⭐",
    maxRate: Infinity,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10 border-purple-500/20",
    badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  },
} as const;

export type TierKey = keyof typeof TIERS;

// Requirements to reach each tier
export const TIER_REQUIREMENTS = {
  SOUS_CHEF: { completedJobs: 0, minRating: 0 },
  CHEF: { completedJobs: 15, minRating: 4.0 },
  MASTER_CHEF: { completedJobs: 50, minRating: 4.5 },
} as const;

// Determine what tier a chef qualifies for based on stats
export function calculateTier(completedJobs: number, avgRating: number): TierKey {
  if (completedJobs >= TIER_REQUIREMENTS.MASTER_CHEF.completedJobs &&
      avgRating >= TIER_REQUIREMENTS.MASTER_CHEF.minRating) {
    return "MASTER_CHEF";
  }
  if (completedJobs >= TIER_REQUIREMENTS.CHEF.completedJobs &&
      avgRating >= TIER_REQUIREMENTS.CHEF.minRating) {
    return "CHEF";
  }
  return "SOUS_CHEF";
}

// Get the max hourly rate for a tier
export function getMaxRate(tier: string): number {
  return TIERS[tier as TierKey]?.maxRate ?? TIERS.SOUS_CHEF.maxRate;
}

// Get tier display info
export function getTierInfo(tier: string) {
  return TIERS[tier as TierKey] ?? TIERS.SOUS_CHEF;
}

// Calculate progress toward next tier
export function getNextTierProgress(tier: string, completedJobs: number, avgRating: number) {
  if (tier === "MASTER_CHEF") {
    return { nextTier: null, jobsNeeded: 0, ratingNeeded: 0, jobProgress: 100, ratingProgress: 100 };
  }

  const nextTier = tier === "SOUS_CHEF" ? "CHEF" : "MASTER_CHEF";
  const req = TIER_REQUIREMENTS[nextTier];

  return {
    nextTier,
    nextTierInfo: TIERS[nextTier],
    jobsNeeded: Math.max(0, req.completedJobs - completedJobs),
    ratingNeeded: Math.max(0, Math.round((req.minRating - avgRating) * 10) / 10),
    jobProgress: Math.min(100, Math.round((completedJobs / req.completedJobs) * 100)),
    ratingProgress: req.minRating > 0 ? Math.min(100, Math.round((avgRating / req.minRating) * 100)) : 100,
  };
}

// Trust score calculation (0-100 scale)
export function calculateTrustScore(params: {
  avgRating: number;      // 0-5
  completedJobs: number;
  bgCheckPassed: boolean;
  insuranceVerified: boolean;
  openIncidents: number;
  tier: string;
}): number {
  let score = 0;

  // Rating component (max 25 pts)
  score += Math.min(25, params.avgRating * 5);

  // Completed jobs component (max 20 pts, diminishing returns)
  score += Math.min(20, Math.log2(params.completedJobs + 1) * 4);

  // Background check (20 pts)
  if (params.bgCheckPassed) score += 20;

  // Insurance verified (20 pts)
  if (params.insuranceVerified) score += 20;

  // Tier bonus (max 15 pts)
  if (params.tier === "MASTER_CHEF") score += 15;
  else if (params.tier === "CHEF") score += 10;
  else score += 5;

  // Incident penalty (-10 per open incident)
  score -= params.openIncidents * 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// Determine activation status based on chef profile state
export function determineActivationStatus(chef: {
  bgCheckStatus?: string;
  insuranceStatus?: string;
  isApproved?: boolean;
  openIncidents?: number;
}): string {
  // Restricted if has severe unresolved incidents
  if ((chef.openIncidents ?? 0) > 0) return "RESTRICTED";

  // Active if fully compliant
  if (chef.isApproved && chef.bgCheckStatus === "clear" && chef.insuranceStatus === "verified") {
    return "ACTIVE";
  }

  // Pending compliance if approved but missing insurance or bg check
  if (chef.isApproved) return "PENDING_COMPLIANCE";

  return "INCOMPLETE";
}
