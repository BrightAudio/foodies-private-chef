import { describe, it, expect } from "vitest";
import {
  calculateTier,
  getRateRange,
  getMaxRate,
  isRateInTierRange,
  getTierInfo,
  getNextTierProgress,
  calculateTrustScore,
  determineActivationStatus,
} from "@/lib/tiers";

describe("calculateTier", () => {
  it("returns SOUS_CHEF for new chefs", () => {
    expect(calculateTier(0, 0)).toBe("SOUS_CHEF");
    expect(calculateTier(5, 3.5)).toBe("SOUS_CHEF");
  });

  it("returns CHEF when 15+ jobs and 4.0+ rating", () => {
    expect(calculateTier(15, 4.0)).toBe("CHEF");
    expect(calculateTier(30, 4.2)).toBe("CHEF");
  });

  it("returns MASTER_CHEF when 50+ jobs and 4.5+ rating", () => {
    expect(calculateTier(50, 4.5)).toBe("MASTER_CHEF");
    expect(calculateTier(100, 5.0)).toBe("MASTER_CHEF");
  });

  it("requires both jobs AND rating for promotion", () => {
    expect(calculateTier(50, 3.0)).toBe("SOUS_CHEF"); // high jobs, low rating
    expect(calculateTier(5, 5.0)).toBe("SOUS_CHEF"); // low jobs, high rating
    expect(calculateTier(15, 3.9)).toBe("SOUS_CHEF"); // just under Chef threshold
  });
});

describe("getRateRange", () => {
  it("returns correct range for each tier", () => {
    expect(getRateRange("SOUS_CHEF")).toEqual({ min: 40, max: 75 });
    expect(getRateRange("CHEF")).toEqual({ min: 75, max: 120 });
    expect(getRateRange("MASTER_CHEF")).toEqual({ min: 120, max: 200 });
  });

  it("defaults to SOUS_CHEF for unknown tier", () => {
    expect(getRateRange("UNKNOWN")).toEqual({ min: 40, max: 75 });
  });
});

describe("getMaxRate", () => {
  it("returns max rate for tier", () => {
    expect(getMaxRate("CHEF")).toBe(120);
    expect(getMaxRate("MASTER_CHEF")).toBe(200);
  });
});

describe("isRateInTierRange", () => {
  it("validates rate within range", () => {
    expect(isRateInTierRange(50, "SOUS_CHEF")).toBe(true);
    expect(isRateInTierRange(30, "SOUS_CHEF")).toBe(false);
    expect(isRateInTierRange(100, "CHEF")).toBe(true);
    expect(isRateInTierRange(200, "CHEF")).toBe(false);
  });
});

describe("getTierInfo", () => {
  it("returns tier display info", () => {
    const info = getTierInfo("CHEF");
    expect(info.label).toBe("Chef");
    expect(info.emoji).toBe("👨‍🍳");
  });

  it("defaults to SOUS_CHEF for unknown tier", () => {
    expect(getTierInfo("INVALID").label).toBe("Sous Chef");
  });
});

describe("getNextTierProgress", () => {
  it("returns null nextTier for MASTER_CHEF", () => {
    const progress = getNextTierProgress("MASTER_CHEF", 100, 5.0);
    expect(progress.nextTier).toBeNull();
    expect(progress.jobProgress).toBe(100);
  });

  it("calculates progress toward CHEF", () => {
    const progress = getNextTierProgress("SOUS_CHEF", 10, 3.5);
    expect(progress.nextTier).toBe("CHEF");
    expect(progress.jobsNeeded).toBe(5);
    expect(progress.ratingNeeded).toBe(0.5);
  });

  it("calculates progress toward MASTER_CHEF", () => {
    const progress = getNextTierProgress("CHEF", 30, 4.3);
    expect(progress.nextTier).toBe("MASTER_CHEF");
    expect(progress.jobsNeeded).toBe(20);
  });
});

describe("calculateTrustScore", () => {
  it("returns high score for fully verified chef", () => {
    const score = calculateTrustScore({
      avgRating: 5.0,
      completedJobs: 50,
      bgCheckPassed: true,
      insuranceVerified: true,
      openIncidents: 0,
      tier: "MASTER_CHEF",
    });
    expect(score).toBeGreaterThan(80);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("returns low score for new unverified chef", () => {
    const score = calculateTrustScore({
      avgRating: 0,
      completedJobs: 0,
      bgCheckPassed: false,
      insuranceVerified: false,
      openIncidents: 0,
      tier: "SOUS_CHEF",
    });
    expect(score).toBeLessThan(20);
  });

  it("penalizes open incidents", () => {
    const base = calculateTrustScore({
      avgRating: 4.0, completedJobs: 20, bgCheckPassed: true,
      insuranceVerified: true, openIncidents: 0, tier: "CHEF",
    });
    const withIncident = calculateTrustScore({
      avgRating: 4.0, completedJobs: 20, bgCheckPassed: true,
      insuranceVerified: true, openIncidents: 2, tier: "CHEF",
    });
    expect(withIncident).toBe(base - 20);
  });

  it("clamps between 0 and 100", () => {
    const score = calculateTrustScore({
      avgRating: 0, completedJobs: 0, bgCheckPassed: false,
      insuranceVerified: false, openIncidents: 10, tier: "SOUS_CHEF",
    });
    expect(score).toBe(0);
  });
});

describe("determineActivationStatus", () => {
  it("returns ACTIVE for fully compliant chef", () => {
    expect(determineActivationStatus({
      bgCheckStatus: "CLEAR", insuranceStatus: "verified",
      isApproved: true, openIncidents: 0,
    })).toBe("ACTIVE");
  });

  it("returns RESTRICTED for chef with open incidents", () => {
    expect(determineActivationStatus({
      bgCheckStatus: "CLEAR", insuranceStatus: "verified",
      isApproved: true, openIncidents: 1,
    })).toBe("RESTRICTED");
  });

  it("returns PENDING_COMPLIANCE for approved but missing docs", () => {
    expect(determineActivationStatus({
      bgCheckStatus: "PENDING", insuranceStatus: "pending",
      isApproved: true, openIncidents: 0,
    })).toBe("PENDING_COMPLIANCE");
  });

  it("returns INCOMPLETE for unapproved chef", () => {
    expect(determineActivationStatus({
      isApproved: false, openIncidents: 0,
    })).toBe("INCOMPLETE");
  });
});
