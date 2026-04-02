import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";

// GET /api/client/profile — get current client's profile
export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.clientProfile.findUnique({
    where: { userId: token.userId },
  });

  const user = await prisma.user.findUnique({
    where: { id: token.userId },
    select: { name: true, email: true },
  });

  return NextResponse.json({
    profile: profile ? {
      ...profile,
      favoriteCuisines: profile.favoriteCuisines ? JSON.parse(profile.favoriteCuisines) : [],
      dietaryRestrictions: profile.dietaryRestrictions ? JSON.parse(profile.dietaryRestrictions) : [],
      allergies: profile.allergies ? JSON.parse(profile.allergies) : [],
    } : null,
    user,
  });
}

// POST /api/client/profile — create or update client profile
export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { bio, profileImageUrl, favoriteCuisines, dietaryRestrictions, allergies } = body;

  const data = {
    bio: bio || null,
    profileImageUrl: profileImageUrl || null,
    favoriteCuisines: Array.isArray(favoriteCuisines) ? JSON.stringify(favoriteCuisines) : null,
    dietaryRestrictions: Array.isArray(dietaryRestrictions) ? JSON.stringify(dietaryRestrictions) : null,
    allergies: Array.isArray(allergies) ? JSON.stringify(allergies) : null,
  };

  const profile = await prisma.clientProfile.upsert({
    where: { userId: token.userId },
    update: data,
    create: { userId: token.userId, ...data },
  });

  return NextResponse.json({
    ...profile,
    favoriteCuisines: profile.favoriteCuisines ? JSON.parse(profile.favoriteCuisines) : [],
    dietaryRestrictions: profile.dietaryRestrictions ? JSON.parse(profile.dietaryRestrictions) : [],
    allergies: profile.allergies ? JSON.parse(profile.allergies) : [],
  });
}
