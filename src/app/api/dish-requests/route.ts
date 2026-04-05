import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { withErrorHandler } from "@/lib/api-error-handler";
import { sanitizeText } from "@/lib/sanitize";

// POST /api/dish-requests — client creates a custom dish request (Chef/Master Chef only)
async function _POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { bookingId, chefProfileId, dishName, description, guestCount } = body;

  if (!chefProfileId || !dishName?.trim() || !description?.trim()) {
    return NextResponse.json({ error: "chefProfileId, dishName, and description are required" }, { status: 400 });
  }

  // Verify chef is Chef or Master Chef tier (custom requests not available for Sous Chef)
  const chef = await prisma.chefProfile.findUnique({
    where: { id: chefProfileId },
    select: { id: true, tier: true, userId: true },
  });
  if (!chef) {
    return NextResponse.json({ error: "Chef not found" }, { status: 404 });
  }
  if (chef.tier === "SOUS_CHEF") {
    return NextResponse.json({ error: "Custom dish requests are only available for Chef and Master Chef tier" }, { status: 403 });
  }

  const dishRequest = await prisma.dishRequest.create({
    data: {
      bookingId: bookingId || null,
      clientId: token.userId,
      chefProfileId,
      dishName: sanitizeText(dishName),
      description: sanitizeText(description),
      guestCount: Number(guestCount) || 2,
      status: "PENDING",
    },
  });

  return NextResponse.json(dishRequest, { status: 201 });
}

// GET /api/dish-requests — get dish requests for current user (client sees theirs, chef sees theirs)
async function _GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get("bookingId");

  if (token.role === "CHEF") {
    const profile = await prisma.chefProfile.findUnique({
      where: { userId: token.userId },
      select: { id: true },
    });
    if (!profile) {
      return NextResponse.json({ error: "Chef profile not found" }, { status: 404 });
    }

    const requests = await prisma.dishRequest.findMany({
      where: {
        chefProfileId: profile.id,
        ...(bookingId ? { bookingId } : {}),
      },
      include: { client: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(requests);
  }

  // Client
  const requests = await prisma.dishRequest.findMany({
    where: {
      clientId: token.userId,
      ...(bookingId ? { bookingId } : {}),
    },
    include: {
      chefProfile: { select: { id: true, user: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(requests);
}

// PATCH /api/dish-requests — chef quotes (adds grocery list) or client approves/rejects
async function _PATCH(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { requestId, action, groceryItems, estimatedGroceryCost, chefNotes, clientNotes } = body;

  if (!requestId || !action) {
    return NextResponse.json({ error: "requestId and action are required" }, { status: 400 });
  }

  const dishRequest = await prisma.dishRequest.findUnique({ where: { id: requestId } });
  if (!dishRequest) {
    return NextResponse.json({ error: "Dish request not found" }, { status: 404 });
  }

  // Chef actions: quote (add grocery list)
  if (action === "quote" && token.role === "CHEF") {
    const profile = await prisma.chefProfile.findUnique({
      where: { userId: token.userId },
      select: { id: true },
    });
    if (!profile || profile.id !== dishRequest.chefProfileId) {
      return NextResponse.json({ error: "Not your dish request" }, { status: 403 });
    }

    let groceryJson: string | null = null;
    if (groceryItems && Array.isArray(groceryItems)) {
      groceryJson = JSON.stringify(groceryItems.map((g: { item: string; qty: string; estCost: number }) => ({
        item: String(g.item || "").trim(),
        qty: String(g.qty || "").trim(),
        estCost: Number(g.estCost) || 0,
      })).filter((g: { item: string }) => g.item));
    }

    const updated = await prisma.dishRequest.update({
      where: { id: requestId },
      data: {
        status: "QUOTED",
        groceryItems: groceryJson,
        estimatedGroceryCost: estimatedGroceryCost ? Number(estimatedGroceryCost) : null,
        chefNotes: chefNotes?.trim() || null,
      },
    });
    return NextResponse.json(updated);
  }

  // Client actions: approve or reject
  if ((action === "approve" || action === "reject") && dishRequest.clientId === token.userId) {
    const updated = await prisma.dishRequest.update({
      where: { id: requestId },
      data: {
        status: action === "approve" ? "APPROVED" : "REJECTED",
        clientNotes: clientNotes?.trim() || null,
      },
    });
    return NextResponse.json(updated);
  }

  // Chef action: cancel
  if (action === "cancel") {
    const isChef = token.role === "CHEF";
    const isClient = dishRequest.clientId === token.userId;
    if (!isChef && !isClient) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    const updated = await prisma.dishRequest.update({
      where: { id: requestId },
      data: { status: "CANCELLED" },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}


export const POST = withErrorHandler(_POST);
export const GET = withErrorHandler(_GET);
export const PATCH = withErrorHandler(_PATCH);