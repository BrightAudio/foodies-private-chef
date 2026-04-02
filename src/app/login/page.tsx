"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const [form, setForm] = useState({ email: "", password: "" });

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      const u = JSON.parse(stored);
      router.replace(redirect || (u.role === "CHEF" ? "/chef/dashboard" : u.role === "ADMIN" ? "/admin" : "/browse"));
    }
  }, [router, redirect]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNeedsVerification(false);
    setResendMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.needsVerification) {
          setNeedsVerification(true);
          setError(data.error);
          return;
        }
        throw new Error(data.error);
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      if (redirect) window.location.href = redirect;
      else if (data.user.role === "ADMIN") window.location.href = "/admin";
      else if (data.user.role === "CHEF") window.location.href = "/chef/dashboard";
      else window.location.href = "/browse";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    setResendMsg("");
    await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email }),
    });
    setResendMsg("Verification email resent! Check your inbox.");
  };

  return (
    <>
      <Navbar />
      <div className="max-w-md mx-auto pt-32 pb-16 px-4">
        <h1 className="text-3xl font-bold mb-2 text-center tracking-tight">Welcome Back</h1>
        <p className="text-center text-cream-muted mb-8">Sign in to your Foodies account</p>

        <div className="bg-dark-card border border-dark-border p-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Email</label>
              <input
                type="email" required
                className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Password</label>
              <input
                type="password" required
                className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            {error && (
              <div className="text-sm">
                <p className="text-red-400">{error}</p>
                {needsVerification && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={resendVerification}
                      className="text-gold hover:text-gold-light underline text-sm"
                    >
                      Resend verification email
                    </button>
                    {resendMsg && <p className="text-green-400 text-xs mt-1">{resendMsg}</p>}
                  </div>
                )}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full bg-gold text-dark py-4 font-semibold text-sm tracking-[0.15em] uppercase hover:bg-gold-light transition-colors disabled:opacity-40"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-cream-muted">
          No account?{" "}
          <Link href={redirect ? `/register?redirect=${encodeURIComponent(redirect)}` : "/register"} className="text-gold font-medium hover:text-gold-light transition-colors">Sign Up</Link>
        </p>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<><Navbar /><div className="text-center py-32 text-cream-muted pt-28">Loading...</div></>}>
      <LoginForm />
    </Suspense>
  );
}
