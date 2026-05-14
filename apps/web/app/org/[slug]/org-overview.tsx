"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { GitFork, Users, ClipboardList, Activity } from "lucide-react";
import type { OrgContext } from "./lib/get-org-context";

interface OrgData {
  repos: { id: string }[];
  members: { id: string; role: string; user: { name: string | null; image: string | null; githubLogin: string | null } }[];
}

export function OrgOverview({ ctx }: { ctx: OrgContext }) {
  const { data } = useQuery<OrgData>({
    queryKey: ["org", ctx.orgSlug],
    queryFn: async () => {
      const { data } = await axios.get(`/api/v1/orgs/${ctx.orgSlug}`);
      return data.data;
    },
    staleTime: 30_000,
  });

  const stats = [
    { label: "Repos", value: data?.repos.length ?? ctx.repos.length, icon: GitFork },
    { label: "Members", value: data?.members.length ?? "—", icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{ctx.orgName}</h1>
        <p className="text-sm text-muted-foreground font-mono mt-0.5">@{ctx.orgSlug}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
            <s.icon size={18} className="text-primary shrink-0" />
            <div>
              <div className="text-2xl font-bold font-mono text-foreground">{s.value}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-mono">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Members list */}
      {data?.members && data.members.length > 0 && (
        <div className="rounded-lg border border-border bg-card">
          <div className="px-4 py-3 border-b border-border/60">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users size={14} className="text-primary" />
              Team
            </h2>
          </div>
          <ul className="divide-y divide-border/40">
            {data.members.map((m) => (
              <li key={m.id} className="px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-mono font-bold text-foreground shrink-0">
                  {m.user.name?.charAt(0).toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{m.user.name ?? m.user.githubLogin ?? "Unknown"}</div>
                  {m.user.githubLogin && (
                    <div className="text-[11px] font-mono text-muted-foreground/70">@{m.user.githubLogin}</div>
                  )}
                </div>
                <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wide ${
                  m.role === "OWNER"
                    ? "text-primary border-primary/30 bg-primary/10"
                    : "text-muted-foreground border-border bg-muted"
                }`}>
                  {m.role}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { href: `/org/${ctx.orgSlug}/chat`, label: "Open Chat", icon: Activity },
          { href: `/org/${ctx.orgSlug}/members`, label: "Manage Members", icon: Users },
          { href: `/org/${ctx.orgSlug}/repos`, label: "View Repos", icon: GitFork },
          { href: `/org/${ctx.orgSlug}/reports`, label: "Reports", icon: ClipboardList },
        ].map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-colors"
          >
            <link.icon size={14} className="text-primary shrink-0" />
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}
