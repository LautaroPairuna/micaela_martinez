export default function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          <div className="h-40 animate-pulse bg-white/[0.06]" />
          <div className="space-y-2 p-4">
            <div className="h-4 w-24 animate-pulse rounded bg-white/[0.08]" />
            <div className="h-5 w-3/4 animate-pulse rounded bg-white/[0.08]" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-white/[0.08]" />
            <div className="mt-4 flex gap-2">
              <div className="h-8 w-24 animate-pulse rounded bg-white/[0.08]" />
              <div className="h-8 w-28 animate-pulse rounded bg-white/[0.08]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
