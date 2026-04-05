import { SkeletonCard, SkeletonBox } from "@/components/Skeleton";

export default function ForYouLoading() {
  return (
    <div className="min-h-screen bg-dark">
      <div className="max-w-6xl mx-auto px-4 pt-24 pb-16">
        <SkeletonBox className="h-8 w-48 mb-2" />
        <SkeletonBox className="h-4 w-72 mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
