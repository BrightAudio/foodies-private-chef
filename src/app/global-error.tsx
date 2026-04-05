"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-dark text-cream">
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <p className="text-6xl font-bold text-red-400 mb-4">!</p>
            <h1 className="text-2xl font-bold mb-2">Something Went Wrong</h1>
            <p className="text-gray-400 mb-8">A critical error occurred. Please try again.</p>
            <button
              onClick={reset}
              className="inline-block bg-amber-500 text-black px-8 py-3 font-semibold text-sm tracking-wider uppercase"
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
