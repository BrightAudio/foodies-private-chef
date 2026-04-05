import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-6xl font-bold text-gold mb-4">404</p>
        <h1 className="text-2xl font-bold text-cream mb-2">Page Not Found</h1>
        <p className="text-cream-muted mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block bg-gold text-dark px-8 py-3 font-semibold text-sm tracking-[0.15em] uppercase hover:bg-gold-light transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
