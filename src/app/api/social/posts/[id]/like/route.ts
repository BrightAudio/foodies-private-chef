import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";
import { withErrorHandler } from "@/lib/api-error-handler";

// POST /api/social/posts/[id]/like — toggle like on a post
async function _POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Sign in to like posts" }, { status: 401 });

  // Verify post exists
  const post = await prisma.socialPost.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  // Toggle like
  const existing = await prisma.postLike.findUnique({
    where: { postId_userId: { postId: id, userId: token.userId } },
  });

  if (existing) {
    await prisma.postLike.delete({ where: { id: existing.id } });
    return NextResponse.json({ liked: false });
  } else {
    await prisma.postLike.create({
      data: { postId: id, userId: token.userId },
    });
    return NextResponse.json({ liked: true });
  }
}


export const POST = withErrorHandler(_POST);