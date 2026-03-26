import { cn } from "@/lib/utils";
import { Crown, Clock } from "lucide-react";

export type PlanBadgeType = "premium" | "trial" | "none";

interface PlanBadgeProps {
  type: PlanBadgeType;
  daysLeft?: number;
  className?: string;
}

const config = {
  premium: {
    label: "Pro",
    icon: Crown,
    className: "bg-yellow-400/20 text-yellow-300 border-yellow-400/40",
  },
  trial: {
    label: "Trial",
    icon: Clock,
    className: "bg-cyan-400/20 text-cyan-300 border-cyan-400/40",
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
