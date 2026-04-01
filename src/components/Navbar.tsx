"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/notifications?unread=true&limit=1", { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount || 0);
        }
      } catch { /* ignore */ }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  return (
    <nav className="bg-dark/95 backdrop-blur-md border-b border-dark-border fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <Link href="/" className="text-2xl font-bold tracking-tight text-gold">
            FOODIES
          </Link>
          <div className="flex items-center gap-8">
            {(!user || user.role !== "ADMIN") && (
              <>
                <Link href="/browse" className="text-cream-muted hover:text-gold text-sm font-medium tracking-wide uppercase transition-colors">
                  Browse Chefs
                </Link>
                <Link href="/for-you" className="text-cream-muted hover:text-gold text-sm font-medium tracking-wide uppercase transition-colors">
                  For You
                </Link>
                <Link href="/food-trucks" className="text-cream-muted hover:text-gold text-sm font-medium tracking-wide uppercase transition-colors">
                  Food Trucks
                </Link>
              </>
            )}
            {user ? (
              <>
                {user.role === "CHEF" && (
                  <Link href="/chef/dashboard" className="text-cream-muted hover:text-gold text-sm font-medium tracking-wide uppercase transition-colors">
                    Dashboard
                  </Link>
                )}
                {user.role === "CLIENT" && (
                  <Link href="/client/bookings" className="text-cream-muted hover:text-gold text-sm font-medium tracking-wide uppercase transition-colors">
                    My Bookings
                  </Link>
                )}
                {user.role === "ADMIN" && (
                  <Link href="/admin" className="text-cream-muted hover:text-gold text-sm font-medium tracking-wide uppercase transition-colors">
                    Admin
                  </Link>
                )}
                <Link href="/notifications" className="relative text-cream-muted hover:text-gold transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>
                <span className="text-sm text-cream-muted">{user.name}</span>
                <button onClick={logout} className="text-sm text-cream-muted hover:text-gold transition-colors">
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-cream-muted hover:text-gold text-sm font-medium tracking-wide uppercase transition-colors">
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="bg-gold text-dark px-5 py-2.5 text-sm font-semibold tracking-wide uppercase hover:bg-gold-light transition-colors"
                >
                  Join
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
