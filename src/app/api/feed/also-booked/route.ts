import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";

// GET /api/feed/also-booked — collaborative filtering
// "Clients who booked [chef X] also booked [chef Y]"
// Like Facebook's friend-based ad targeting — uses the booking graph
export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return NextResponse.json({ chefs: [] });
  }

  // 1. Get all chefs this user has booked
  const userBookings = await prisma.booking.findMany({
    where: { clientId: token.userId, status: { in: ["CONFIRMED", "COMPLETED"] } },
    select: { chefProfileId: true },
    distinct: ["chefProfileId"],
  });

  const bookedChefIds = userBookings.map((b) => b.chefProfileId);
  if (bookedChefIds.length === 0) {
    return NextResponse.json({ chefs: [] });
  }

  // 2. Find other users who also booked the same chefs
  const peerBookings = await prisma.booking.findMany({
    where: {
      chefProfileId: { in: bookedChefIds },
      clientId: { not: token.userId },
      status: { in: ["CONFIRMED", "COMPLETED"] },
    },
    select: { clientId: true },
    distinct: ["clientId"],
  });

  const peerIds = peerBookings.map((b) => b.clientId);
  if (peerIds.length === 0) {
    return NextResponse.json({ chefs: [] });
  }

  // 3. Find chefs that peers booked but this user hasn't
  const peerChefBookings = await prisma.booking.findMany({
    where: {
      clientId: { in: peerIds },
      chefProfileId: { notIn: bookedChefIds },
      status: { in: ["CONFIRMED", "COMPLETED"] },
    },
    select: { chefProfileId: true },
  });

  // 4. Count co-occurrences (how many peers booked each chef)
  const chefCounts = new Map<string, number>();
  for (const b of peerChefBookings) {
    chefCounts.set(b.chefProfileId, (chefCounts.get(b.chefProfileId) || 0) + 1);
  }

  // 5. Rank by number of shared bookers, take top 10
  const topChefIds = [...chefCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id);

  if (topChefIds.length === 0) {
    return NextResponse.json({ chefs: [] });
  }

  // 6. Fetch chef details
  const chefs = await prisma.chefProfile.findMany({
    where: { id: { in: topChefIds }, isApproved: true, isActive: true },
    select: {
      id: true,
      tier: true,
      cuisineType: true,
      specialtyDish: true,
      avgRating: true,
      completedJobs: true,
      hourlyRate: true,
      profileImageUrl: true,
      user: { select: { name: true } },
    },
  });

  // Sort by our ranking
  const result = topChefIds
    .map((id) => {
      const chef = chefs.find((c) => c.id === id);
      if (!chef) return null;
      return {
        id: chef.id,
        name: chef.user.name,
        tier: chef.tier,
        cuisine: chef.cuisineType,
        specialty: chef.specialtyDish,
        rating: chef.avgRating,
        jobs: chef.completedJobs,
        rate: chef.hourlyRate,
        image: chef.profileImageUrl,
        sharedBookers: chefCounts.get(id) || 0,
      };
    })
    .filter(Boolean);

  // 7. Also get referral-based connections (users referred by same person tend to have similar taste)
  const user = await prisma.user.findUnique({
    where: { id: token.userId },
    select: { referredByUserId: true },
  });

  let referralChefs: typeof result = [];
  if (user?.referredByUserId) {
    // Find other users referred by the same person
    const referralSiblings = await prisma.user.findMany({
      where: { referredByUserId: user.referredByUserId, id: { not: token.userId } },
      select: { id: true },
    });

    if (referralSiblings.length > 0) {
      const siblingBookings = await prisma.booking.findMany({
        where: {
          clientId: { in: referralSiblings.map((u) => u.id) },
          chefProfileId: { notIn: bookedChefIds },
          status: { in: ["CONFIRMED", "COMPLETED"] },
        },
        select: { chefProfileId: true },
        distinct: ["chefProfileId"],
      });

      if (siblingBookings.length > 0) {
        const sibChefs = await prisma.chefProfile.findMany({
          where: { id: { in: siblingBookings.map((b) => b.chefProfileId) }, isApproved: true, isActive: true },
          select: {
            id: true, tier: true, cuisineType: true, specialtyDish: true,
            avgRating: true, completedJobs: true, hourlyRate: true,
            profileImageUrl: true, user: { select: { name: true } },
          },
        });

        referralChefs = sibChefs.map((chef) => ({
          id: chef.id,
          name: chef.user.name,
          tier: chef.tier,
          cuisine: chef.cuisineType,
          specialty: chef.specialtyDish,
          rating: chef.avgRating,
          jobs: chef.completedJobs,
          rate: chef.hourlyRate,
          image: chef.profileImageUrl,
          sharedBookers: 0,
          referralMatch: true,
        }));
      }
    }
  }

  return NextResponse.json({
    chefs: result,
    referralChefs,
  });
}
