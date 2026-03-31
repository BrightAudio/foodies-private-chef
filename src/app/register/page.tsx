"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";

function RegisterForm() {
  const searchParams = useSearchParams();
  const defaultRole = searchParams.get("role") === "CHEF" ? "CHEF" : "CLIENT";

  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", role: defaultRole });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      if (data.user.role === "CHEF") {
        window.location.href = "/chef/onboarding";
      } else {
        window.location.href = "/browse";
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

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
          <Link href="/login" className="text-gold font-medium hover:text-gold-light transition-colors">Sign In</Link>
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
