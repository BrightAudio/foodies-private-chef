import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";

// GET /api/admin/food-trucks — list all food trucks (admin only)
export async function GET(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const trucks = await prisma.foodTruck.findMany({
    include: {
      owner: { select: { name: true, email: true } },
      menuItems: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(trucks);
}
