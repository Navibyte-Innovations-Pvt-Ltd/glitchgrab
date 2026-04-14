"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  LayoutDashboard,
  GitFork,
  Key,
  Settings,
  LogOut,
  CreditCard,
  Users,
  ClipboardList,
  MessageSquare,
  Bug,
  Loader2,
} from "lucide-react";
import { ReportButton } from "glitchgrab";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { PlanBadgeType } from "@/components/dashboard/plan-badge";

type BadgeTone = "danger" | "warn" | "primary" | "muted";

interface NavBadge {
  text: string;
  tone: BadgeTone;
}

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  ownerOnly: boolean;
  kbd?: string;
  badge?: NavBadge;
}

interface NavGroup {
  label: string;
  statusDot?: "ok" | "warn" | "none";
  items: NavItem[];
}

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  userType?: "owner" | "collaborator";
  planBadge?: PlanBadgeType;
  trialDaysLeft?: number;
}

const PLAN_LABELS: Record<PlanBadgeType, string | null> = {
  premium: "PRO",
  trial: "TRIAL",
  none: null,
};

const TONE_CLASS: Record<BadgeTone, string> = {
  danger: "text-red-400 bg-red-500/10 border-red-500/30",
  warn: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  primary: "text-primary bg-primary/10 border-primary/30",
  muted: "text-muted-foreground bg-muted border-border",
};

export function Sidebar({
  user,
  userType = "owner",
  planBadge = "none",
  trialDaysLeft = 0,
}: SidebarProps) {
  const pathname = usePathname();

  // Live counts from TanStack cache (fetched by the dashboard; sidebar just reads)
  const { data: issues } = useQuery<unknown[]>({
    queryKey: ["open-issues"],
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/repos/issues");
      return data.data ?? [];
    },
    staleTime: 60_000,
    enabled: userType === "owner",
  });
  const { data: analytics } = useQuery<{ failed: number }>({
    queryKey: ["reports-analytics"],
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/reports/analytics");
      return data.data;
    },
    staleTime: 60_000,
    enabled: userType === "owner",
  });

  const issueCount = issues?.length ?? 0;
  const failedCount = analytics?.failed ?? 0;

  const reportsBadge: NavBadge | undefined =
    failedCount > 0
      ? { text: `${failedCount} FAIL`, tone: "danger" }
      : issueCount > 0
      ? { text: `${issueCount}`, tone: "primary" }
      : undefined;

  const billingBadge: NavBadge | undefined =
    planBadge === "trial"
      ? { text: `T-${trialDaysLeft}D`, tone: "warn" }
      : planBadge === "premium"
      ? { text: "PRO", tone: "primary" }
      : undefined;

  const navGroups: NavGroup[] = [
    {
      label: "Workspace",
      statusDot: "ok",
      items: [
        { href: "/dashboard", label: "Overview", icon: LayoutDashboard, ownerOnly: false, kbd: "G O" },
        { href: "/dashboard/chat", label: "Chat", icon: MessageSquare, ownerOnly: false, kbd: "G C" },
        { href: "/dashboard/repos", label: "Repos", icon: GitFork, ownerOnly: false, kbd: "G R" },
        {
          href: "/dashboard/reports",
          label: "Reports",
          icon: ClipboardList,
          ownerOnly: false,
          kbd: "G P",
          badge: reportsBadge,
        },
      ],
    },
    {
      label: "Config",
      items: [
        { href: "/dashboard/tokens", label: "API Tokens", icon: Key, ownerOnly: true, kbd: "G T" },
        { href: "/dashboard/collaborators", label: "Collaborators", icon: Users, ownerOnly: true },
        {
          href: "/dashboard/billing",
          label: "Billing",
          icon: CreditCard,
          ownerOnly: true,
          kbd: "G B",
          badge: billingBadge,
        },
        { href: "/dashboard/settings", label: "Settings", icon: Settings, ownerOnly: true, kbd: "G S" },
      ],
    },
  ];

  const planLabel =
    planBadge === "trial" && trialDaysLeft !== undefined
      ? `${trialDaysLeft}D`
      : PLAN_LABELS[planBadge];

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-r border-border bg-card relative z-20">
      {/* Brand header */}
      <div className="h-14 flex items-center gap-3 px-4 border-b border-border/60 shrink-0">
        <div className="w-7 h-7 rounded bg-linear-to-br from-primary to-primary/60 flex items-center justify-center shadow-[0_0_12px_rgba(34,211,238,0.2)] shrink-0">
          <Image src="/logo.png" alt="Glitchgrab" width={18} height={18} className="rounded-sm" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[11px] font-bold tracking-[0.18em] text-foreground leading-tight truncate">
            GLITCHGRAB
          </div>
          <div className="font-mono text-[9px] text-muted-foreground/80 tracking-widest uppercase truncate mt-0.5">
            {userType === "owner" ? "workspace" : "collaborator"}
          </div>
        </div>
      </div>

      {/* Nav body */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 flex flex-col gap-5">
        {navGroups.map((group) => {
          const visible = group.items.filter((i) => !i.ownerOnly || userType === "owner");
          if (visible.length === 0) return null;

          return (
            <div key={group.label}>
              <h3 className="flex items-center gap-2 px-2 mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 font-semibold select-none">
                <span>{group.label}</span>
                {group.statusDot === "ok" ? (
                  <>
                    <div className="h-px bg-border flex-1" />
                    <span className="relative flex h-1.5 w-1.5 shrink-0" title="All nominal">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60 animate-ping" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]" />
                    </span>
                  </>
                ) : (
                  <div className="h-px bg-border flex-1" />
                )}
              </h3>
              <ul className="space-y-0.5">
                {visible.map((item) => {
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname.startsWith(item.href);

                  return (
                    <li key={item.href} className="relative">
                      {isActive && (
                        <span
                          aria-hidden
                          className="absolute left-0 top-1 bottom-1 w-0.75 rounded-r bg-primary shadow-[0_0_6px_rgba(34,211,238,0.5)] z-10"
                        />
                      )}
                      <Link
                        href={item.href}
                        prefetch
                        className={cn(
                          "group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                          isActive
                            ? "bg-primary/10 text-foreground font-medium"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            isActive
                              ? "text-primary"
                              : "text-muted-foreground group-hover:text-foreground",
                          )}
                        />
                        <span className="truncate flex-1">{item.label}</span>
                        {item.badge && (
                          <span
                            className={cn(
                              "font-mono text-[9px] px-1.5 py-0.5 rounded border leading-none tabular-nums uppercase tracking-wide",
                              TONE_CLASS[item.badge.tone],
                            )}
                          >
                            {item.badge.text}
                          </span>
                        )}
                        {item.kbd && !isActive && !item.badge && (
                          <kbd
                            className={cn(
                              "font-mono text-[9px] px-1.5 py-0.5 rounded bg-background border border-border text-muted-foreground/50 leading-none transition-colors",
                              "group-hover:text-muted-foreground group-hover:border-border",
                            )}
                          >
                            {item.kbd}
                          </kbd>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}

        {/* Report Bug — keyboard-styled command, sticks to bottom of nav */}
        <div className="mt-auto pt-2">
          <ReportButton>
            {({ onClick, capturing }) => (
              <button
                type="button"
                onClick={onClick}
                disabled={capturing}
                className="w-full group border border-dashed border-border hover:border-primary/50 bg-background/40 hover:bg-muted rounded-md p-2 flex items-center justify-between transition-colors focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-60"
              >
                <span className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground group-hover:text-foreground transition-colors">
                  {capturing ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                      <span>CAPTURING…</span>
                    </>
                  ) : (
                    <>
                      <span className="text-primary group-hover:animate-pulse">{">"}</span>
                      <Bug className="h-3 w-3" />
                      <span>REPORT_BUG</span>
                    </>
                  )}
                </span>
                {!capturing && (
                  <kbd className="font-mono text-[9px] text-muted-foreground bg-card border border-border group-hover:border-muted-foreground/40 rounded px-1.5 py-0.5 leading-none">
                    ⇧⌘B
                  </kbd>
                )}
              </button>
            )}
          </ReportButton>
        </div>
      </nav>

      {/* User footer */}
      <div className="border-t border-border bg-background/40 select-none">
        <div className="p-3 flex items-center gap-3">
          <div className="relative shrink-0">
            <Avatar className="h-9 w-9 border border-border">
              <AvatarImage src={user.image ?? undefined} alt={user.name ?? "User"} />
              <AvatarFallback className="font-mono text-xs">
                {user.name?.charAt(0).toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 bg-card rounded-sm p-0.5">
              <span className="block h-1.5 w-1.5 bg-primary rounded-sm shadow-[0_0_4px_rgba(34,211,238,0.8)]" />
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-foreground truncate">{user.name}</span>
              {planLabel && (
                <span
                  className={cn(
                    "font-mono text-[9px] leading-none uppercase tracking-widest px-1 py-0.5 rounded-[3px] border",
                    planBadge === "premium" && "text-yellow-400 border-yellow-400/40 bg-yellow-400/10",
                    planBadge === "trial" && "text-primary border-primary/40 bg-primary/10",
                  )}
                >
                  {planLabel}
                </span>
              )}
            </div>
            <p className="text-[11px] font-mono text-muted-foreground/80 truncate mt-0.5">
              {user.email}
            </p>
          </div>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            aria-label="Sign out"
            title="Sign out"
            className="w-7 h-7 flex items-center justify-center shrink-0 rounded text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
