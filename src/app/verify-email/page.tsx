"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided.");
      return;
    }

    fetch(`/api/auth/verify-email?token=${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus("success");
          setMessage(data.message);
        } else {
          setStatus("error");
          setMessage(data.error || "Verification failed");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      });
  }, [token]);

  return (
    <>
      <Navbar />
      <div className="max-w-md mx-auto pt-32 pb-16 px-4 text-center">
        {status === "loading" && (
          <div>
            <div className="text-4xl mb-4">⏳</div>
            <h1 className="text-2xl font-bold mb-2 tracking-tight">Verifying your email...</h1>
            <p className="text-cream-muted">Please wait a moment.</p>
          </div>
        )}

        {status === "success" && (
          <div>
            <div className="text-4xl mb-4">✅</div>
            <h1 className="text-2xl font-bold mb-2 tracking-tight text-gold">Email Verified!</h1>
            <p className="text-cream-muted mb-8">{message}</p>
            <Link
              href="/login"
              className="inline-block bg-gold text-dark px-8 py-3 font-semibold text-sm tracking-[0.15em] uppercase hover:bg-gold-light transition-colors"
            >
              Sign In
            </Link>
          </div>
        )}

        {status === "error" && (
          <div>
            <div className="text-4xl mb-4">❌</div>
            <h1 className="text-2xl font-bold mb-2 tracking-tight">Verification Failed</h1>
            <p className="text-red-400 mb-8">{message}</p>
            <Link
              href="/login"
              className="inline-block bg-gold text-dark px-8 py-3 font-semibold text-sm tracking-[0.15em] uppercase hover:bg-gold-light transition-colors"
            >
              Go to Login
            </Link>
          </div>
        )}
      </div>
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="text-center py-32 text-cream-muted">Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
