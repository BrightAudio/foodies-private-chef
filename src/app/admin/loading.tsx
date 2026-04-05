import { SkeletonBox, SkeletonText } from "@/components/Skeleton";

export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-dark">
      <div className="max-w-7xl mx-auto px-4 pt-24 pb-16">
        <SkeletonBox className="h-8 w-56 mb-8" />
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-white/10 rounded-lg p-4">
              <SkeletonBox className="h-4 w-20 mb-2" />
              <SkeletonBox className="h-8 w-16" />
            </div>
          ))}
        </div>
        {/* Table */}
        <div className="border border-white/10 rounded-lg p-4 space-y-3">
          <SkeletonBox className="h-6 w-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonText key={i} lines={1} />
          ))}
        </div>
      </div>
    </div>
  );
}
