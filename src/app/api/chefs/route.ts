import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { getTierInfo, getMaxRate } from "@/lib/tiers";
import { cacheGet, cacheSet } from "@/lib/redis";

// GET /api/chefs — browse approved chefs (public, cached)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const specialty = searchParams.get("specialty") || undefined;
  const cuisineType = searchParams.get("cuisineType") || searchParams.get("cuisine") || undefined;
  const tier = searchParams.get("tier") || undefined;
  const minRating = Number(searchParams.get("minRating")) || 0;
  const maxPrice = Number(searchParams.get("maxPrice")) || Infinity;
  const sortBy = searchParams.get("sort") || "rating"; // rating | price
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

  // Try cache for default browse (no filters)
  const isDefaultBrowse = !specialty && !cuisineType && !tier && minRating === 0 && maxPrice === Infinity && sortBy === "rating" && page === 1;
  if (isDefaultBrowse) {
    const cached = await cacheGet("chefs:browse:default");
    if (cached) {
      return NextResponse.json(JSON.parse(cached));
    }
  }

  const chefs = await prisma.chefProfile.findMany({
    where: {
      isApproved: true,
      isActive: true,
      ...(specialty ? { specialtyDish: { contains: specialty } } : {}),
      ...(cuisineType ? { cuisineType: { contains: cuisineType } } : {}),
      ...(tier ? { tier } : {}),
      ...(maxPrice < Infinity ? { hourlyRate: { lte: maxPrice } } : {}),
    },
    include: {
      user: { select: { name: true, id: true } },
      specials: true,
      reviews: { select: { rating: true } },
    },
  });

  const chefsWithRating = chefs.map((chef) => {
    const ratings = chef.reviews.map((r) => r.rating);
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    const tierInfo = getTierInfo(chef.tier);
    return {
      id: chef.id,
      userId: chef.userId,
      name: chef.user.name,
      bio: chef.bio,
      specialtyDish: chef.specialtyDish,
      cuisineType: chef.cuisineType,
      hourlyRate: chef.hourlyRate,
      profileImageUrl: chef.profileImageUrl,
      specials: chef.specials,
      tier: chef.tier,
      tierLabel: tierInfo.label,
      tierEmoji: tierInfo.emoji,
      completedJobs: chef.completedJobs,
      avgRating: Math.round(avgRating * 10) / 10,
      reviewCount: ratings.length,
      // Trust badges
      bgCheckPassed: chef.bgCheckStatus === "clear",
      insuranceVerified: chef.insuranceVerified,
      trustScore: chef.trustScore,
      boostActive: chef.boostActive && chef.boostExpiresAt && new Date(chef.boostExpiresAt) > new Date(),
      activationStatus: chef.activationStatus,
    };
  }).filter((c) => c.avgRating >= minRating && c.activationStatus !== "RESTRICTED");

  if (sortBy === "price") {
    chefsWithRating.sort((a, b) => a.hourlyRate - b.hourlyRate);
  } else {
    // Sort by trust score (boosted chefs first, then by trust score, then rating)
    chefsWithRating.sort((a, b) => {
      if (a.boostActive && !b.boostActive) return -1;
      if (!a.boostActive && b.boostActive) return 1;
      if (b.trustScore !== a.trustScore) return b.trustScore - a.trustScore;
      return b.avgRating - a.avgRating;
    });
  }

  // Paginate
  const total = chefsWithRating.length;
  const paginated = chefsWithRating.slice((page - 1) * limit, page * limit);
  const result = { chefs: paginated, total, page, limit };

  // Cache default browse for 60 seconds
  if (isDefaultBrowse) {
    cacheSet("chefs:browse:default", JSON.stringify(result), 60).catch(() => {});
  }

  return NextResponse.json(result);
}

// POST /api/chefs — chef onboarding (requires auth)
export async function POST(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    servSafeCertNumber, servSafeCertExpiry,
    generalLiabilityPolicy, generalLiabilityExpiry,
    productLiabilityPolicy, productLiabilityExpiry,
    bio, specialtyDish, hourlyRate, specials,
    profileImageUrl,
    bgCheckConsent, bgCheckFullName, bgCheckDOB, bgCheckSSNLast4,
    bgCheckAddress, bgCheckPreviousAddress,
    fcraConsentSignature,
    governmentIdUrl, governmentIdType, selfieUrl,
    driversLicenseNumber, willTravelToHomes,
    termsAccepted, antiPoachingAccepted,
    vehicleLicensePlate, vehicleMake, vehicleModel, vehicleColor, cuisineType,
  } = body;

  // Validate required fields
  if (!servSafeCertNumber || !servSafeCertExpiry || !generalLiabilityPolicy ||
      !generalLiabilityExpiry || !productLiabilityPolicy || !productLiabilityExpiry ||
      !specialtyDish || !hourlyRate) {
    return NextResponse.json({
      error: "Missing required fields: ServSafe cert, liability insurance, specialty dish, and hourly rate are all required",
    }, { status: 400 });
  }

  // Require background check consent + FCRA signature
  if (!bgCheckConsent || !bgCheckFullName || !bgCheckDOB || !bgCheckSSNLast4 || !bgCheckAddress) {
    return NextResponse.json({
      error: "Background check authorization is required. Please complete all identity fields and consent.",
    }, { status: 400 });
  }

  if (!fcraConsentSignature) {
    return NextResponse.json({
      error: "FCRA digital signature is required.",
    }, { status: 400 });
  }

  // Require government ID + selfie
  if (!governmentIdUrl || !selfieUrl) {
    return NextResponse.json({
      error: "Government-issued ID photo and selfie are required for identity verification.",
    }, { status: 400 });
  }

  // Require terms acceptance
  if (!termsAccepted || !antiPoachingAccepted) {
    return NextResponse.json({
      error: "You must accept the Terms of Service and Non-Circumvention Agreement.",
    }, { status: 400 });
  }

  // Validate specials limit (max 3)
  if (specials && specials.length > 3) {
    return NextResponse.json({ error: "Maximum of 3 chef specials allowed" }, { status: 400 });
  }

  // Enforce Sous Chef tier rate cap for new chefs
  const sousChefMaxRate = getMaxRate("SOUS_CHEF");
  const cappedRate = Math.min(Number(hourlyRate), sousChefMaxRate);

  // Update user role to CHEF
  await prisma.user.update({
    where: { id: user.userId },
    data: { role: "CHEF" },
  });

  // Determine verification status based on submissions
  const verificationStatus = (bgCheckConsent && governmentIdUrl && selfieUrl) ? "INFO_SUBMITTED" : "NOT_STARTED";

  // Get IP and user-agent for consent logging
  const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                    req.headers.get("x-real-ip") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  const chefProfile = await prisma.chefProfile.create({
    data: {
      userId: user.userId,
      servSafeCertNumber,
      servSafeCertExpiry: new Date(servSafeCertExpiry),
      generalLiabilityPolicy,
      generalLiabilityExpiry: new Date(generalLiabilityExpiry),
      productLiabilityPolicy,
      productLiabilityExpiry: new Date(productLiabilityExpiry),
      bio: bio || null,
      specialtyDish,
      profileImageUrl: profileImageUrl || null,
      hourlyRate: cappedRate,
      bgCheckConsent: bgCheckConsent === true,
      bgCheckStatus: bgCheckConsent ? "PENDING" : "NOT_SUBMITTED",
      bgCheckSubmittedAt: bgCheckConsent ? new Date() : null,
      bgCheckFullName: bgCheckFullName || null,
      bgCheckDOB: bgCheckDOB || null,
      bgCheckSSNLast4: bgCheckSSNLast4 || null,
      bgCheckAddress: bgCheckAddress || null,
      bgCheckPreviousAddress: bgCheckPreviousAddress || null,
      fcraConsentSignature: fcraConsentSignature || null,
      fcraConsentTimestamp: fcraConsentSignature ? new Date() : null,
      fcraConsentIP: fcraConsentSignature ? ipAddress : null,
      governmentIdUrl: governmentIdUrl || null,
      governmentIdType: governmentIdType || null,
      selfieUrl: selfieUrl || null,
      idVerificationStatus: (governmentIdUrl && selfieUrl) ? "PENDING" : "NOT_SUBMITTED",
      driversLicenseNumber: driversLicenseNumber || null,
      willTravelToHomes: willTravelToHomes !== false,
      verificationStatus,
      termsAcceptedAt: termsAccepted ? new Date() : null,
      antiPoachingAcceptedAt: antiPoachingAccepted ? new Date() : null,
      vehicleLicensePlate: vehicleLicensePlate || null,
      vehicleMake: vehicleMake || null,
      vehicleModel: vehicleModel || null,
      vehicleColor: vehicleColor || null,
      cuisineType: cuisineType || null,
      specials: specials
        ? {
            create: specials.map((s: { name: string; description: string; imageUrl?: string }) => ({
              name: s.name,
              description: s.description,
              imageUrl: s.imageUrl || null,
            })),
          }
        : undefined,
    },
    include: { specials: true },
  });

  // Log consent records for FCRA, background check, terms, and anti-poaching
  const consentLogs = [];
  if (bgCheckConsent) {
    consentLogs.push({
      chefProfileId: chefProfile.id,
      consentType: "BACKGROUND_CHECK",
      consentText: "I authorize Foodies to conduct a background check, which may include criminal history, sex offender registry, and identity verification.",
      signature: fcraConsentSignature || bgCheckFullName,
      ipAddress,
      userAgent,
    });
  }
  if (fcraConsentSignature) {
    consentLogs.push({
      chefProfileId: chefProfile.id,
      consentType: "FCRA",
      consentText: "FCRA Disclosure — I authorize Foodies to obtain a consumer report / background investigation about me.",
      signature: fcraConsentSignature,
      ipAddress,
      userAgent,
    });
  }
  if (termsAccepted) {
    consentLogs.push({
      chefProfileId: chefProfile.id,
      consentType: "TERMS",
      consentText: "I have read and agree to the Foodies Terms of Service.",
      signature: fcraConsentSignature || bgCheckFullName,
      ipAddress,
      userAgent,
    });
  }
  if (antiPoachingAccepted) {
    consentLogs.push({
      chefProfileId: chefProfile.id,
      consentType: "ANTI_POACHING",
      consentText: "I have read and agree to the Non-Circumvention Agreement. I understand that violating these terms may result in penalties, suspension, or legal action.",
      signature: fcraConsentSignature || bgCheckFullName,
      ipAddress,
      userAgent,
    });
  }

  if (consentLogs.length > 0) {
    await prisma.consentLog.createMany({ data: consentLogs });
  }

  return NextResponse.json(chefProfile, { status: 201 });
}
