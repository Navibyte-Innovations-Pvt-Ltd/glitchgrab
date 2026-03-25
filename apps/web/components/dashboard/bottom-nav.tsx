"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, GitFork, User, Menu, Key, CreditCard, Settings, LogOut, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";

const SHEET_NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, ownerOnly: false },
  { href: "/dashboard/repos", label: "Repos", icon: GitFork, ownerOnly: false },
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
}

export function BottomNav({ user, userType = "owner" }: BottomNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const bottomItems = userType === "owner"
    ? [
        { href: "/dashboard", label: "Home", icon: LayoutDashboard },
        { href: "/dashboard/repos", label: "Repos", icon: GitFork },
        { href: "/dashboard/settings", label: "Profile", icon: User },
      ]
    : [
        { href: "/dashboard", label: "Home", icon: LayoutDashboard },
        { href: "/dashboard/repos", label: "Repos", icon: GitFork },
      ];

  return (
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
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
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

            <div className="border-t border-border px-4 py-4 mt-auto">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.image ?? undefined} alt={user.name ?? "User"} />
                  <AvatarFallback>{user.name?.charAt(0) ?? "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name}</p>
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
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
