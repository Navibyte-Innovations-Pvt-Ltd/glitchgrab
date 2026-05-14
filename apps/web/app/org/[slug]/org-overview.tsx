"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import Image from "next/image";
import { GitFork, Users, ClipboardList, Activity, Clock, Mail, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
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
              <MemberRow key={m.githubLogin} member={m} orgSlug={ctx.orgSlug} isOwner={ctx.role === "OWNER"} />
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

function MemberRow({
  member,
  orgSlug,
  isOwner,
}: {
  member: MergedMember;
  orgSlug: string;
  isOwner: boolean;
}) {
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");

  const { mutate: sendInvite, isPending, isSuccess } = useMutation({
    mutationFn: async () => {
      await axios.post(`/api/v1/orgs/${orgSlug}/members/invite`, {
        email: email.trim(),
        githubLogin: member.githubLogin,
      });
    },
    onSuccess: () => {
      toast.success(`Invite sent to ${email}`);
      setShowInvite(false);
      setEmail("");
    },
    onError: () => toast.error("Failed to send invite"),
  });

  return (
    <li className="px-4 py-3 space-y-2">
      <div className="flex items-center gap-3">
        {member.avatarUrl ? (
          <Image
            src={member.avatarUrl}
            alt={member.githubLogin}
            width={32}
            height={32}
            className={cn("rounded-full border border-border shrink-0", !member.joined && "opacity-50 grayscale")}
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-mono font-bold text-foreground shrink-0">
            {(member.name ?? member.githubLogin).charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className={cn("text-sm font-medium truncate", member.joined ? "text-foreground" : "text-muted-foreground")}>
            {member.name ?? member.githubLogin}
          </div>
          <div className="text-[11px] font-mono text-muted-foreground/70">@{member.githubLogin}</div>
        </div>

        {member.joined && member.role ? (
          <span className={cn(
            "font-mono text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wide shrink-0",
            member.role === "OWNER"
              ? "text-primary border-primary/30 bg-primary/10"
              : "text-muted-foreground border-border bg-muted"
          )}>
            {member.role}
          </span>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <span className="flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded border border-yellow-500/30 bg-yellow-500/10 text-yellow-500/80 uppercase tracking-wide">
              <Clock size={9} />
              Pending
            </span>
            {isOwner && !showInvite && (
              <button
                type="button"
                onClick={() => setShowInvite(true)}
                className="flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors uppercase tracking-wide"
              >
                <Mail size={9} />
                Invite
              </button>
            )}
          </div>
        )}
      </div>

      {/* Inline invite form */}
      {showInvite && (
        <div className="flex items-center gap-2 pl-10">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && email.trim() && sendInvite()}
            placeholder={`${member.githubLogin}@email.com`}
            autoFocus
            className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40"
          />
          <button
            type="button"
            onClick={() => sendInvite()}
            disabled={isPending || !email.trim() || isSuccess}
            className="flex items-center gap-1 px-2 py-1 rounded bg-primary text-background text-xs font-mono font-semibold disabled:opacity-60 hover:bg-primary/90 transition-colors"
          >
            {isPending ? <Loader2 size={10} className="animate-spin" /> : isSuccess ? <Check size={10} /> : <Mail size={10} />}
            Send
          </button>
          <button
            type="button"
            onClick={() => setShowInvite(false)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
          >
            ✕
          </button>
        </div>
      )}
    </li>
  );
}
