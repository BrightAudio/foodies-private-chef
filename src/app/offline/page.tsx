import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-5xl mb-4">📡</p>
        <h1 className="text-2xl font-bold text-cream mb-2">You&apos;re Offline</h1>
        <p className="text-cream-muted mb-8">
          It looks like you&apos;ve lost your internet connection. Check your connection and try again.
        </p>
        <Link
          href="/"
          className="inline-block bg-gold text-dark px-8 py-3 font-semibold text-sm tracking-[0.15em] uppercase hover:bg-gold-light transition-colors"
        >
          Try Again
        </Link>
      </div>
    </div>
  );
}
