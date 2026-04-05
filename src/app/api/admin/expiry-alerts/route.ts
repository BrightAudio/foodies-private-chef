import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { withErrorHandler } from "@/lib/api-error-handler";

// GET /api/admin/expiry-alerts — check for expiring certifications
async function _GET(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const expiringChefs = await prisma.chefProfile.findMany({
    where: {
      isActive: true,
      OR: [
        { servSafeCertExpiry: { lte: thirtyDaysFromNow } },
        { generalLiabilityExpiry: { lte: thirtyDaysFromNow } },
        { productLiabilityExpiry: { lte: thirtyDaysFromNow } },
      ],
    },
    include: { user: { select: { name: true, email: true } } },
  });

  const now = new Date();
  const alerts = expiringChefs.flatMap((chef) => {
    const items = [];
    if (chef.servSafeCertExpiry <= thirtyDaysFromNow) {
      items.push({
        chefId: chef.id,
        chefName: chef.user.name,
        chefEmail: chef.user.email,
        docType: "ServSafe Certificate",
        expiryDate: chef.servSafeCertExpiry,
        isExpired: chef.servSafeCertExpiry <= now,
        daysUntilExpiry: Math.ceil((chef.servSafeCertExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      });
    }
    if (chef.generalLiabilityExpiry <= thirtyDaysFromNow) {
      items.push({
        chefId: chef.id,
        chefName: chef.user.name,
        chefEmail: chef.user.email,
        docType: "General Liability Insurance",
        expiryDate: chef.generalLiabilityExpiry,
        isExpired: chef.generalLiabilityExpiry <= now,
        daysUntilExpiry: Math.ceil((chef.generalLiabilityExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      });
    }
    if (chef.productLiabilityExpiry <= thirtyDaysFromNow) {
      items.push({
        chefId: chef.id,
        chefName: chef.user.name,
        chefEmail: chef.user.email,
        docType: "Product Liability Insurance",
        expiryDate: chef.productLiabilityExpiry,
        isExpired: chef.productLiabilityExpiry <= now,
        daysUntilExpiry: Math.ceil((chef.productLiabilityExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      });
    }
    return items;
  });

  // Sort: expired first, then by days until expiry
  alerts.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  return NextResponse.json(alerts);
}


export const GET = withErrorHandler(_GET);