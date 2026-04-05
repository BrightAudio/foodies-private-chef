import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { withErrorHandler } from "@/lib/api-error-handler";

// GET /api/chefs/gallery?chefProfileId=xxx — get chef gallery images (public)
async function _GET(req: NextRequest) {
  const chefProfileId = req.nextUrl.searchParams.get("chefProfileId");
  if (!chefProfileId) {
    return NextResponse.json({ error: "chefProfileId required" }, { status: 400 });
  }

  const images = await prisma.chefGalleryImage.findMany({
    where: { chefProfileId },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(images);
}

// POST /api/chefs/gallery — add gallery image (chef only)
async function _POST(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.chefProfile.findUnique({ where: { userId: user.userId } });
  if (!profile) {
    return NextResponse.json({ error: "No chef profile" }, { status: 403 });
  }

  const { imageUrl, caption } = await req.json();
  if (!imageUrl) {
    return NextResponse.json({ error: "imageUrl required" }, { status: 400 });
  }

  // Max 12 gallery images
  const count = await prisma.chefGalleryImage.count({ where: { chefProfileId: profile.id } });
  if (count >= 12) {
    return NextResponse.json({ error: "Maximum 12 gallery images" }, { status: 400 });
  }

  const image = await prisma.chefGalleryImage.create({
    data: {
      chefProfileId: profile.id,
      imageUrl,
      caption: caption?.trim() || null,
      sortOrder: count,
    },
  });

  return NextResponse.json(image, { status: 201 });
}

// DELETE /api/chefs/gallery — remove gallery image
async function _DELETE(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.chefProfile.findUnique({ where: { userId: user.userId } });
  if (!profile) {
    return NextResponse.json({ error: "No chef profile" }, { status: 403 });
  }

  const { imageId } = await req.json();
  if (!imageId) {
    return NextResponse.json({ error: "imageId required" }, { status: 400 });
  }

  // Verify ownership
  const image = await prisma.chefGalleryImage.findUnique({ where: { id: imageId } });
  if (!image || image.chefProfileId !== profile.id) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  await prisma.chefGalleryImage.delete({ where: { id: imageId } });
  return NextResponse.json({ success: true });
}


export const GET = withErrorHandler(_GET);
export const POST = withErrorHandler(_POST);
export const DELETE = withErrorHandler(_DELETE);