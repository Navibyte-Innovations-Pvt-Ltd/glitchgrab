"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Image from "next/image";
import { GitFork, Users, ClipboardList, Activity, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrgContext } from "./lib/get-org-context";

interface MergedMember {
  githubLogin: string;
  avatarUrl: string;
  orgMemberId: string | null;
  name: string | null;
  email: string | null;
  role: string | null;
  joined: boolean;
}

interface MembersData {
  members: MergedMember[];
  total: number;
}

interface OrgData {
  repos: { id: string }[];
}

export function OrgOverview({ ctx }: { ctx: OrgContext }) {
  const { data: orgData } = useQuery<OrgData>({
    queryKey: ["org", ctx.orgSlug],
    queryFn: async () => {
      const { data } = await axios.get(`/api/v1/orgs/${ctx.orgSlug}`);
      return data.data;
    },
    staleTime: 30_000,
  });

  const { data: membersData } = useQuery<MembersData>({
    queryKey: ["org-members", ctx.orgSlug],
    queryFn: async () => {
      const { data } = await axios.get(`/api/v1/orgs/${ctx.orgSlug}/members`);
      return data.data;
    },
    staleTime: 30_000,
  });

  const stats = [
    { label: "Repos", value: orgData?.repos.length ?? ctx.repos.length, icon: GitFork },
    { label: "Members", value: membersData?.total ?? "—", icon: Users },
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

      {/* Members list — all GitHub org members */}
      {membersData && membersData.members.length > 0 && (
        <div className="rounded-lg border border-border bg-card">
          <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users size={14} className="text-primary" />
              Team
            </h2>
            <span className="text-[11px] font-mono text-muted-foreground">
              {membersData.members.filter((m) => m.joined).length}/{membersData.total} joined
            </span>
          </div>
          <ul className="divide-y divide-border/40">
            {membersData.members.map((m) => (
              <li key={m.githubLogin} className="px-4 py-3 flex items-center gap-3">
                {m.avatarUrl ? (
                  <Image
                    src={m.avatarUrl}
                    alt={m.githubLogin}
                    width={32}
                    height={32}
                    className={cn("rounded-full border border-border shrink-0", !m.joined && "opacity-50 grayscale")}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-mono font-bold text-foreground shrink-0">
                    {(m.name ?? m.githubLogin).charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className={cn("text-sm font-medium truncate", m.joined ? "text-foreground" : "text-muted-foreground")}>
                    {m.name ?? m.githubLogin}
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground/70">@{m.githubLogin}</div>
                </div>
                {m.joined && m.role ? (
                  <span className={cn(
                    "font-mono text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wide shrink-0",
                    m.role === "OWNER"
                      ? "text-primary border-primary/30 bg-primary/10"
                      : "text-muted-foreground border-border bg-muted"
                  )}>
                    {m.role}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded border border-yellow-500/30 bg-yellow-500/10 text-yellow-500/80 uppercase tracking-wide shrink-0">
                    <Clock size={9} />
                    Pending
                  </span>
                )}
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
