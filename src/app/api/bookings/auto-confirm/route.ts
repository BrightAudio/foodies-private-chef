import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBookingCompletedToClient } from "@/lib/email";
import { calculateTier, calculateTrustScore } from "@/lib/tiers";
import { capturePayment, isStripeEnabled } from "@/lib/stripe";
import { createNotification } from "@/lib/notifications";

// POST /api/bookings/auto-confirm — Auto-confirm bookings past 24h deadline
// Called by Vercel Cron or admin
export async function POST(req: NextRequest) {
  // Simple auth: cron secret or admin token
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expiredBookings = await prisma.booking.findMany({
    where: {
      status: "PENDING_COMPLETION",
      autoConfirmAt: { lte: new Date() },
    },
    include: {
      client: { select: { name: true, email: true } },
      chefProfile: { include: { user: { select: { name: true } }, reviews: { select: { rating: true } } } },
    },
  });

  let confirmed = 0;

  for (const booking of expiredBookings) {
    try {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: "COMPLETED", clientConfirmedAt: new Date() },
      });

      sendBookingCompletedToClient({
        clientEmail: booking.client.email,
        clientName: booking.client.name,
        chefName: booking.chefProfile.user.name,
      }).catch(console.error);

      // Release escrow payment
      if (isStripeEnabled() && booking.stripePaymentIntentId && booking.paymentStatus === "CAPTURED") {
        try {
          await capturePayment(booking.stripePaymentIntentId);
          await prisma.booking.update({
            where: { id: booking.id },
            data: { paymentStatus: "RELEASED", payoutStatus: "RELEASED", payoutReleasedAt: new Date() },
          });
        } catch (err) {
          console.error(`Failed to capture payment for booking ${booking.id}:`, err);
        }
      }

      // Tier promotion
      const chef = booking.chefProfile;
      if (!chef.tierOverride) {
        const newCompletedJobs = chef.completedJobs + 1;
        const ratings = chef.reviews.map((r) => r.rating);
        const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
        const newTier = calculateTier(newCompletedJobs, avgRating);
        const openIncidents = await prisma.incidentReport.count({
          where: { reportedUserId: chef.userId, status: { in: ["OPEN", "INVESTIGATING"] } },
        });
        const trustScore = calculateTrustScore({
          avgRating,
          completedJobs: newCompletedJobs,
          bgCheckPassed: chef.bgCheckStatus === "CLEAR",
          insuranceVerified: chef.insuranceVerified,
          openIncidents,
          tier: newTier,
        });
        await prisma.chefProfile.update({
          where: { id: chef.id },
          data: { completedJobs: newCompletedJobs, tier: newTier, trustScore },
        });
      }

      // Notify both parties
      await createNotification({
        userId: booking.clientId,
        type: "BOOKING_COMPLETED",
        title: "Booking Auto-Confirmed",
        body: `Your booking with ${booking.chefProfile.user.name} has been automatically confirmed as complete.`,
        data: { link: "/client/bookings" },
      }).catch(console.error);

      await createNotification({
        userId: booking.chefProfile.userId,
        type: "BOOKING_COMPLETED",
        title: "Booking Auto-Confirmed",
        body: `Your booking with ${booking.client.name} was auto-confirmed. Payment released.`,
        data: { link: "/chef/dashboard" },
      }).catch(console.error);

      confirmed++;
    } catch (err) {
      console.error(`Auto-confirm failed for booking ${booking.id}:`, err);
    }
  }

  return NextResponse.json({ confirmed, total: expiredBookings.length });
}
