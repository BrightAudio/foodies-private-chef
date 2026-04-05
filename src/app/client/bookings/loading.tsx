import { SkeletonBox, SkeletonText } from "@/components/Skeleton";

export default function BookingsLoading() {
  return (
    <div className="min-h-screen bg-dark">
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-16">
        <SkeletonBox className="h-8 w-40 mb-8" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-white/10 rounded-lg p-5">
              <div className="flex justify-between items-start mb-3">
                <div className="space-y-2">
                  <SkeletonBox className="h-5 w-40" />
                  <SkeletonBox className="h-4 w-28" />
                </div>
                <SkeletonBox className="h-6 w-20 rounded-full" />
              </div>
              <SkeletonText lines={2} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
