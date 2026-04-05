"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-6xl font-bold text-red-400 mb-4">!</p>
        <h1 className="text-2xl font-bold text-cream mb-2">Something Went Wrong</h1>
        <p className="text-cream-muted mb-8">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <button
          onClick={reset}
          className="inline-block bg-gold text-dark px-8 py-3 font-semibold text-sm tracking-[0.15em] uppercase hover:bg-gold-light transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
