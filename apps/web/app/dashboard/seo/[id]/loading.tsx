import { Skeleton } from "@/components/ui/skeleton";

export default function GscPropertyDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Back link */}
      <Skeleton className="h-3.5 w-16" />

      {/* Header */}
      <div className="space-y-1.5">
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-3.5 w-40" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-border rounded bg-card/40 p-4 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-12" />
          </div>
        ))}
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        {/* LEFT — Indexing data */}
        <div className="border border-border rounded bg-card/40 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3.5 w-3.5 rounded-full" />
              <Skeleton className="h-3 w-36" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <div className="divide-y divide-border/40">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 gap-3">
                <Skeleton className="h-3 flex-1" style={{ maxWidth: `${60 + (i % 3) * 15}%` }} />
                <Skeleton className="h-3 w-3 shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — Health panels */}
        <div className="space-y-4">
          {/* Favicon health */}
          <div className="border border-border rounded bg-card/40 overflow-hidden">
            <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
              <Skeleton className="h-3.5 w-3.5" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3.5 w-3.5 rounded-full" />
                <Skeleton className="h-3.5 w-48" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-3.5 w-3.5 rounded-full" />
                <Skeleton className="h-3.5 w-36" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-3.5 w-3.5 rounded-full" />
                <Skeleton className="h-3.5 w-40" />
              </div>
            </div>
          </div>

          {/* Social / OG tags */}
          <div className="border border-border rounded bg-card/40 overflow-hidden">
            <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
              <Skeleton className="h-3.5 w-3.5" />
              <Skeleton className="h-3 w-28" />
            </div>
            <div className="p-4 space-y-4">
              <Skeleton className="h-36 w-full rounded" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
