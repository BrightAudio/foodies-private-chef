import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";

// GET /api/social/posts — get social feed
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page")) || 1;
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);
  const chefId = searchParams.get("chefId");

  const where = chefId ? { taggedChefId: chefId } : {};

  const [posts, total] = await Promise.all([
    prisma.socialPost.findMany({
      where,
      include: {
        author: { select: { id: true, name: true } },
        taggedChef: {
          select: {
            id: true,
            user: { select: { name: true } },
            cuisineType: true,
            profileImageUrl: true,
          },
        },
        _count: { select: { comments: true, likes: true } },
        likes: { select: { userId: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.socialPost.count({ where }),
  ]);

  return NextResponse.json({
    posts: posts.map((p) => ({
      id: p.id,
      content: p.content,
      imageUrl: p.imageUrl,
      authorId: p.authorId,
      authorName: p.author.name,
      taggedChef: p.taggedChef ? {
        id: p.taggedChef.id,
        name: p.taggedChef.user.name,
        cuisine: p.taggedChef.cuisineType,
        image: p.taggedChef.profileImageUrl,
      } : null,
      commentCount: p._count.comments,
      likeCount: p._count.likes,
      likedByUserIds: p.likes.map((l) => l.userId),
      createdAt: p.createdAt.toISOString(),
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

// POST /api/social/posts — create a new post
export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Sign in to post" }, { status: 401 });

  const body = await req.json();
  const { content, imageUrl, taggedChefId } = body;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Post content is required" }, { status: 400 });
  }
  if (content.length > 2000) {
    return NextResponse.json({ error: "Post too long (max 2000 chars)" }, { status: 400 });
  }

  // Validate tagged chef exists if provided
  if (taggedChefId) {
    const chef = await prisma.chefProfile.findUnique({ where: { id: taggedChefId } });
    if (!chef) return NextResponse.json({ error: "Chef not found" }, { status: 404 });
  }

  const post = await prisma.socialPost.create({
    data: {
      authorId: token.userId,
      content: content.trim(),
      imageUrl: imageUrl || null,
      taggedChefId: taggedChefId || null,
    },
    include: {
      author: { select: { id: true, name: true } },
      taggedChef: {
        select: {
          id: true,
          user: { select: { name: true } },
          cuisineType: true,
          profileImageUrl: true,
        },
      },
    },
  });

  return NextResponse.json({
    id: post.id,
    content: post.content,
    imageUrl: post.imageUrl,
    authorId: post.authorId,
    authorName: post.author.name,
    taggedChef: post.taggedChef ? {
      id: post.taggedChef.id,
      name: post.taggedChef.user.name,
      cuisine: post.taggedChef.cuisineType,
      image: post.taggedChef.profileImageUrl,
    } : null,
    commentCount: 0,
    likeCount: 0,
    likedByUserIds: [],
    createdAt: post.createdAt.toISOString(),
  }, { status: 201 });
}
