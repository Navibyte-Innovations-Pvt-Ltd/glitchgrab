"use client";

import { Clock } from "lucide-react";
import Link from "next/link";

export function TrialBanner({
  daysLeft,
  hoursLeft,
}: {
  daysLeft: number;
  hoursLeft: number;
}) {
  const timeText =
    daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? "" : "s"}` : `${hoursLeft}h`;

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 mb-4 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <Clock className="h-4 w-4 text-primary shrink-0" />
        <span className="truncate">
          Free trial ends in <strong>{timeText}</strong>
        </span>
      </div>
      <Link
        href="/dashboard/billing"
        className="shrink-0 text-xs font-medium text-primary hover:underline"
      >
        Upgrade now
      </Link>
    </div>
  );
}
