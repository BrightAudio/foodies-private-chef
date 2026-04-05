import { SkeletonBox, SkeletonText } from "@/components/Skeleton";

export default function CommunityLoading() {
  return (
    <div className="min-h-screen bg-dark">
      <div className="max-w-3xl mx-auto px-4 pt-24 pb-16">
        <SkeletonBox className="h-8 w-36 mb-8" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-white/10 rounded-lg p-5">
              <div className="flex items-center gap-3 mb-3">
                <SkeletonBox className="h-10 w-10 rounded-full" />
                <div className="space-y-1">
                  <SkeletonBox className="h-4 w-24" />
                  <SkeletonBox className="h-3 w-16" />
                </div>
              </div>
              <SkeletonText lines={3} />
              <div className="flex gap-4 mt-3">
                <SkeletonBox className="h-4 w-12" />
                <SkeletonBox className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
