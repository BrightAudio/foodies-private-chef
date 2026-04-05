// Reusable skeleton loading primitives

export function SkeletonBox({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-white/5 rounded ${className}`} />;
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`animate-pulse bg-white/5 rounded h-4 ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`border border-white/10 rounded-lg overflow-hidden ${className}`}>
      <SkeletonBox className="h-48 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <SkeletonBox className="h-5 w-1/3" />
        <SkeletonBox className="h-4 w-2/3" />
        <SkeletonBox className="h-4 w-1/2" />
      </div>
    </div>
  );
}

export function SkeletonChefCard() {
  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      <SkeletonBox className="h-52 w-full rounded-none" />
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <SkeletonBox className="h-5 w-16 rounded-full" />
          <SkeletonBox className="h-5 w-24" />
        </div>
        <SkeletonBox className="h-4 w-3/4" />
        <div className="flex gap-2">
          <SkeletonBox className="h-6 w-16 rounded-full" />
          <SkeletonBox className="h-6 w-20 rounded-full" />
        </div>
        <div className="flex justify-between items-center pt-2">
          <SkeletonBox className="h-4 w-20" />
          <SkeletonBox className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonChefProfile() {
  return (
    <div className="min-h-screen bg-dark">
      <div className="max-w-5xl mx-auto px-4 pt-24 pb-16">
        {/* Hero */}
        <div className="flex flex-col md:flex-row gap-8 mb-12">
          <SkeletonBox className="w-40 h-40 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-4">
            <SkeletonBox className="h-8 w-64" />
            <div className="flex gap-3">
              <SkeletonBox className="h-6 w-20 rounded-full" />
              <SkeletonBox className="h-6 w-24 rounded-full" />
            </div>
            <SkeletonText lines={3} />
            <SkeletonBox className="h-10 w-40 rounded" />
          </div>
        </div>
        {/* Specials grid */}
        <SkeletonBox className="h-7 w-32 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
