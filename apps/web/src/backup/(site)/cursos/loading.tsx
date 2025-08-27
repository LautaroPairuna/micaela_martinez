import SkeletonGrid from "@/backup/components/SkeletonGrid";
export default function Loading() {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="h-6 w-56 animate-pulse rounded bg-white/[0.08]" />
        <div className="mt-2 h-4 w-80 animate-pulse rounded bg-white/[0.08]" />
      </div>
      <SkeletonGrid />
    </section>
  );
}
