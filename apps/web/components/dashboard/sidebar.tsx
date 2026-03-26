"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, GitFork, Key, Settings, LogOut, CreditCard, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PlanBadge, type PlanBadgeType } from "@/components/dashboard/plan-badge";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, ownerOnly: false },
  { href: "/dashboard/repos", label: "Repos", icon: GitFork, ownerOnly: false },
  { href: "/dashboard/tokens", label: "API Tokens", icon: Key, ownerOnly: true },
  { href: "/dashboard/collaborators", label: "Collaborators", icon: Users, ownerOnly: true },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard, ownerOnly: true },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, ownerOnly: true },
];

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

export function Sidebar({ user, userType = "owner", planBadge = "none", trialDaysLeft = 0 }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-r border-border bg-card">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-border">
        <Image src="/logo.png" alt="Glitchgrab" width={28} height={28} className="rounded-full" />
        <span className="font-semibold tracking-tight">glitchgrab</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.filter((item) => !item.ownerOnly || userType === "owner").map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-4 py-4">
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
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
