"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";

function RegisterForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const defaultRole = searchParams.get("role") === "CHEF" ? "CHEF" : "CLIENT";
  const redirect = searchParams.get("redirect");

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      const u = JSON.parse(stored);
      router.replace(u.role === "CHEF" ? "/chef/dashboard" : u.role === "ADMIN" ? "/admin" : "/browse");
    }
  }, [router]);

  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", role: defaultRole });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (!form.name.trim()) { setError("Please enter your name"); return; }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Please enter a valid email address");
      return;
    }
    if (form.password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (!acceptedTerms) { setError("You must accept the Terms of Service to continue"); return; }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setRegistered(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <>
        <Navbar />
        <div className="max-w-md mx-auto pt-32 pb-16 px-4 text-center">
          <div className="text-4xl mb-4">📧</div>
          <h1 className="text-2xl font-bold mb-2 tracking-tight text-gold">Check Your Email</h1>
          <p className="text-cream-muted mb-2">
            We sent a verification link to <strong className="text-cream">{form.email}</strong>
          </p>
          <p className="text-cream-muted text-sm mb-8">
            Click the link in the email to verify your account, then sign in.
          </p>
          <div className="space-y-4">
            <Link
              href={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login"}
              className="inline-block bg-gold text-dark px-8 py-3 font-semibold text-sm tracking-[0.15em] uppercase hover:bg-gold-light transition-colors"
            >
              Go to Sign In
            </Link>
            <p className="text-cream-muted text-xs">
              Didn&apos;t get the email? Check your spam folder or{" "}
              <button
                type="button"
                className="text-gold hover:text-gold-light underline"
                onClick={async () => {
                  await fetch("/api/auth/verify-email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: form.email }),
                  });
                  setError("Verification email resent!");
                }}
              >
                resend it
              </button>
            </p>
            {error && <p className="text-gold text-sm">{error}</p>}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-md mx-auto pt-32 pb-16 px-4">
        <h1 className="text-3xl font-bold mb-2 text-center tracking-tight">Join Foodies</h1>
        <p className="text-center text-cream-muted mb-8">Create your account to get started</p>

        <div className="bg-dark-card border border-dark-border p-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Full Name</label>
              <input
                type="text" required
                className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
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
              <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Phone (optional)</label>
              <input
                type="text"
                inputMode="tel"
                className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                placeholder="555-555-5555"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Password</label>
              <input
                type="password" required minLength={8}
                className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">I want to...</label>
              <select
                className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="CLIENT">Hire a Private Chef</option>
                <option value="CHEF">Sign Up as a Chef</option>
              </select>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 w-4 h-4 accent-gold shrink-0"
              />
              <span className="text-xs text-cream-muted leading-relaxed">
                I have read and agree to the Foodies{" "}
                <Link href="/terms" target="_blank" className="text-gold underline hover:text-gold-light">
                  Terms of Service
                </Link>
                , including the non-circumvention agreement, dispute resolution policy, and payment terms.
              </span>
            </label>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit" disabled={loading}
              className="w-full bg-gold text-dark py-4 font-semibold text-sm tracking-[0.15em] uppercase hover:bg-gold-light transition-colors disabled:opacity-40"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-cream-muted">
          Already have an account?{" "}
          <Link href={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login"} className="text-gold font-medium hover:text-gold-light transition-colors">Sign In</Link>
        </p>
      </div>
    </>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="text-center py-32 text-cream-muted">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
