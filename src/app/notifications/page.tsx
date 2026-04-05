"use client";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { usePageTitle } from "@/hooks/usePageTitle";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  data: string | null;
}

export default function NotificationsPage() {
  usePageTitle("Notifications");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/login"; return; }
    try {
      const res = await fetch("/api/notifications", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const markAllRead = async () => {
    const token = localStorage.getItem("token");
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ markAll: true }),
    });
    fetchNotifications();
  };

  const markRead = async (id: string) => {
    const token = localStorage.getItem("token");
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ids: [id] }),
    });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const typeIcons: Record<string, string> = {
    BOOKING_CREATED: "📋",
    BOOKING_CONFIRMED: "✅",
    BOOKING_CANCELLED: "❌",
    NEW_MESSAGE: "💬",
    TIP_RECEIVED: "💰",
    BG_CHECK_UPDATE: "🔍",
    EXPIRY_WARNING: "⚠️",
  };

  return (
    <>
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 pt-28 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-cream-muted mt-1">{unreadCount} unread</p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-sm text-gold hover:text-gold-light transition-colors"
            >
              Mark all as read
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-cream-muted">Loading...</p>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 bg-dark-card border border-dark-border">
            <p className="text-4xl mb-3">🔔</p>
            <p className="text-cream-muted">No notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`border p-5 transition-colors cursor-pointer ${
                  n.isRead
                    ? "bg-dark-card border-dark-border"
                    : "bg-gold/5 border-gold/20 hover:bg-gold/10"
                }`}
                onClick={() => !n.isRead && markRead(n.id)}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0">{typeIcons[n.type] || "🔔"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-semibold text-sm ${n.isRead ? "text-cream-muted" : "text-cream"}`}>
                        {n.title}
                      </h3>
                      {!n.isRead && <span className="w-2 h-2 bg-gold rounded-full shrink-0" />}
                    </div>
                    <p className="text-sm text-cream-muted/70 mt-0.5">{n.body}</p>
                    <p className="text-xs text-cream-muted/40 mt-2">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
