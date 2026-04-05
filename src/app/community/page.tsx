"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { usePageTitle } from "@/hooks/usePageTitle";
import EmptyState from "@/components/EmptyState";

interface Post {
  id: string;
  content: string;
  imageUrl: string | null;
  authorId: string;
  authorName: string;
  taggedChef: { id: string; name: string; cuisine: string | null; image: string | null } | null;
  commentCount: number;
  likeCount: number;
  likedByUserIds: string[];
  createdAt: string;
}

interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export default function CommunityPage() {
  usePageTitle("Community");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [newPost, setNewPost] = useState("");
  const [tagChefId, setTagChefId] = useState("");
  const [chefSearch, setChefSearch] = useState("");
  const [chefResults, setChefResults] = useState<{ id: string; name: string; cuisine: string | null }[]>([]);
  const [posting, setPosting] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Record<string, Comment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [showCompose, setShowCompose] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try { setUserId(JSON.parse(stored).id || JSON.parse(stored).userId); } catch { /* ignore */ }
    }
  }, []);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/social/posts");
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // Search chefs for tagging
  useEffect(() => {
    if (chefSearch.length < 2) { setChefResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/chefs?specialty=${encodeURIComponent(chefSearch)}&limit=5`);
        if (res.ok) {
          const data = await res.json();
          setChefResults((data.chefs || []).map((c: { id: string; name: string; cuisineType: string | null }) => ({
            id: c.id, name: c.name, cuisine: c.cuisineType,
          })));
        }
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [chefSearch]);

  const handlePost = async () => {
    const token = localStorage.getItem("token");
    if (!token || !newPost.trim()) return;
    setPosting(true);
    try {
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: newPost.trim(), taggedChefId: tagChefId || undefined }),
      });
      if (res.ok) {
        const post = await res.json();
        setPosts([post, ...posts]);
        setNewPost("");
        setTagChefId("");
        setChefSearch("");
        setShowCompose(false);
      }
    } catch { /* ignore */ }
    setPosting(false);
  };

  const handleLike = async (postId: string) => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/login?redirect=/community"; return; }
    try {
      const res = await fetch(`/api/social/posts/${postId}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(posts.map((p) => {
          if (p.id !== postId) return p;
          return {
            ...p,
            likeCount: data.liked ? p.likeCount + 1 : p.likeCount - 1,
            likedByUserIds: data.liked
              ? [...p.likedByUserIds, userId || ""]
              : p.likedByUserIds.filter((id) => id !== userId),
          };
        }));
      }
    } catch { /* ignore */ }
  };

  const loadComments = async (postId: string) => {
    if (expandedComments[postId]) {
      // Toggle off
      const next = { ...expandedComments };
      delete next[postId];
      setExpandedComments(next);
      return;
    }
    try {
      const res = await fetch(`/api/social/posts/${postId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setExpandedComments({ ...expandedComments, [postId]: data.comments });
      }
    } catch { /* ignore */ }
  };

  const handleComment = async (postId: string) => {
    const token = localStorage.getItem("token");
    const content = commentInputs[postId]?.trim();
    if (!token || !content) return;
    try {
      const res = await fetch(`/api/social/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const comment = await res.json();
        setExpandedComments({
          ...expandedComments,
          [postId]: [...(expandedComments[postId] || []), comment],
        });
        setCommentInputs({ ...commentInputs, [postId]: "" });
        setPosts(posts.map((p) => p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p));
      }
    } catch { /* ignore */ }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <>
      <Navbar />
      <div id="main-content" className="max-w-2xl mx-auto px-4 pt-28 pb-16">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Community</h1>
            <p className="text-cream-muted text-sm mt-1">Share your dining experiences and discover what others love</p>
          </div>
          {userId && (
            <button
              onClick={() => setShowCompose(!showCompose)}
              className="bg-gold text-dark px-5 py-2.5 text-sm font-semibold tracking-wide uppercase hover:bg-gold-light transition-colors"
            >
              {showCompose ? "Cancel" : "Post"}
            </button>
          )}
        </div>

        {/* Compose */}
        {showCompose && userId && (
          <div className="bg-dark-card border border-dark-border p-6 mb-8">
            <textarea
              className="w-full border border-dark-border bg-dark px-4 py-3 h-28 text-cream text-sm mb-4"
              placeholder="Share your experience... What did you love? Which chef blew your mind?"
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              maxLength={2000}
            />
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Tag a chef (search by name)..."
                  className="w-full border border-dark-border bg-dark px-4 py-2.5 text-cream text-sm"
                  value={chefSearch}
                  onChange={(e) => { setChefSearch(e.target.value); setTagChefId(""); }}
                />
                {chefResults.length > 0 && !tagChefId && (
                  <div className="absolute z-10 top-full left-0 right-0 bg-dark-card border border-dark-border mt-1 max-h-40 overflow-y-auto">
                    {chefResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setTagChefId(c.id); setChefSearch(c.name); setChefResults([]); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gold/10 text-sm transition-colors"
                      >
                        <span className="font-medium">{c.name}</span>
                        {c.cuisine && <span className="text-cream-muted text-xs ml-2">{c.cuisine}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {tagChefId && (
                <span className="text-xs bg-gold/10 text-gold px-3 py-1 border border-gold/20">
                  🏷️ {chefSearch}
                  <button onClick={() => { setTagChefId(""); setChefSearch(""); }} className="ml-2 hover:text-red-400">×</button>
                </span>
              )}
            </div>
            <button
              onClick={handlePost}
              disabled={posting || !newPost.trim()}
              className="bg-gold text-dark px-6 py-2.5 text-sm font-semibold tracking-wide uppercase hover:bg-gold-light transition-colors disabled:opacity-40"
            >
              {posting ? "Posting..." : "Share"}
            </button>
          </div>
        )}

        {!userId && (
          <div className="bg-dark-card border border-dark-border p-6 mb-8 text-center">
            <p className="text-cream-muted mb-3">Sign in to share your experiences and interact with the community.</p>
            <Link href="/login?redirect=/community" className="text-gold hover:text-gold-light text-sm font-medium tracking-wider uppercase">
              Sign In →
            </Link>
          </div>
        )}

        {/* Feed */}
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-dark-card border border-dark-border animate-pulse h-40" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            icon="💬"
            title="No posts yet"
            description="Be the first to share a dining experience with the community!"
          />
        ) : (
          <div className="space-y-6">
            {posts.map((post) => {
              const liked = userId ? post.likedByUserIds.includes(userId) : false;
              const comments = expandedComments[post.id];

              return (
                <div key={post.id} className="bg-dark-card border border-dark-border">
                  <div className="p-6">
                    {/* Author */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-gold">{post.authorName.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{post.authorName}</p>
                          <p className="text-cream-muted/50 text-xs">{timeAgo(post.createdAt)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <p className="text-cream leading-relaxed mb-4 whitespace-pre-wrap">{post.content}</p>

                    {/* Image */}
                    {post.imageUrl && (
                      <div className="relative h-64 mb-4 overflow-hidden border border-dark-border">
                        <Image src={post.imageUrl} alt="Post image" fill className="object-cover" sizes="600px" />
                      </div>
                    )}

                    {/* Tagged Chef */}
                    {post.taggedChef && (
                      <Link
                        href={`/chef/${post.taggedChef.id}`}
                        className="inline-flex items-center gap-2 bg-gold/5 border border-gold/20 px-4 py-2 mb-4 hover:bg-gold/10 transition-colors"
                      >
                        {post.taggedChef.image ? (
                          <div className="w-7 h-7 rounded-full overflow-hidden relative">
                            <Image src={post.taggedChef.image} alt={post.taggedChef.name} fill className="object-cover" sizes="28px" />
                          </div>
                        ) : (
                          <span className="text-sm">👨‍🍳</span>
                        )}
                        <span className="text-sm font-medium text-gold">{post.taggedChef.name}</span>
                        {post.taggedChef.cuisine && (
                          <span className="text-xs text-cream-muted">{post.taggedChef.cuisine}</span>
                        )}
                      </Link>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-6 pt-4 border-t border-dark-border">
                      <button
                        onClick={() => handleLike(post.id)}
                        className={`flex items-center gap-2 text-sm transition-colors ${liked ? "text-red-400" : "text-cream-muted hover:text-red-400"}`}
                      >
                        {liked ? "❤️" : "🤍"} {post.likeCount > 0 && post.likeCount}
                      </button>
                      <button
                        onClick={() => loadComments(post.id)}
                        className="flex items-center gap-2 text-sm text-cream-muted hover:text-gold transition-colors"
                      >
                        💬 {post.commentCount > 0 && post.commentCount}
                      </button>
                    </div>
                  </div>

                  {/* Comments Section */}
                  {comments && (
                    <div className="border-t border-dark-border bg-dark/50 p-6">
                      {comments.length === 0 ? (
                        <p className="text-cream-muted/50 text-xs mb-4">No comments yet</p>
                      ) : (
                        <div className="space-y-4 mb-4">
                          {comments.map((c) => (
                            <div key={c.id} className="flex gap-3">
                              <div className="w-7 h-7 rounded-full bg-dark-border flex items-center justify-center flex-shrink-0">
                                <span className="text-[10px] font-bold text-cream-muted">{c.authorName.charAt(0)}</span>
                              </div>
                              <div>
                                <p className="text-sm">
                                  <span className="font-medium">{c.authorName}</span>
                                  <span className="text-cream-muted/40 text-xs ml-2">{timeAgo(c.createdAt)}</span>
                                </p>
                                <p className="text-cream-muted text-sm mt-0.5">{c.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {userId && (
                        <div className="flex gap-3">
                          <input
                            type="text"
                            placeholder="Write a comment..."
                            className="flex-1 border border-dark-border bg-dark px-4 py-2 text-cream text-sm"
                            value={commentInputs[post.id] || ""}
                            onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                            onKeyDown={(e) => { if (e.key === "Enter") handleComment(post.id); }}
                            maxLength={1000}
                          />
                          <button
                            onClick={() => handleComment(post.id)}
                            disabled={!commentInputs[post.id]?.trim()}
                            className="bg-gold text-dark px-4 py-2 text-sm font-semibold hover:bg-gold-light transition-colors disabled:opacity-40"
                          >
                            Reply
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
