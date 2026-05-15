import { Skeleton } from "@/components/ui/skeleton";

export default function OrgSeoLoading() {
  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="space-y-1.5">
        <Skeleton className="h-5 w-12" />
        <Skeleton className="h-3.5 w-56" />
      </div>

      <div className="space-y-4">
        {/* Search bar */}
        <Skeleton className="h-8 w-full" />

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-8 w-36" />
        </div>

        {/* Property rows */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-border rounded bg-card/40 p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3.5 w-3.5 rounded" />
                  <Skeleton className="h-4 w-4 rounded-sm" />
                  <Skeleton className="h-3.5 w-48" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-3" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-7 w-32" />
                <Skeleton className="h-7 w-22" />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1 border-t border-border/40">
              <Skeleton className="h-3.5 w-3.5" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 flex-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
