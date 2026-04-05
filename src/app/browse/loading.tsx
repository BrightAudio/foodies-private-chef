import { SkeletonChefCard, SkeletonBox } from "@/components/Skeleton";

export default function BrowseLoading() {
  return (
    <div className="min-h-screen bg-dark">
      <div className="max-w-7xl mx-auto px-4 pt-24 pb-16">
        {/* Tier filter pills */}
        <div className="flex gap-3 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBox key={i} className="h-10 w-28 rounded-full" />
          ))}
        </div>
        {/* Search bar */}
        <SkeletonBox className="h-12 w-full max-w-md mb-8 rounded-lg" />
        {/* Chef grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonChefCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
