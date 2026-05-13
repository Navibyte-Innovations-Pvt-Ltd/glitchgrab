"use client";

import { usePathname } from "next/navigation";
import { GitBranch, TerminalSquare } from "lucide-react";

function getSegment(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  // parts[0] = "dashboard", parts[1] = segment
  return parts[1] ?? "dashboard";
}

export function DashboardStatusBar() {
  const pathname = usePathname();
  const segment = getSegment(pathname);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs font-mono text-muted-foreground border-b border-border px-4 py-3 md:px-6">
      <div className="flex items-center gap-3 min-w-0">
        <TerminalSquare className="h-4 w-4 text-primary shrink-0" />
        <span className="truncate">~/glitchgrab/{segment}</span>
        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-card rounded border border-border">
          <GitBranch className="h-3 w-3" /> main
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
        </span>
        <span>System Ops Normal</span>
      </div>
    </div>
  );
}
