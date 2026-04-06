import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { sanitizeText } from "@/lib/sanitize";
import { createNotification } from "@/lib/notifications";
import {
  stripe,
  createIssuingCardholder,
  createIssuingCard,
  retrieveIssuingCardDetails,
  updateIssuingCardStatus,
  updateIssuingCardSpendingLimit,
  createIssuingEphemeralKey,
} from "@/lib/stripe";

// GET /api/grocery-cards — list grocery cards, get card details, or get ephemeral key
export async function GET(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get("bookingId");
  const cardId = searchParams.get("cardId");
  const action = searchParams.get("action");

  // Ephemeral key for Apple Pay provisioning
  if (action === "provision" && cardId) {
    const nonce = searchParams.get("nonce");
    if (!nonce) return NextResponse.json({ error: "nonce is required" }, { status: 400 });
    const card = await prisma.groceryCard.findUnique({
      where: { id: cardId },
      include: { chefProfile: { select: { userId: true } } },
    });
    if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });
    if (card.chefProfile.userId !== user.userId && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only the card's chef can provision to wallet" }, { status: 403 });
    }
    if (!card.stripeCardId) return NextResponse.json({ error: "No Stripe card linked" }, { status: 400 });
    try {
      const key = await createIssuingEphemeralKey(card.stripeCardId, nonce);
      return NextResponse.json(key);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Provisioning failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // Card details (number, exp, cvc) — chef only
  if (action === "details" && cardId) {
    const card = await prisma.groceryCard.findUnique({
      where: { id: cardId },
      include: { chefProfile: { select: { userId: true } } },
    });
    if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });
    if (card.chefProfile.userId !== user.userId && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only the chef can view card details" }, { status: 403 });
    }
    if (!card.stripeCardId) return NextResponse.json({ error: "No Stripe card linked" }, { status: 400 });
    try {
      const details = await retrieveIssuingCardDetails(card.stripeCardId);
      return NextResponse.json(details);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to retrieve card details";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // Single card
  if (cardId) {
    const card = await prisma.groceryCard.findUnique({
      where: { id: cardId },
      include: {
        booking: { select: { clientId: true, chefProfileId: true, date: true } },
        chefProfile: { select: { userId: true, user: { select: { name: true } } } },
      },
    });
    if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });
    if (user.role !== "ADMIN" && card.booking.clientId !== user.userId && card.chefProfile.userId !== user.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(card);
  }

  // Cards for a booking
  if (bookingId) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { clientId: true, chefProfileId: true } });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (user.role !== "ADMIN" && booking.clientId !== user.userId) {
      const chefProfile = await prisma.chefProfile.findFirst({ where: { id: booking.chefProfileId, userId: user.userId } });
      if (!chefProfile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const cards = await prisma.groceryCard.findMany({
      where: { bookingId },
      include: { chefProfile: { select: { user: { select: { name: true } } } } },
      orderBy: { issuedAt: "desc" },
    });
    return NextResponse.json(cards);
  }

  // Chef: list their own cards
  if (user.role === "CHEF") {
    const chefProfile = await prisma.chefProfile.findFirst({ where: { userId: user.userId } });
    if (!chefProfile) return NextResponse.json({ error: "No chef profile" }, { status: 404 });
    const cards = await prisma.groceryCard.findMany({
      where: { chefProfileId: chefProfile.id },
      include: { booking: { select: { date: true, address: true, client: { select: { name: true } } } } },
      orderBy: { issuedAt: "desc" },
    });
    return NextResponse.json(cards);
  }

  // Admin: list all cards
  if (user.role === "ADMIN") {
    const cards = await prisma.groceryCard.findMany({
      include: {
        booking: { select: { date: true, client: { select: { name: true } } } },
        chefProfile: { select: { user: { select: { name: true } } } },
      },
      orderBy: { issuedAt: "desc" },
    });
    return NextResponse.json(cards);
  }

  // Client: list cards for their bookings
  const userBookings = await prisma.booking.findMany({ where: { clientId: user.userId }, select: { id: true } });
  const bookingIds = userBookings.map(b => b.id);
  const cards = await prisma.groceryCard.findMany({
    where: { bookingId: { in: bookingIds } },
    include: {
      chefProfile: { select: { user: { select: { name: true } } } },
      booking: { select: { date: true } },
    },
    orderBy: { issuedAt: "desc" },
  });
  return NextResponse.json(cards);
}

// POST /api/grocery-cards — create a card (admin only, or via grocery-list fund flow)
// Normal flow: chef creates grocery list → AI estimates → client approves → fund action creates card
// Admin can also create a standalone test card with { test: true, name, email, budget }
export async function POST(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Cards are created through the grocery list approval flow. Use /api/grocery-lists PATCH action=fund." }, { status: 403 });
  }

  const body = await req.json();
  const { bookingId, budget, approvedItems, test } = body;

  // Admin-only: create a standalone test card (no chef/booking required)
  if (test) {
    if (!stripe) {
      return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
    }
    const testName = sanitizeText(body.name || "Test Cardholder");
    const testEmail = sanitizeText(body.email || user.email);
    const testBudget = parseFloat(String(budget || 50));
    if (testBudget <= 0 || testBudget > 500) {
      return NextResponse.json({ error: "Test budget must be between $0.01 and $500" }, { status: 400 });
    }
    try {
      const cardholder = await createIssuingCardholder(
        testName,
        testEmail,
        null,
        { line1: "1 Test Street", city: "Lansing", state: "MI", postal_code: "48933", country: "US" }
      );
      const budgetCents = Math.round(testBudget * 100);
      const stripeCard = await createIssuingCard(cardholder.id, budgetCents, {
        platform: "foodies",
        testCard: "true",
      });
      const details = await retrieveIssuingCardDetails(stripeCard.id);
      return NextResponse.json({
        success: true,
        message: "Test card created successfully. Stripe Issuing is working!",
        card: {
          id: stripeCard.id,
          last4: stripeCard.last4,
          brand: stripeCard.brand,
          expMonth: stripeCard.exp_month,
          expYear: stripeCard.exp_year,
          status: stripeCard.status,
          type: stripeCard.type,
          cardholderId: cardholder.id,
          budget: testBudget,
        },
        details: {
          number: details.number,
          cvc: details.cvc,
          expMonth: details.exp_month,
          expYear: details.exp_year,
        },
      }, { status: 201 });
    } catch (err: unknown) {
      console.error("Test card creation error:", err);
      const message = err instanceof Error ? err.message : "Failed to create test card";
      return NextResponse.json({
        error: message,
        hint: "Make sure Stripe Issuing is enabled on your account. Visit https://dashboard.stripe.com/issuing/overview to apply.",
      }, { status: 500 });
    }
  }

  if (!bookingId || !budget || budget <= 0) {
    return NextResponse.json({ error: "bookingId and positive budget are required" }, { status: 400 });
  }
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { clientId: true, chefProfileId: true, status: true, address: true },
  });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const existing = await prisma.groceryCard.findFirst({
    where: { bookingId, status: { in: ["ACTIVE", "FROZEN"] } },
  });
  if (existing) {
    return NextResponse.json({ error: "An active grocery card already exists for this booking" }, { status: 409 });
  }

  const chefProfile = await prisma.chefProfile.findUnique({
    where: { id: booking.chefProfileId },
    include: { user: { select: { name: true, email: true, phone: true } } },
  });
  if (!chefProfile) return NextResponse.json({ error: "Chef profile not found" }, { status: 404 });

  try {
    let cardholderId = chefProfile.stripeCardholderId;
    if (!cardholderId) {
      const addressParts = (booking.address || "").split(",").map(s => s.trim());
      const cardholder = await createIssuingCardholder(
        chefProfile.user.name,
        chefProfile.user.email,
        chefProfile.user.phone,
        { line1: addressParts[0] || "Platform Address", city: addressParts[1] || "Lansing", state: addressParts[2] || "MI", postal_code: "48933", country: "US" }
      );
      cardholderId = cardholder.id;
      await prisma.chefProfile.update({
        where: { id: chefProfile.id },
        data: { stripeCardholderId: cardholderId },
      });
    }

    const budgetCents = Math.round(parseFloat(String(budget)) * 100);
    const stripeCard = await createIssuingCard(cardholderId, budgetCents, {
      bookingId,
      chefProfileId: chefProfile.id,
      platform: "foodies",
    });

    const cardNumber = `****-****-****-${stripeCard.last4}`;
    const sanitizedItems = approvedItems ? sanitizeText(JSON.stringify(approvedItems)) : null;

    const card = await prisma.groceryCard.create({
      data: {
        bookingId,
        chefProfileId: booking.chefProfileId,
        cardNumber,
        budget: parseFloat(String(budget)),
        approvedItems: sanitizedItems,
        fundedFromChefPortion: true,
        stripeCardId: stripeCard.id,
        stripeCardholderId: cardholderId,
        expiresAt: new Date(stripeCard.exp_year, stripeCard.exp_month - 1),
      },
    });

    await createNotification({
      userId: chefProfile.userId,
      type: "GROCERY_CARD",
      title: "Grocery Card Issued",
      body: `A virtual grocery card (${cardNumber}) with $${parseFloat(String(budget)).toFixed(2)} has been funded from your booking earnings.`,
      data: { link: "/chef/dashboard" },
    });

    return NextResponse.json(card, { status: 201 });
  } catch (err: unknown) {
    console.error("Stripe Issuing error:", err);
    const message = err instanceof Error ? err.message : "Failed to create Stripe Issuing card";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/grocery-cards — update card (freeze, unfreeze, close, update budget)
export async function PATCH(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { cardId, action, amount, newBudget } = body;

  if (!cardId || !action) {
    return NextResponse.json({ error: "cardId and action are required" }, { status: 400 });
  }

  const card = await prisma.groceryCard.findUnique({
    where: { id: cardId },
    include: {
      booking: { select: { clientId: true } },
      chefProfile: { select: { userId: true } },
    },
  });
  if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });

  const isChef = card.chefProfile.userId === user.userId;
  const isClient = card.booking.clientId === user.userId;
  const isAdmin = user.role === "ADMIN";

  switch (action) {
    case "spend": {
      // Manual spend recording (for non-Stripe tracked purchases or offline use)
      if (!isChef && !isAdmin) return NextResponse.json({ error: "Only the chef can record spending" }, { status: 403 });
      if (card.status !== "ACTIVE") return NextResponse.json({ error: "Card is not active" }, { status: 400 });
      if (!amount || amount <= 0) return NextResponse.json({ error: "Positive amount required" }, { status: 400 });
      const newSpent = card.spent + parseFloat(String(amount));
      if (newSpent > card.budget) {
        return NextResponse.json({ error: `Spending $${parseFloat(String(amount)).toFixed(2)} would exceed the $${card.budget.toFixed(2)} budget` }, { status: 400 });
      }
      const status = newSpent >= card.budget ? "DEPLETED" : "ACTIVE";
      const updated = await prisma.groceryCard.update({
        where: { id: cardId },
        data: { spent: newSpent, status },
      });
      if (status === "DEPLETED") {
        await createNotification({ userId: card.booking.clientId, type: "GROCERY_CARD", title: "Grocery Card Depleted", body: `The grocery card (${card.cardNumber}) budget has been fully spent.`, data: { link: "/client/bookings" } });
      }
      return NextResponse.json(updated);
    }
    case "freeze": {
      if (!isClient && !isAdmin) return NextResponse.json({ error: "Only the client or admin can freeze a card" }, { status: 403 });
      if (card.status !== "ACTIVE") return NextResponse.json({ error: "Card is not active" }, { status: 400 });
      // Freeze on Stripe
      if (card.stripeCardId) {
        try { await updateIssuingCardStatus(card.stripeCardId, "inactive"); } catch (err) { console.error("Stripe freeze error:", err); }
      }
      const updated = await prisma.groceryCard.update({ where: { id: cardId }, data: { status: "FROZEN" } });
      await createNotification({ userId: card.chefProfile.userId, type: "GROCERY_CARD", title: "Grocery Card Frozen", body: `Your grocery card (${card.cardNumber}) has been frozen.`, data: { link: "/chef/dashboard" } });
      return NextResponse.json(updated);
    }
    case "unfreeze": {
      if (!isClient && !isAdmin) return NextResponse.json({ error: "Only the client or admin can unfreeze a card" }, { status: 403 });
      if (card.status !== "FROZEN") return NextResponse.json({ error: "Card is not frozen" }, { status: 400 });
      if (card.stripeCardId) {
        try { await updateIssuingCardStatus(card.stripeCardId, "active"); } catch (err) { console.error("Stripe unfreeze error:", err); }
      }
      const updated = await prisma.groceryCard.update({ where: { id: cardId }, data: { status: "ACTIVE" } });
      await createNotification({ userId: card.chefProfile.userId, type: "GROCERY_CARD", title: "Grocery Card Unfrozen", body: `Your grocery card (${card.cardNumber}) has been unfrozen.`, data: { link: "/chef/dashboard" } });
      return NextResponse.json(updated);
    }
    case "close": {
      if (!isClient && !isAdmin) return NextResponse.json({ error: "Only the client or admin can close a card" }, { status: 403 });
      if (card.status === "CLOSED") return NextResponse.json({ error: "Card is already closed" }, { status: 400 });
      // Cancel on Stripe (permanent)
      if (card.stripeCardId) {
        try { await updateIssuingCardStatus(card.stripeCardId, "canceled"); } catch (err) { console.error("Stripe cancel error:", err); }
      }
      const updated = await prisma.groceryCard.update({ where: { id: cardId }, data: { status: "CLOSED", closedAt: new Date() } });
      await createNotification({ userId: card.chefProfile.userId, type: "GROCERY_CARD", title: "Grocery Card Closed", body: `Your grocery card (${card.cardNumber}) has been closed.`, data: { link: "/chef/dashboard" } });
      return NextResponse.json(updated);
    }
    case "updateBudget": {
      if (!isClient && !isAdmin) return NextResponse.json({ error: "Only the client or admin can update the budget" }, { status: 403 });
      if (!newBudget || newBudget <= 0) return NextResponse.json({ error: "Positive budget required" }, { status: 400 });
      if (newBudget < card.spent) return NextResponse.json({ error: "New budget cannot be less than amount already spent" }, { status: 400 });
      // Update spending limit on Stripe
      if (card.stripeCardId) {
        try {
          const newLimitCents = Math.round(parseFloat(String(newBudget)) * 100);
          await updateIssuingCardSpendingLimit(card.stripeCardId, newLimitCents);
        } catch (err) { console.error("Stripe limit update error:", err); }
      }
      const updated = await prisma.groceryCard.update({
        where: { id: cardId },
        data: { budget: parseFloat(String(newBudget)), status: card.status === "DEPLETED" ? "ACTIVE" : card.status },
      });
      await createNotification({ userId: card.chefProfile.userId, type: "GROCERY_CARD", title: "Grocery Card Budget Updated", body: `Your grocery card budget has been updated to $${parseFloat(String(newBudget)).toFixed(2)}.`, data: { link: "/chef/dashboard" } });
      return NextResponse.json(updated);
    }
    default:
      return NextResponse.json({ error: "Invalid action. Use: spend, freeze, unfreeze, close, updateBudget" }, { status: 400 });
  }
}
