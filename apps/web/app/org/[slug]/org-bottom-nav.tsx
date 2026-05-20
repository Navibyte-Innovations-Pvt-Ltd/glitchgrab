"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  MessageSquare,
  GitFork,
  ClipboardList,
  Activity,
  SearchCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrgContext } from "./lib/get-org-context";

export function OrgBottomNav({ ctx }: { ctx: OrgContext }) {
  const pathname = usePathname();
  const router = useRouter();
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

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm">
      <div className="flex h-16">
        {items.map((item) => {
          const href = `${base}${item.href}`;
          const isActive = item.href === "" ? pathname === base : pathname.startsWith(href);
          return (
            <button
              key={href}
              onClick={() => {
                const isWebView = !!document.getElementById("glitchgrab-webview");
                if (isWebView) {
                  window.location.href = href;
                } else {
                  router.push(href);
                }
              }}
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
  );
}
