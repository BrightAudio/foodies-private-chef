"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getStoredUser, getStoredToken } from "@/lib/stored-user";

const navLink = "text-cream-muted hover:text-gold text-sm font-medium tracking-wide uppercase transition-colors";
const mobileNavLink = "block text-cream-muted hover:text-gold text-base font-medium tracking-wide uppercase transition-colors py-3 border-b border-dark-border";

function NavLinks({ mobile, user, unreadCount, logout, setMobileOpen }: {
  mobile?: boolean;
  user: { name: string; role: string } | null;
  unreadCount: number;
  logout: () => void;
  setMobileOpen: (v: boolean) => void;
}) {
  const cls = mobile ? mobileNavLink : navLink;
  const close = () => mobile && setMobileOpen(false);
  return (
    <>
      {(!user || (user.role !== "ADMIN" && user.role !== "CHEF")) && (
        <>
          <Link href="/browse" className={cls} onClick={close}>Browse Chefs</Link>
          <Link href="/for-you" className={cls} onClick={close}>For You</Link>
          <Link href="/community" className={cls} onClick={close}>Community</Link>
          <Link href="/food-trucks" className={cls} onClick={close}>Food Trucks</Link>
        </>
      )}
      {user?.role === "CHEF" && (
        <Link href="/community" className={cls} onClick={close}>Community</Link>
      )}
      {user ? (
        <>
          {user.role === "CHEF" && (
            <Link href="/chef/dashboard" className={cls} onClick={close}>Dashboard</Link>
          )}
          {user.role === "CLIENT" && (
            <>
              <Link href="/client/bookings" className={cls} onClick={close}>My Bookings</Link>
              <Link href="/client/profile" className={cls} onClick={close}>My Profile</Link>
            </>
          )}
          {user.role === "ADMIN" && (
            <Link href="/admin" className={cls} onClick={close}>Admin</Link>
          )}
          <Link href="/notifications" className={`relative ${mobile ? mobileNavLink + " flex items-center gap-2" : navLink}`} onClick={close}>
            {mobile ? (
              <>
                Notifications
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </>
            )}
          </Link>
          {mobile && <span className="block text-sm text-cream-muted py-3">{user.name}</span>}
          {!mobile && <span className="text-sm text-cream-muted">{user.name}</span>}
          <button onClick={() => { logout(); close(); }} className={mobile ? mobileNavLink + " text-left w-full" : "text-sm text-cream-muted hover:text-gold transition-colors"}>
            Sign Out
          </button>
        </>
      ) : (
        <>
          <Link href="/login" className={cls} onClick={close}>Sign In</Link>
          <Link
            href="/register"
            onClick={close}
            className={mobile
              ? "block bg-gold text-dark px-5 py-3 text-sm font-semibold tracking-wide uppercase text-center hover:bg-gold-light transition-colors mt-4"
              : "bg-gold text-dark px-5 py-2.5 text-sm font-semibold tracking-wide uppercase hover:bg-gold-light transition-colors"
            }
          >
            Join
          </Link>
        </>
      )}
    </>
  );
}

export default function Navbar() {
  const [user] = useState<{ name: string; role: string } | null>(() => {
    if (typeof window === "undefined") return null;
    return getStoredUser();
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const token = getStoredToken();
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

  // Close mobile menu on route change
  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const logout = async () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch { /* ignore */ }
    window.location.href = "/";
  };

  return (
    <nav className="bg-dark/95 backdrop-blur-md border-b border-dark-border fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <Link href="/" className="text-2xl font-bold tracking-tight text-gold">
            <span className="sm:hidden">FOODIES</span>
            <span className="hidden sm:inline">FOODIES: PRIVATE CHEF SERVICES</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <NavLinks user={user} unreadCount={unreadCount} logout={logout} setMobileOpen={setMobileOpen} />
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden relative w-8 h-8 flex flex-col items-center justify-center gap-1.5"
            aria-label="Toggle menu"
          >
            <span className={`block w-6 h-0.5 bg-cream transition-all ${mobileOpen ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block w-6 h-0.5 bg-cream transition-all ${mobileOpen ? "opacity-0" : ""}`} />
            <span className={`block w-6 h-0.5 bg-cream transition-all ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`} />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 top-20 bg-black/50 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
          <div className="fixed top-20 left-0 right-0 bottom-0 bg-dark border-t border-dark-border z-50 md:hidden overflow-y-auto px-6 py-4">
            <NavLinks mobile user={user} unreadCount={unreadCount} logout={logout} setMobileOpen={setMobileOpen} />
          </div>
        </>
      )}
    </nav>
  );
}
