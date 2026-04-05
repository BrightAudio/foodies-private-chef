import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { withErrorHandler } from "@/lib/api-error-handler";
import { sanitizeText } from "@/lib/sanitize";

// GET /api/chefs/specials — get current chef's specials
async function _GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token || token.role !== "CHEF") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.chefProfile.findUnique({
    where: { userId: token.userId },
    select: { id: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "Chef profile not found" }, { status: 404 });
  }

  const specials = await prisma.chefSpecial.findMany({
    where: { chefProfileId: profile.id },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
  });

  // Check if featured dish needs rotation (bi-weekly, starting from Monday)
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  // Align to bi-weekly cycle (even weeks)
  const weekNum = Math.floor(monday.getTime() / (7 * 86400000));
  if (weekNum % 2 !== 0) monday.setDate(monday.getDate() - 7);
  monday.setHours(0, 0, 0, 0);

  const currentFeatured = specials.find(
    (s) => s.isFeatured && s.featuredStartDate && new Date(s.featuredStartDate).getTime() >= monday.getTime()
  );

  return NextResponse.json({
    specials,
    needsRotation: !currentFeatured,
    currentPeriodStart: monday.toISOString(),
  });
}

// POST /api/chefs/specials — create a new special
async function _POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token || token.role !== "CHEF") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.chefProfile.findUnique({
    where: { userId: token.userId },
    select: { id: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "Chef profile not found" }, { status: 404 });
  }

  const body = await req.json();
  const { name, description, price, imageUrl, isFeatured, groceryItems, estimatedGroceryCost } = body;

  if (!name?.trim() || !description?.trim()) {
    return NextResponse.json({ error: "Name and description are required" }, { status: 400 });
  }

  if (price != null && (isNaN(Number(price)) || Number(price) < 0)) {
    return NextResponse.json({ error: "Price must be a positive number" }, { status: 400 });
  }

  // Validate grocery items if provided
  let groceryJson: string | null = null;
  if (groceryItems && Array.isArray(groceryItems)) {
    groceryJson = JSON.stringify(groceryItems.map((g: { item: string; qty: string; estCost: number }) => ({
      item: String(g.item || "").trim(),
      qty: String(g.qty || "").trim(),
      estCost: Number(g.estCost) || 0,
    })).filter((g: { item: string }) => g.item));
  }

  // If setting as featured dish, clear any existing featured for this period
  let featuredStartDate: Date | null = null;
  if (isFeatured) {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    featuredStartDate = monday;

    // Unset previous featured dishes
    await prisma.chefSpecial.updateMany({
      where: { chefProfileId: profile.id, isFeatured: true },
      data: { isFeatured: false, featuredStartDate: null },
    });
  }

  const special = await prisma.chefSpecial.create({
    data: {
      chefProfileId: profile.id,
      name: sanitizeText(name),
      description: sanitizeText(description),
      price: price ? Number(price) : 0,
      imageUrl: imageUrl || null,
      isFeatured: !!isFeatured,
      featuredStartDate,
      groceryItems: groceryJson,
      estimatedGroceryCost: estimatedGroceryCost ? Number(estimatedGroceryCost) : null,
    },
  });

  return NextResponse.json(special, { status: 201 });
}

// PATCH /api/chefs/specials — set an existing special as this week's special
async function _PATCH(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token || token.role !== "CHEF") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.chefProfile.findUnique({
    where: { userId: token.userId },
    select: { id: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "Chef profile not found" }, { status: 404 });
  }

  const body = await req.json();
  const { specialId } = body;

  if (!specialId) {
    return NextResponse.json({ error: "specialId is required" }, { status: 400 });
  }

  // Verify ownership
  const special = await prisma.chefSpecial.findFirst({
    where: { id: specialId, chefProfileId: profile.id },
  });
  if (!special) {
    return NextResponse.json({ error: "Special not found" }, { status: 404 });
  }

  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  // Unset all featured dishes, then set the chosen one
  await prisma.chefSpecial.updateMany({
    where: { chefProfileId: profile.id, isFeatured: true },
    data: { isFeatured: false, featuredStartDate: null },
  });

  const updated = await prisma.chefSpecial.update({
    where: { id: specialId },
    data: { isFeatured: true, featuredStartDate: monday },
  });

  return NextResponse.json(updated);
}

// DELETE /api/chefs/specials — delete a special
async function _DELETE(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token || token.role !== "CHEF") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.chefProfile.findUnique({
    where: { userId: token.userId },
    select: { id: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "Chef profile not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const specialId = searchParams.get("id");
  if (!specialId) {
    return NextResponse.json({ error: "id param is required" }, { status: 400 });
  }

  const special = await prisma.chefSpecial.findFirst({
    where: { id: specialId, chefProfileId: profile.id },
  });
  if (!special) {
    return NextResponse.json({ error: "Special not found" }, { status: 404 });
  }

  await prisma.chefSpecial.delete({ where: { id: specialId } });
  return NextResponse.json({ ok: true });
}


export const GET = withErrorHandler(_GET);
export const POST = withErrorHandler(_POST);
export const PATCH = withErrorHandler(_PATCH);
export const DELETE = withErrorHandler(_DELETE);