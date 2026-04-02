import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";

// GET /api/social/posts/[id]/comments — get comments for a post
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const comments = await prisma.postComment.findMany({
    where: { postId: id },
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    comments: comments.map((c) => ({
      id: c.id,
      content: c.content,
      authorId: c.authorId,
      authorName: c.author.name,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}

// POST /api/social/posts/[id]/comments — add a comment
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Sign in to comment" }, { status: 401 });

  const body = await req.json();
  const { content } = body;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Comment content is required" }, { status: 400 });
  }
  if (content.length > 1000) {
    return NextResponse.json({ error: "Comment too long (max 1000 chars)" }, { status: 400 });
  }

  // Verify post exists
  const post = await prisma.socialPost.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const comment = await prisma.postComment.create({
    data: {
      postId: id,
      authorId: token.userId,
      content: content.trim(),
    },
    include: { author: { select: { id: true, name: true } } },
  });

  return NextResponse.json({
    id: comment.id,
    content: comment.content,
    authorId: comment.authorId,
    authorName: comment.author.name,
    createdAt: comment.createdAt.toISOString(),
  }, { status: 201 });
}
