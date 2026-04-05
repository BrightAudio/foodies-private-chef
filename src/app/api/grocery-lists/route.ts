import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { sanitizeText } from "@/lib/sanitize";
import { createNotification } from "@/lib/notifications";
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Minimum tier or job count to create grocery lists
const GROCERY_LIST_MIN_TIER = ["CHEF", "MASTER_CHEF"];
const GROCERY_LIST_MIN_JOBS = 10; // Fallback: even SOUS_CHEF with 10+ jobs

interface GroceryItem {
  name: string;
  quantity: string;
  unit: string;
  estimatedPrice?: number;
}

// AI-powered grocery cost estimation
async function estimateGroceryCosts(
  items: { name: string; quantity: string; unit: string }[],
  location: string
): Promise<{ items: GroceryItem[]; total: number; stores: string[]; model: string }> {
  if (!openai) {
    // Fallback: reasonable per-item estimates without AI
    const estimated = items.map((item) => ({
      ...item,
      estimatedPrice: Math.round((2 + Math.random() * 8) * 100) / 100,
    }));
    return {
      items: estimated,
      total: estimated.reduce((s, i) => s + (i.estimatedPrice || 0), 0),
      stores: ["Local grocery stores"],
      model: "fallback",
    };
  }

  const itemList = items
    .map((i, idx) => `${idx + 1}. ${i.quantity} ${i.unit} of ${i.name}`)
    .join("\n");

  const prompt = `You are a grocery price estimation assistant. Given a grocery list and a general location, estimate the cost of each item at typical grocery stores near that area. Use realistic US grocery prices.

Location: ${sanitizeText(location)}

Grocery list:
${itemList}

Respond in ONLY valid JSON (no markdown, no code fences):
{
  "items": [
    { "name": "item name", "quantity": "amount", "unit": "unit", "estimatedPrice": 0.00 }
  ],
  "total": 0.00,
  "stores": ["Store Name 1", "Store Name 2"]
}

Use current average US grocery prices. The stores array should list 2-3 popular grocery chains near the location. Prices should be realistic per the quantity requested.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content?.trim() || "";
    // Strip markdown code fences if present
    const cleaned = content.replace(/^```json?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      items: parsed.items.map((i: GroceryItem) => ({
        name: String(i.name),
        quantity: String(i.quantity),
        unit: String(i.unit),
        estimatedPrice: Math.round(Number(i.estimatedPrice || 0) * 100) / 100,
      })),
      total: Math.round(Number(parsed.total || 0) * 100) / 100,
      stores: Array.isArray(parsed.stores) ? parsed.stores.map(String) : [],
      model: "gpt-4o-mini",
    };
  } catch (err) {
    console.error("AI estimation error:", err);
    // Fallback on error
    const estimated = items.map((item) => ({
      ...item,
      estimatedPrice: Math.round((3 + Math.random() * 6) * 100) / 100,
    }));
    return {
      items: estimated,
      total: estimated.reduce((s, i) => s + (i.estimatedPrice || 0), 0),
      stores: ["Local grocery stores"],
      model: "fallback-error",
    };
  }
}

// Check if chef is eligible for grocery cards
function isChefEligible(tier: string, completedJobs: number): boolean {
  if (GROCERY_LIST_MIN_TIER.includes(tier)) return true;
  if (completedJobs >= GROCERY_LIST_MIN_JOBS) return true;
  return false;
}

// GET /api/grocery-lists — list grocery lists
export async function GET(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get("bookingId");
  const listId = searchParams.get("id");

  if (listId) {
    const list = await prisma.groceryList.findUnique({
      where: { id: listId },
      include: {
        booking: { select: { clientId: true, chefProfileId: true, address: true } },
        chefProfile: { select: { userId: true, user: { select: { name: true } } } },
        groceryCards: { select: { id: true, status: true, budget: true, spent: true } },
      },
    });
    if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const isChef = list.chefProfile.userId === user.userId;
    const isClient = list.booking.clientId === user.userId;
    const isAdmin = user.role === "ADMIN";
    if (!isChef && !isClient && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json(list);
  }

  if (bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { clientId: true, chefProfileId: true },
    });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    const chefProfile = await prisma.chefProfile.findFirst({ where: { id: booking.chefProfileId, userId: user.userId } });
    if (user.role !== "ADMIN" && booking.clientId !== user.userId && !chefProfile) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const lists = await prisma.groceryList.findMany({
      where: { bookingId },
      include: { groceryCards: { select: { id: true, status: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(lists);
  }

  // Chef: own lists
  if (user.role === "CHEF") {
    const profile = await prisma.chefProfile.findFirst({ where: { userId: user.userId } });
    if (!profile) return NextResponse.json([], { status: 200 });
    const lists = await prisma.groceryList.findMany({
      where: { chefProfileId: profile.id },
      include: { booking: { select: { date: true, client: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(lists);
  }

  // Client: lists for their bookings
  const bookings = await prisma.booking.findMany({ where: { clientId: user.userId }, select: { id: true } });
  const lists = await prisma.groceryList.findMany({
    where: { bookingId: { in: bookings.map((b) => b.id) } },
    include: { chefProfile: { select: { user: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(lists);
}

// POST /api/grocery-lists — chef creates a grocery list with AI pricing
export async function POST(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { bookingId, items } = body as { bookingId: string; items: { name: string; quantity: string; unit: string }[] };

  if (!bookingId || !items?.length) {
    return NextResponse.json({ error: "bookingId and items[] are required" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { clientId: true, chefProfileId: true, status: true, address: true, subtotal: true },
  });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  // Only chef for this booking can create
  const chefProfile = await prisma.chefProfile.findFirst({
    where: { id: booking.chefProfileId, userId: user.userId },
  });
  if (!chefProfile && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only the booking's chef can create a grocery list" }, { status: 403 });
  }

  const profile = chefProfile || await prisma.chefProfile.findUnique({ where: { id: booking.chefProfileId } });
  if (!profile) return NextResponse.json({ error: "Chef profile not found" }, { status: 404 });

  // Eligibility check
  if (!isChefEligible(profile.tier, profile.completedJobs)) {
    return NextResponse.json({
      error: `Grocery cards are available for Chef/Master Chef tier or 10+ completed jobs. You have ${profile.completedJobs} jobs as ${profile.tier}.`,
    }, { status: 403 });
  }

  const validStatuses = ["ACCEPTED", "CONFIRMED", "PREPARING"];
  if (!validStatuses.includes(booking.status)) {
    return NextResponse.json({ error: "Booking must be accepted/confirmed before creating a grocery list" }, { status: 400 });
  }

  // Check no pending list already exists
  const existing = await prisma.groceryList.findFirst({
    where: { bookingId, status: { in: ["PENDING", "APPROVED"] } },
  });
  if (existing) {
    return NextResponse.json({ error: "A pending or approved grocery list already exists for this booking" }, { status: 409 });
  }

  // Sanitize items
  const sanitizedItems = items.map((i: { name: string; quantity: string; unit: string }) => ({
    name: sanitizeText(i.name).slice(0, 100),
    quantity: sanitizeText(i.quantity).slice(0, 20),
    unit: sanitizeText(i.unit).slice(0, 20),
  }));

  // AI estimate
  const estimate = await estimateGroceryCosts(sanitizedItems, booking.address);

  // Ensure budget doesn't exceed chef's portion (subtotal)
  if (estimate.total > booking.subtotal) {
    return NextResponse.json({
      error: `Estimated grocery cost $${estimate.total.toFixed(2)} exceeds chef's booking earnings $${booking.subtotal.toFixed(2)}. Reduce items.`,
    }, { status: 400 });
  }

  const list = await prisma.groceryList.create({
    data: {
      bookingId,
      chefProfileId: profile.id,
      items: JSON.stringify(estimate.items),
      estimatedTotal: estimate.total,
      nearbyStores: JSON.stringify(estimate.stores),
      aiModel: estimate.model,
      status: "PENDING",
    },
  });

  // Notify client about the pending grocery list
  await createNotification({
    userId: booking.clientId,
    type: "GROCERY_CARD",
    title: "Grocery List Needs Approval",
    body: `Your chef submitted a grocery list ($${estimate.total.toFixed(2)} estimated). Review and approve it so they can start shopping.`,
    data: { link: `/client/bookings` },
  }).catch(console.error);

  return NextResponse.json(list, { status: 201 });
}

// PATCH /api/grocery-lists — client approves/rejects, or chef updates
export async function PATCH(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { listId, action, rejectedReason, clientNote } = body;

  if (!listId || !action) {
    return NextResponse.json({ error: "listId and action required" }, { status: 400 });
  }

  const list = await prisma.groceryList.findUnique({
    where: { id: listId },
    include: {
      booking: { select: { clientId: true, chefProfileId: true, subtotal: true, address: true } },
      chefProfile: { select: { userId: true, tier: true, completedJobs: true, user: { select: { name: true, email: true, phone: true } }, stripeCardholderId: true } },
    },
  });
  if (!list) return NextResponse.json({ error: "Grocery list not found" }, { status: 404 });

  const isClient = list.booking.clientId === user.userId;
  const isChef = list.chefProfile.userId === user.userId;
  const isAdmin = user.role === "ADMIN";

  switch (action) {
    case "approve": {
      if (!isClient && !isAdmin) return NextResponse.json({ error: "Only client or admin can approve" }, { status: 403 });
      if (list.status !== "PENDING") return NextResponse.json({ error: "List is not pending" }, { status: 400 });

      // Ensure cost doesn't exceed chef's booking portion
      if (list.estimatedTotal > list.booking.subtotal) {
        return NextResponse.json({ error: "Estimated cost exceeds chef's booking earnings" }, { status: 400 });
      }

      const updated = await prisma.groceryList.update({
        where: { id: listId },
        data: {
          clientApproved: true,
          clientApprovedAt: new Date(),
          clientNote: clientNote ? sanitizeText(clientNote).slice(0, 500) : null,
          status: "APPROVED",
        },
      });

      // Notify chef
      await createNotification({
        userId: list.chefProfile.userId,
        type: "GROCERY_CARD",
        title: "Grocery List Approved!",
        body: `Your client approved the $${list.estimatedTotal.toFixed(2)} grocery list. A virtual card will be funded from your booking earnings.`,
        data: { link: "/chef/dashboard" },
      }).catch(console.error);

      return NextResponse.json(updated);
    }

    case "reject": {
      if (!isClient && !isAdmin) return NextResponse.json({ error: "Only client or admin can reject" }, { status: 403 });
      if (list.status !== "PENDING") return NextResponse.json({ error: "List is not pending" }, { status: 400 });

      const updated = await prisma.groceryList.update({
        where: { id: listId },
        data: {
          status: "REJECTED",
          rejectedReason: rejectedReason ? sanitizeText(rejectedReason).slice(0, 500) : "Client declined",
        },
      });

      await createNotification({
        userId: list.chefProfile.userId,
        type: "GROCERY_CARD",
        title: "Grocery List Rejected",
        body: rejectedReason ? `Your grocery list was declined: ${rejectedReason}` : "Your grocery list was declined by the client.",
        data: { link: "/chef/dashboard" },
      }).catch(console.error);

      return NextResponse.json(updated);
    }

    case "fund": {
      // After approval, fund the virtual card (called by system/admin or auto after approval)
      if (!isAdmin && !isChef) return NextResponse.json({ error: "Only chef or admin can trigger funding" }, { status: 403 });
      if (list.status !== "APPROVED") return NextResponse.json({ error: "List must be approved first" }, { status: 400 });

      // Import Stripe helpers dynamically
      const { createIssuingCardholder, createIssuingCard } = await import("@/lib/stripe");

      let cardholderId = list.chefProfile.stripeCardholderId;
      if (!cardholderId) {
        const cardholder = await createIssuingCardholder(
          list.chefProfile.user.name,
          list.chefProfile.user.email,
          list.chefProfile.user.phone,
          { line1: list.booking.address.split(",")[0] || "123 Main St", city: "Lansing", state: "MI", postal_code: "48933", country: "US" }
        );
        cardholderId = cardholder.id;
        await prisma.chefProfile.update({
          where: { id: list.chefProfileId },
          data: { stripeCardholderId: cardholderId },
        });
      }

      const budgetCents = Math.round(list.estimatedTotal * 100);
      const stripeCard = await createIssuingCard(cardholderId, budgetCents, {
        bookingId: list.bookingId,
        groceryListId: list.id,
        chefProfileId: list.chefProfileId,
        platform: "foodies",
      });

      const cardNumber = `****-****-****-${stripeCard.last4}`;

      // Create the grocery card record
      const card = await prisma.groceryCard.create({
        data: {
          bookingId: list.bookingId,
          chefProfileId: list.chefProfileId,
          groceryListId: list.id,
          cardNumber,
          budget: list.estimatedTotal,
          approvedItems: list.items,
          fundedFromChefPortion: true,
          stripeCardId: stripeCard.id,
          stripeCardholderId: cardholderId,
          expiresAt: new Date(stripeCard.exp_year, stripeCard.exp_month - 1),
        },
      });

      // Mark list as funded
      await prisma.groceryList.update({
        where: { id: listId },
        data: { status: "FUNDED" },
      });

      // Notify chef
      await createNotification({
        userId: list.chefProfile.userId,
        type: "GROCERY_CARD",
        title: "Grocery Card Funded!",
        body: `Your virtual grocery card (${cardNumber}) has been loaded with $${list.estimatedTotal.toFixed(2)} from your booking earnings. View details and add to Apple Pay from your dashboard.`,
        data: { link: "/chef/dashboard" },
      }).catch(console.error);

      return NextResponse.json({ card, list: { id: list.id, status: "FUNDED" } }, { status: 201 });
    }

    default:
      return NextResponse.json({ error: "Invalid action. Use: approve, reject, fund" }, { status: 400 });
  }
}
