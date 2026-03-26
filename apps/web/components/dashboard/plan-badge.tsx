import { cn } from "@/lib/utils";
import { Crown, Clock, Key } from "lucide-react";

export type PlanBadgeType = "premium" | "trial" | "byok" | "none";

interface PlanBadgeProps {
  type: PlanBadgeType;
  daysLeft?: number;
  className?: string;
}

const config = {
  premium: {
    label: "Premium",
    icon: Crown,
    className: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  },
  trial: {
    label: "Trial",
    icon: Clock,
    className: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  },
  byok: {
    label: "BYOK",
    icon: Key,
    className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  },
} as const;

export function PlanBadge({ type, daysLeft, className }: PlanBadgeProps) {
  if (type === "none") return null;

  const { label, icon: Icon, className: badgeClass } = config[type];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none",
        badgeClass,
        className,
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {type === "trial" && daysLeft !== undefined ? `${daysLeft}d left` : label}
    </span>
  );
}
