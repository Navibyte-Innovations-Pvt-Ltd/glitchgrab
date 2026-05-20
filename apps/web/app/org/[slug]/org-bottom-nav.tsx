"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutGrid,
  MessageSquare,
  GitFork,
  ClipboardList,
  Activity,
  SearchCheck,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrgContext } from "./lib/get-org-context";

export function OrgBottomNav({ ctx }: { ctx: OrgContext }) {
  const pathname = usePathname();
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);
  const base = `/org/${ctx.orgSlug}`;
  const isOwner = ctx.role === "OWNER";

  const items = isOwner
    ? [
        { href: "", label: "Overview", icon: LayoutGrid },
        { href: "/chat", label: "Chat", icon: MessageSquare },
        { href: "/repos", label: "Repos", icon: GitFork },
        { href: "/reports", label: "Reports", icon: ClipboardList },
        { href: "/analytics", label: "Analytics", icon: Activity },
        { href: "/seo", label: "SEO", icon: SearchCheck },
      ]
    : [
        { href: "/chat", label: "Chat", icon: MessageSquare },
        { href: "/repos", label: "Repos", icon: GitFork },
      ];

  function handleNav(href: string) {
    const isWebView = !!document.getElementById("glitchgrab-webview");
    if (isWebView) {
      setNavigating(true);
      window.location.href = href;
    } else {
      router.push(href);
    }
  }

  return (
    <>
      {navigating && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-background/80">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm">
        <div className="flex h-16">
          {items.map((item) => {
            const href = `${base}${item.href}`;
            const isActive = item.href === "" ? pathname === base : pathname.startsWith(href);
            return (
              <button
                key={href}
                type="button"
                onClick={() => handleNav(href)}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-mono uppercase tracking-wider transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
