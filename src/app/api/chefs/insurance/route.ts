import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";

// PATCH /api/chefs/insurance — Upload/update insurance doc + expiry
export async function PATCH(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user || user.role !== "CHEF") {
    return NextResponse.json({ error: "Only chefs can update insurance" }, { status: 403 });
  }

  const { insuranceDocUrl, insuranceExpiry } = await req.json();

  if (!insuranceDocUrl || !insuranceExpiry) {
    return NextResponse.json({ error: "insuranceDocUrl and insuranceExpiry required" }, { status: 400 });
  }

  const chef = await prisma.chefProfile.findUnique({ where: { userId: user.userId } });
  if (!chef) {
    return NextResponse.json({ error: "Chef profile not found" }, { status: 404 });
  }

  const updated = await prisma.chefProfile.update({
    where: { id: chef.id },
    data: {
      insuranceDocUrl,
      insuranceExpiry: new Date(insuranceExpiry),
      insuranceVerified: false, // Admin must re-verify
    },
  });

  return NextResponse.json({
    insuranceDocUrl: updated.insuranceDocUrl,
    insuranceExpiry: updated.insuranceExpiry,
    insuranceVerified: updated.insuranceVerified,
  });
}

// GET /api/chefs/insurance — Get current insurance status
export async function GET(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chef = await prisma.chefProfile.findUnique({
    where: { userId: user.userId },
    select: {
      insuranceDocUrl: true,
      insuranceExpiry: true,
      insuranceVerified: true,
    },
  });

  if (!chef) {
    return NextResponse.json({ error: "Chef profile not found" }, { status: 404 });
  }

  const isExpired = chef.insuranceExpiry ? new Date(chef.insuranceExpiry) < new Date() : true;

  return NextResponse.json({
    ...chef,
    isExpired,
  });
}
