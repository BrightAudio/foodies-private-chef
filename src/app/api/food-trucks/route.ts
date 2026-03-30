import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";

// GET /api/food-trucks — list active food trucks (public)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cuisine = searchParams.get("cuisine") || undefined;
  const featured = searchParams.get("featured");

  const trucks = await prisma.foodTruck.findMany({
    where: {
      isActive: true,
      ...(featured === "true" ? { isFeatured: true } : {}),
      ...(cuisine ? { cuisineType: { contains: cuisine } } : {}),
    },
    include: {
      owner: { select: { name: true } },
      menuItems: { where: { isAvailable: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(trucks);
}

// POST /api/food-trucks — create a food truck (requires auth)
export async function POST(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    name, description, cuisineType, imageUrl,
    location, schedule, priceRange, phone, website,
    latitude, longitude, menuItems,
  } = body;

  if (!name || !description || !cuisineType || !location) {
    return NextResponse.json(
      { error: "Name, description, cuisine type, and location are required" },
      { status: 400 }
    );
  }

  const truck = await prisma.foodTruck.create({
    data: {
      ownerId: user.userId,
      name,
      description,
      cuisineType,
      imageUrl: imageUrl || null,
      location,
      schedule: schedule || null,
      priceRange: priceRange || "$$",
      phone: phone || null,
      website: website || null,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      menuItems: menuItems?.length
        ? {
            create: menuItems.map((item: { name: string; description?: string; price: number; imageUrl?: string }) => ({
              name: item.name,
              description: item.description || null,
              price: Number(item.price),
              imageUrl: item.imageUrl || null,
            })),
          }
        : undefined,
    },
    include: { menuItems: true },
  });

  return NextResponse.json(truck, { status: 201 });
}
