import { SkeletonBox, SkeletonText } from "@/components/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-dark">
      <div className="max-w-7xl mx-auto px-4 pt-24 pb-16">
        <SkeletonBox className="h-8 w-48 mb-8" />
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-white/10 rounded-lg p-4">
              <SkeletonBox className="h-4 w-20 mb-2" />
              <SkeletonBox className="h-8 w-16" />
            </div>
          ))}
        </div>
        {/* Bookings list */}
        <SkeletonBox className="h-6 w-36 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-white/10 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <SkeletonBox className="h-5 w-32" />
                <SkeletonBox className="h-5 w-20 rounded-full" />
              </div>
              <SkeletonText lines={2} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
