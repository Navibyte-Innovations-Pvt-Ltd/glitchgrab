"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutGrid,
  MessageSquare,
  GitFork,
  ClipboardList,
  Activity,
  Key,
  CreditCard,
  Settings,
  LogOut,
  UserCog,
  SearchCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { OrgContext } from "./lib/get-org-context";

const OWNER_NAV = [
  { href: "", label: "Overview", icon: LayoutGrid },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/repos", label: "Repos", icon: GitFork },
  { href: "/reports", label: "Reports", icon: ClipboardList },
  { href: "/analytics", label: "Analytics", icon: Activity },
  { href: "/seo", label: "SEO", icon: SearchCheck },
];

const OWNER_CONFIG = [
  { href: "/members", label: "Members", icon: UserCog },
  { href: "/tokens", label: "API Tokens", icon: Key },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

const MEMBER_NAV = [
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/repos", label: "Repos", icon: GitFork },
];

export function OrgSidebar({ ctx }: { ctx: OrgContext }) {
  const pathname = usePathname();
  const base = `/org/${ctx.orgSlug}`;
  const isOwner = ctx.role === "OWNER";

  const navItems = isOwner ? OWNER_NAV : MEMBER_NAV;
  const configItems = isOwner ? OWNER_CONFIG : [];

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-r border-border bg-card relative z-20">
      {/* Brand */}
      <div className="h-14 flex items-center gap-3 px-4 border-b border-border/60 shrink-0">
        <div className="w-7 h-7 rounded border border-border shrink-0 overflow-hidden">
          <Image
            src={`https://github.com/${ctx.orgSlug}.png`}
            alt={ctx.orgName}
            width={28}
            height={28}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[11px] font-bold tracking-[0.18em] text-foreground leading-tight truncate uppercase">
            {ctx.orgName}
          </div>
          <div className="font-mono text-[9px] text-muted-foreground/80 tracking-widest uppercase truncate mt-0.5">
            {isOwner ? "owner" : "member"}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 flex flex-col gap-5">
        {/* Workspace group */}
        <div>
          <h3 className="flex items-center gap-2 px-2 mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 font-semibold select-none">
            <span>Workspace</span>
            <div className="h-px bg-border flex-1" />
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]" />
            </span>
          </h3>
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const href = `${base}${item.href}`;
              const isActive = item.href === ""
                ? pathname === base
                : pathname.startsWith(href);
              return (
                <SidebarItem key={href} href={href} label={item.label} icon={item.icon} isActive={isActive} />
              );
            })}
          </ul>
        </div>

        {/* Config group — OWNER only */}
        {configItems.length > 0 && (
          <div>
            <h3 className="flex items-center gap-2 px-2 mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 font-semibold select-none">
              <span>Config</span>
              <div className="h-px bg-border flex-1" />
            </h3>
            <ul className="space-y-0.5">
              {configItems.map((item) => {
                const href = `${base}${item.href}`;
                const isActive = pathname.startsWith(href);
                return (
                  <SidebarItem key={href} href={href} label={item.label} icon={item.icon} isActive={isActive} />
                );
              })}
            </ul>
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-border bg-background/40 select-none">
        <div className="p-3 flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-border shrink-0">
            <AvatarImage src={ctx.userImage ?? undefined} alt={ctx.userName} />
            <AvatarFallback className="font-mono text-xs">
              {ctx.userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground truncate">{ctx.userName}</div>
            <p className="text-[11px] font-mono text-muted-foreground/80 truncate mt-0.5">{ctx.userEmail}</p>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            aria-label="Sign out"
            className="w-7 h-7 flex items-center justify-center shrink-0 rounded text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function SidebarItem({
  href,
  label,
  icon: Icon,
  isActive,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  isActive: boolean;
}) {
  return (
    <li className="relative">
      {isActive && (
        <span className="absolute left-0 top-1 bottom-1 w-0.75 rounded-r bg-primary shadow-[0_0_6px_rgba(34,211,238,0.5)] z-10" />
      )}
      <Link
        href={href}
        prefetch
        className={cn(
          "group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
          isActive
            ? "bg-primary/10 text-foreground font-medium"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Icon
          size={16}
          className={cn(
            "shrink-0 transition-colors",
            isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
          )}
        />
        <span className="truncate flex-1">{label}</span>
      </Link>
    </li>
  );
}
