"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <>
        <Navbar />
        <div className="max-w-md mx-auto pt-32 pb-16 px-4 text-center">
          <p className="text-red-400 mb-4">Invalid reset link.</p>
          <Link href="/forgot-password" className="text-gold hover:text-gold-light">
            Request a new one
          </Link>
        </div>
      </>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="max-w-md mx-auto pt-32 pb-16 px-4">
        <h1 className="text-3xl font-bold mb-2 text-center tracking-tight">New Password</h1>
        <p className="text-center text-cream-muted mb-8">Choose a new password for your account</p>

        <div className="bg-dark-card border border-dark-border p-8">
          {done ? (
            <div className="text-center space-y-4">
              <p className="text-green-400">Your password has been reset!</p>
              <Link
                href="/login"
                className="inline-block bg-gold text-dark px-8 py-3 font-semibold text-sm tracking-[0.15em] uppercase hover:bg-gold-light transition-colors"
              >
                Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                />
              </div>
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  minLength={8}
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gold text-dark py-4 font-semibold text-sm tracking-[0.15em] uppercase hover:bg-gold-light transition-colors disabled:opacity-40"
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<><Navbar /><div className="text-center py-32 text-cream-muted pt-28">Loading...</div></>}>
      <ResetForm />
    </Suspense>
  );
}
