"use client";

import { Clock } from "lucide-react";
import { UpgradeButton } from "@/app/dashboard/billing/upgrade-button";

export function TrialBanner({
  daysLeft,
  hoursLeft,
  email,
  name,
}: {
  daysLeft: number;
  hoursLeft: number;
  email: string;
  name: string;
}) {
  const timeText =
    daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? "" : "s"}` : `${hoursLeft}h`;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-2 bg-primary/10 backdrop-blur-sm border-b border-primary/20 px-3 py-1.5 text-xs md:left-64">
      <div className="flex items-center gap-1.5 min-w-0">
        <Clock className="h-3 w-3 text-primary shrink-0" />
        <span className="truncate">
          Trial ends in <strong>{timeText}</strong>
        </span>
      </div>
      <UpgradeButton
        plan="PRO_PLATFORM"
        label="Upgrade"
        email={email}
        name={name}
        variant="link"
      />
    </div>
  );
}
