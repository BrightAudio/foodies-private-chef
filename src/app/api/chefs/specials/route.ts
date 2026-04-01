import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";

// GET /api/chefs/specials — get current chef's specials
export async function GET(req: NextRequest) {
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
    orderBy: [{ isWeeklySpecial: "desc" }, { createdAt: "desc" }],
  });

  // Check if weekly special needs rotation (current week's Monday)
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const currentWeeklySpecial = specials.find(
    (s) => s.isWeeklySpecial && s.weekStartDate && new Date(s.weekStartDate).getTime() >= monday.getTime()
  );

  return NextResponse.json({
    specials,
    needsWeeklyRotation: !currentWeeklySpecial,
    currentWeekStart: monday.toISOString(),
  });
}

// POST /api/chefs/specials — create a new special
export async function POST(req: NextRequest) {
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
  const { name, description, price, imageUrl, isWeeklySpecial } = body;

  if (!name?.trim() || !description?.trim()) {
    return NextResponse.json({ error: "Name and description are required" }, { status: 400 });
  }

  if (price != null && (isNaN(Number(price)) || Number(price) < 0)) {
    return NextResponse.json({ error: "Price must be a positive number" }, { status: 400 });
  }

  // If setting as weekly special, clear any existing weekly special for this week
  let weekStartDate: Date | null = null;
  if (isWeeklySpecial) {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    weekStartDate = monday;

    // Unset previous weekly specials
    await prisma.chefSpecial.updateMany({
      where: { chefProfileId: profile.id, isWeeklySpecial: true },
      data: { isWeeklySpecial: false, weekStartDate: null },
    });
  }

  const special = await prisma.chefSpecial.create({
    data: {
      chefProfileId: profile.id,
      name: name.trim(),
      description: description.trim(),
      price: price ? Number(price) : 0,
      imageUrl: imageUrl || null,
      isWeeklySpecial: !!isWeeklySpecial,
      weekStartDate,
    },
  });

  return NextResponse.json(special, { status: 201 });
}

// PATCH /api/chefs/specials — set an existing special as this week's special
export async function PATCH(req: NextRequest) {
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

  // Unset all weekly specials, then set the chosen one
  await prisma.chefSpecial.updateMany({
    where: { chefProfileId: profile.id, isWeeklySpecial: true },
    data: { isWeeklySpecial: false, weekStartDate: null },
  });

  const updated = await prisma.chefSpecial.update({
    where: { id: specialId },
    data: { isWeeklySpecial: true, weekStartDate: monday },
  });

  return NextResponse.json(updated);
}

// DELETE /api/chefs/specials — delete a special
export async function DELETE(req: NextRequest) {
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
