import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { withErrorHandler } from "@/lib/api-error-handler";

// GET /api/food-trucks/[id] — get food truck details
async function _GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const truck = await prisma.foodTruck.findUnique({
    where: { id },
    include: {
      owner: { select: { name: true } },
      menuItems: true,
    },
  });

  if (!truck) {
    return NextResponse.json({ error: "Food truck not found" }, { status: 404 });
  }

  return NextResponse.json(truck);
}

// PATCH /api/food-trucks/[id] — update food truck (owner or admin)
async function _PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const truck = await prisma.foodTruck.findUnique({ where: { id } });

  if (!truck) {
    return NextResponse.json({ error: "Food truck not found" }, { status: 404 });
  }

  // Only owner or admin can update
  if (truck.ownerId !== user.userId && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    name, description, cuisineType, imageUrl,
    location, schedule, priceRange, phone, website,
    latitude, longitude, isFeatured, isActive,
  } = body;

  const updated = await prisma.foodTruck.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(cuisineType !== undefined ? { cuisineType } : {}),
      ...(imageUrl !== undefined ? { imageUrl } : {}),
      ...(location !== undefined ? { location } : {}),
      ...(schedule !== undefined ? { schedule } : {}),
      ...(priceRange !== undefined ? { priceRange } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(website !== undefined ? { website } : {}),
      ...(latitude !== undefined ? { latitude: latitude ? Number(latitude) : null } : {}),
      ...(longitude !== undefined ? { longitude: longitude ? Number(longitude) : null } : {}),
      // Only admin can toggle featured/active
      ...(user.role === "ADMIN" && typeof isFeatured === "boolean" ? { isFeatured } : {}),
      ...(user.role === "ADMIN" && typeof isActive === "boolean" ? { isActive } : {}),
    },
    include: { menuItems: true },
  });

  return NextResponse.json(updated);
}


export const GET = withErrorHandler(_GET);
export const PATCH = withErrorHandler(_PATCH);