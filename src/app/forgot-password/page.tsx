"use client";
import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong");
      }
      setSent(true);
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
        <h1 className="text-3xl font-bold mb-2 text-center tracking-tight">Reset Password</h1>
        <p className="text-center text-cream-muted mb-8">
          Enter your email and we&apos;ll send you a reset link
        </p>

        <div className="bg-dark-card border border-dark-border p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <p className="text-green-400">Check your email for a password reset link.</p>
              <p className="text-cream-muted text-sm">The link expires in 1 hour.</p>
              <Link href="/login" className="text-gold hover:text-gold-light text-sm">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">
                  Email
                </label>
                <input
                  type="text"
                  inputMode="email"
                  className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gold text-dark py-4 font-semibold text-sm tracking-[0.15em] uppercase hover:bg-gold-light transition-colors disabled:opacity-40"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-6 text-cream-muted">
          Remember your password?{" "}
          <Link href="/login" className="text-gold font-medium hover:text-gold-light transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </>
  );
}
