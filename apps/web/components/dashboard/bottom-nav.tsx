"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, GitFork, Menu, Key, CreditCard, Settings, LogOut, Users, ClipboardList } from "lucide-react";
import { ReportButton } from "glitchgrab";
import { Bug, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";
import { PlanBadge, type PlanBadgeType } from "@/components/dashboard/plan-badge";

const SHEET_NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, ownerOnly: false },
  { href: "/dashboard/repos", label: "Repos", icon: GitFork, ownerOnly: false },
  { href: "/dashboard/reports", label: "Reports", icon: ClipboardList, ownerOnly: false },
  { href: "/dashboard/tokens", label: "API Tokens", icon: Key, ownerOnly: true },
  { href: "/dashboard/collaborators", label: "Collaborators", icon: Users, ownerOnly: true },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard, ownerOnly: true },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, ownerOnly: true },
];

interface BottomNavProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  userType?: "owner" | "collaborator";
  planBadge?: PlanBadgeType;
  trialDaysLeft?: number;
}

export function BottomNav({ user, userType = "owner", planBadge = "none", trialDaysLeft = 0 }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [navigating, setNavigating] = useState(false);

  const bottomItems = userType === "owner"
    ? [
        { href: "/dashboard", label: "Home", icon: LayoutDashboard },
        { href: "/dashboard/repos", label: "Repos", icon: GitFork },
      ]
    : [
        { href: "/dashboard", label: "Home", icon: LayoutDashboard },
        { href: "/dashboard/repos", label: "Repos", icon: GitFork },
      ];

  const profileActive = pathname.startsWith("/dashboard/settings");

  return (
    <>
    {navigating && (
      <div className="fixed inset-0 z-9999 flex items-center justify-center bg-background/80">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )}
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card md:hidden">
      <div className="flex items-center justify-around py-2">
        {bottomItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Profile tab with avatar + badge */}
        {userType === "owner" && (
          <Link
            href="/dashboard/settings"
            prefetch
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition",
              profileActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <div className="relative">
              <Avatar className="h-6 w-6">
                <AvatarImage src={user.image ?? undefined} alt={user.name ?? "User"} />
                <AvatarFallback className="text-[8px]">{user.name?.charAt(0) ?? "U"}</AvatarFallback>
              </Avatar>
              {planBadge !== "none" && (
                <span className={cn(
                  "absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full border-2 border-card",
                  planBadge === "premium" && "bg-yellow-400",
                  planBadge === "trial" && "bg-cyan-400",
                )} />
              )}
            </div>
            <span>Profile</span>
          </Link>
        )}

        {/* Report Bug */}
        <ReportButton>
          {({ onClick, capturing }) => (
            <Button
              variant="ghost"
              onClick={onClick}
              disabled={capturing}
              className="flex flex-col items-center gap-0.5 px-3 py-1 h-auto text-xs text-muted-foreground"
            >
              {capturing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Bug className="h-5 w-5" />}
              <span>{capturing ? "..." : "Report"}</span>
            </Button>
          )}
        </ReportButton>

        {/* Menu button */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="flex flex-col items-center gap-0.5 px-3 py-1 text-xs text-muted-foreground transition">
            <Menu className="h-5 w-5" />
            <span>Menu</span>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="flex items-center gap-2 px-6 py-5 border-b border-border">
              <Image src="/logo.png" alt="Glitchgrab" width={28} height={28} className="rounded-full" />
              <span className="font-semibold tracking-tight">glitchgrab</span>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1">
              {SHEET_NAV_ITEMS.filter((item) => !item.ownerOnly || userType === "owner").map((item) => {
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);
                return (
                  <Button
                    key={item.href}
                    variant="ghost"
                    onClick={() => {
                      setOpen(false);
                      const isWebView = !!document.getElementById("glitchgrab-webview");
                      if (isWebView) {
                        setNavigating(true);
                        window.location.href = item.href;
                      } else {
                        router.push(item.href);
                      }
                    }}
                    className={cn(
                      "flex w-full justify-start items-center gap-3 rounded-lg px-3 py-2 text-sm",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                );
              })}
              <div className="mt-2 px-0">
                <ReportButton>
                  {({ onClick, capturing }) => (
                    <Button
                      variant="ghost"
                      onClick={onClick}
                      disabled={capturing}
                      className="flex w-full justify-start items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      {capturing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bug className="h-4 w-4" />}
                      {capturing ? "Capturing..." : "Report Bug"}
                    </Button>
                  )}
                </ReportButton>
              </div>
            </nav>

            <div className="border-t border-border px-4 py-4 mt-auto">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.image ?? undefined} alt={user.name ?? "User"} />
                  <AvatarFallback>{user.name?.charAt(0) ?? "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <PlanBadge type={planBadge} daysLeft={trialDaysLeft} />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-muted-foreground"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
    </>
  );
}
