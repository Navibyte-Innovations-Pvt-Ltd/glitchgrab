"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import {
  GitFork,
  Users,
  Clock,
  Mail,
  Loader2,
  Check,
  AlertCircle,
  AlertTriangle,
  Bug,
  TrendingUp,
  CheckCircle2,
  Circle,
  Folder,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { ActiveWorkflowsWidget } from "@/app/dashboard/active-workflows-widget";
import { GithubContributions } from "@/app/dashboard/github-contributions";
import type { OrgContext } from "./lib/get-org-context";

// ─── Types ──────────────────────────────────────────────────────────────────

interface MergedMember {
  githubLogin: string;
  avatarUrl: string;
  name: string | null;
  email: string | null;
  role: string | null;
  joined: boolean;
}

interface MembersData {
  members: MergedMember[];
  total: number;
}

interface TodayActivity {
  [githubLogin: string]: { commits: number; repos: string[] };
}

interface OrgStats {
  total: number;
  avgPerDay: number;
  today: number;
  failed: number;
}

interface IssueItem {
  number: number;
  title: string;
  url: string;
  createdAt: string;
  author: string;
  comments: number;
  labels: { name: string; color: string }[];
  repoFullName: string;
}

interface DayBucket {
  date: string;
  count: number;
}

interface ClosedData {
  daily: DayBucket[];
  total: number;
  avgPerDay: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < 60 * 60 * 1000) return `${Math.max(1, Math.round(diff / 60000))}m`;
  if (diff < day) return `${Math.round(diff / (60 * 60 * 1000))}h`;
  if (diff < 30 * day) return `${Math.round(diff / day)}d`;
  return new Date(iso).toLocaleDateString();
}

function isHighPriority(labels: { name: string }[]) {
  return labels.some((l) => /p0|p1|critical|urgent|security/i.test(l.name));
}

function repoShortName(fullName: string) {
  return fullName.split("/")[1] ?? fullName;
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

type PillTone = "primary" | "warn" | "danger" | "muted";

function StatCard({
  label,
  value,
  icon,
  pill,
  critical,
  href,
  decimal,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  pill: { text: string; tone: PillTone };
  critical?: boolean;
  href?: string;
  decimal?: boolean;
}) {
  const toneClasses: Record<PillTone, string> = {
    primary: "text-primary bg-primary/10 border-primary/20",
    warn: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    danger: "text-red-400 bg-red-400/10 border-red-400/20",
    muted: "text-muted-foreground bg-muted border-border",
  };

  const card = (
    <Card className={cn("relative overflow-hidden transition-colors py-0 rounded-md", critical ? "bg-red-500/5 border-red-500/30" : "hover:border-foreground/30")}>
      {critical && <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500/60" />}
      <CardContent className="px-3 py-2.5">
        <div className="flex items-start justify-between mb-1">
          <span className={cn("text-[10px] font-mono uppercase tracking-[0.15em]", critical ? "text-red-400" : "text-muted-foreground")}>
            {label}
          </span>
          <span className={cn(critical ? "text-red-400/70" : "text-muted-foreground/60", "[&>svg]:h-3.5 [&>svg]:w-3.5")}>
            {icon}
          </span>
        </div>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={cn("text-2xl font-mono tabular-nums font-medium", critical ? "text-red-400" : "text-foreground")}>
            {typeof value === "number"
              ? decimal
                ? value.toFixed(1)
                : value < 100
                  ? String(value).padStart(2, "0")
                  : value
              : value}
          </span>
          <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded border", toneClasses[pill.tone])}>
            {pill.text}
          </span>
        </div>
      </CardContent>
    </Card>
  );

  if (href) return <Link href={href} className="block">{card}</Link>;
  return card;
}

// ─── List Panel ───────────────────────────────────────────────────────────────

function ListPanel({
  icon,
  title,
  meta,
  footer,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  meta?: string;
  footer?: { href: string; label: string; external?: boolean };
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
          {icon}
          {title}
        </h2>
        {meta && <span className="text-xs font-mono text-muted-foreground">{meta}</span>}
      </div>
      <div>{children}</div>
      {footer && (
        footer.external ? (
          <a
            href={footer.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto text-xs font-mono text-muted-foreground hover:text-primary transition-colors w-max"
          >
            {footer.label} →
          </a>
        ) : (
          <Link href={footer.href} className="mt-auto text-xs font-mono text-muted-foreground hover:text-primary transition-colors w-max">
            {footer.label} →
          </Link>
        )
      )}
    </div>
  );
}

// ─── Issues Triage ───────────────────────────────────────────────────────────

function OrgIssuesTriage({ orgSlug }: { orgSlug: string }) {
  const { data, isLoading } = useQuery<IssueItem[]>({
    queryKey: ["org-issues", orgSlug],
    queryFn: async () => {
      const { data } = await axios.get(`/api/v1/orgs/${orgSlug}/issues`);
      return data.data ?? [];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center gap-3 border border-dashed border-border rounded-md px-4 py-4">
        <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
        <p className="text-xs font-mono text-muted-foreground">No open issues — all clear.</p>
      </div>
    );
  }

  const grouped = data.reduce<Record<string, IssueItem[]>>((acc, issue) => {
    (acc[issue.repoFullName] ??= []).push(issue);
    return acc;
  }, {});

  const sortedRepos = Object.entries(grouped).sort(([, a], [, b]) => b.length - a.length);

  const topRepos = sortedRepos.slice(0, 5);

  return (
    <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
      {/* Repo chips — top 5 only */}
      <div className="flex flex-wrap gap-1.5">
        {topRepos.map(([repo, items]) => {
          const hasCritical = items.some((i) => isHighPriority(i.labels));
          return (
            <a
              key={repo}
              href={`https://github.com/${repo}/issues`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border transition-colors",
                hasCritical
                  ? "bg-red-500/10 border-red-500/30 text-red-400 hover:border-red-500/60"
                  : "bg-card/60 border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
              )}
            >
              <Folder className="h-2.5 w-2.5 shrink-0" />
              <span>{repoShortName(repo)}</span>
              <span className={cn("font-bold px-0.5", hasCritical ? "text-red-300" : "text-foreground")}>
                {items.length}
              </span>
            </a>
          );
        })}
        {sortedRepos.length > 5 && (
          <span className="text-[10px] font-mono text-muted-foreground/60 self-center">
            +{sortedRepos.length - 5} more
          </span>
        )}
      </div>

      {/* Issue list — 2 per repo, compact rows */}
      <div className="flex flex-col gap-3">
        {topRepos.map(([repo, items]) => (
          <div key={repo} className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest">
              <Folder className="h-2.5 w-2.5" />
              <span>{repoShortName(repo)}</span>
              <span className="text-primary/60 ml-auto">{items.length}</span>
            </div>
            <ul className="flex flex-col gap-1">
              {items.slice(0, 2).map((issue) => {
                const critical = isHighPriority(issue.labels);
                return (
                  <li key={`${repo}-${issue.number}`}>
                    <a
                      href={issue.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "group flex items-center gap-2 rounded px-2 py-1.5 transition-colors border text-xs",
                        critical
                          ? "bg-red-500/5 border-red-500/15 hover:border-red-500/40"
                          : "bg-card/30 border-border/60 hover:border-primary/40 hover:bg-card/60"
                      )}
                    >
                      {critical ? (
                        <AlertCircle className="h-3 w-3 text-red-400 shrink-0" />
                      ) : (
                        <Circle className="h-3 w-3 text-primary/50 shrink-0" />
                      )}
                      <span className="flex-1 truncate text-foreground/90 group-hover:text-foreground transition-colors">
                        {issue.title}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground/50 shrink-0">
                        #{issue.number} · {timeAgo(issue.createdAt)}
                      </span>
                      {issue.comments > 0 && (
                        <span className="font-mono text-[10px] text-muted-foreground/50 shrink-0 flex items-center gap-0.5">
                          <MessageCircle className="h-2.5 w-2.5" />{issue.comments}
                        </span>
                      )}
                    </a>
                  </li>
                );
              })}
              {items.length > 2 && (
                <li>
                  <a
                    href={`https://github.com/${repo}/issues`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-mono text-muted-foreground/50 hover:text-primary transition-colors pl-1"
                  >
                    +{items.length - 2} more →
                  </a>
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Issues Closed Preview ────────────────────────────────────────────────────

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtClosedDate(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

function OrgIssuesClosedPreview({ orgSlug }: { orgSlug: string }) {
  const { data, isLoading } = useQuery<ClosedData>({
    queryKey: ["org-issues-closed", orgSlug, 14],
    queryFn: async () => {
      const { data } = await axios.get(`/api/v1/orgs/${orgSlug}/issues-closed?days=14`);
      return data.data;
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });

  const maxCount = data ? Math.max(1, ...data.daily.map((d) => d.count)) : 1;
  const topDays = data
    ? [...data.daily].sort((a, b) => b.count - a.count).filter((d) => d.count > 0).slice(0, 4)
    : [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          Issues closed
        </h2>
        <a
          href={`https://github.com/orgs/${orgSlug}/repositories`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
        >
          GitHub <ArrowRight className="h-3 w-3" />
        </a>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : !data || data.total === 0 ? (
        <p className="text-xs font-mono text-muted-foreground py-4 text-center">
          No issues closed in last 14 days
        </p>
      ) : (
        <>
          <div className="flex items-end gap-0.5 h-28 w-full">
            {data.daily.map((bucket) => {
              const heightPct = (bucket.count / maxCount) * 100;
              return (
                <div
                  key={bucket.date}
                  title={`${bucket.count} closed · ${fmtClosedDate(bucket.date)}`}
                  className={cn(
                    "group/mini relative flex-1 min-w-0 rounded-t-xs transition-colors cursor-default",
                    bucket.count === 0
                      ? "bg-muted/40 border border-border/30"
                      : "bg-primary/50 hover:bg-primary"
                  )}
                  style={{ height: `${Math.max(bucket.count > 0 ? 8 : 3, heightPct)}%` }}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground border-b border-border/40 pb-2">
            <span>
              <span className="text-foreground font-medium">{data.total}</span> closed · 14 days
            </span>
            <span>
              avg <span className="text-foreground">{data.avgPerDay}</span>/day
            </span>
          </div>

          {topDays.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                Top days
              </div>
              <ul className="flex flex-col gap-1.5">
                {topDays.map((d) => (
                  <li key={d.date} className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-muted-foreground w-14 shrink-0">{fmtClosedDate(d.date)}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/60"
                        style={{ width: `${(d.count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono text-foreground tabular-nums w-5 text-right shrink-0">{d.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      <a
        href={`/dashboard/analytics`}
        className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors w-max mt-auto"
      >
        Full analytics →
      </a>
    </div>
  );
}

// ─── Team Panel ───────────────────────────────────────────────────────────────

function TeamPanel({ orgSlug, isOwner }: { orgSlug: string; isOwner: boolean }) {
  const { data: membersData } = useQuery<MembersData>({
    queryKey: ["org-members", orgSlug],
    queryFn: async () => {
      const { data } = await axios.get(`/api/v1/orgs/${orgSlug}/members`);
      return data.data;
    },
    staleTime: 30_000,
  });

  const { data: todayActivity } = useQuery<TodayActivity>({
    queryKey: ["org-today-activity", orgSlug],
    queryFn: async () => {
      const { data } = await axios.get(`/api/v1/orgs/${orgSlug}/today-activity`);
      return data.data as TodayActivity;
    },
    staleTime: 2 * 60_000,
    refetchInterval: 5 * 60_000,
  });

  if (!membersData) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const joined = membersData.members.filter((m) => m.joined);
  const pending = membersData.members.filter((m) => !m.joined);

  return (
    <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
      {joined.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest pb-1 border-b border-border/50">
            {joined.length} active
          </div>
          <ul className="flex flex-col gap-1.5">
            {joined.map((m) => {
              const activity = todayActivity?.[m.githubLogin];
              return (
                <li key={m.githubLogin} className="flex items-center gap-2.5 px-1 py-1.5 rounded-md hover:bg-card/60 transition-colors">
                  {m.avatarUrl ? (
                    <Image src={m.avatarUrl} alt={m.githubLogin} width={28} height={28} className="rounded-full border border-border shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-mono font-bold shrink-0">
                      {(m.name ?? m.githubLogin).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{m.name ?? m.githubLogin}</div>
                    {activity ? (
                      <div className="text-[10px] font-mono text-primary/70 truncate">
                        ↑ {activity.commits} commit{activity.commits !== 1 ? "s" : ""} today · {activity.repos.slice(0, 2).join(", ")}{activity.repos.length > 2 ? ` +${activity.repos.length - 2}` : ""}
                      </div>
                    ) : (
                      <div className="text-[11px] font-mono text-muted-foreground/70">@{m.githubLogin}</div>
                    )}
                  </div>
                  {m.role && (
                    <span className={cn(
                      "font-mono text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wide shrink-0",
                      m.role === "OWNER"
                        ? "text-primary border-primary/30 bg-primary/10"
                        : "text-muted-foreground border-border bg-muted"
                    )}>
                      {m.role}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {pending.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest pb-1 border-b border-border/50">
            {pending.length} not yet joined
          </div>
          <ul className="flex flex-col gap-1.5">
            {pending.slice(0, 4).map((m) => (
              <PendingMemberRow key={m.githubLogin} member={m} orgSlug={orgSlug} isOwner={isOwner} />
            ))}
            {pending.length > 4 && (
              <li>
                <Link
                  href={`/org/${orgSlug}/members`}
                  className="text-[11px] font-mono text-muted-foreground hover:text-primary transition-colors pl-1"
                >
                  +{pending.length - 4} more →
                </Link>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function PendingMemberRow({ member, orgSlug, isOwner }: { member: MergedMember; orgSlug: string; isOwner: boolean }) {
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
    <li className="space-y-1.5">
      <div className="flex items-center gap-2.5 px-1 py-1.5 rounded-md">
        {member.avatarUrl ? (
          <Image src={member.avatarUrl} alt={member.githubLogin} width={28} height={28} className="rounded-full border border-border shrink-0 opacity-50 grayscale" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-mono font-bold shrink-0 opacity-50">
            {member.githubLogin.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-muted-foreground truncate">@{member.githubLogin}</div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
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
      </div>
      {showInvite && (
        <div className="flex items-center gap-2 pl-9">
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
          <button type="button" onClick={() => setShowInvite(false)} className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1">
            ✕
          </button>
        </div>
      )}
    </li>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OrgOverview({ ctx }: { ctx: OrgContext }) {
  const { data: stats } = useQuery<OrgStats>({
    queryKey: ["org-stats", ctx.orgSlug],
    queryFn: async () => {
      const { data } = await axios.get(`/api/v1/orgs/${ctx.orgSlug}/stats`);
      return data.data;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

  const { data: issues } = useQuery<IssueItem[]>({
    queryKey: ["org-issues", ctx.orgSlug],
    queryFn: async () => {
      const { data } = await axios.get(`/api/v1/orgs/${ctx.orgSlug}/issues`);
      return data.data ?? [];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

  const { data: membersData } = useQuery<MembersData>({
    queryKey: ["org-members", ctx.orgSlug],
    queryFn: async () => {
      const { data } = await axios.get(`/api/v1/orgs/${ctx.orgSlug}/members`);
      return data.data;
    },
    staleTime: 30_000,
  });

  const { data: closedData } = useQuery<ClosedData>({
    queryKey: ["org-issues-closed", ctx.orgSlug, 14],
    queryFn: async () => {
      const { data } = await axios.get(`/api/v1/orgs/${ctx.orgSlug}/issues-closed?days=14`);
      return data.data;
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });

  const { data: contribData } = useQuery<{ total: number; orgSlug: string }>({
    queryKey: ["org-contributions", ctx.orgSlug],
    queryFn: async () => {
      const { data } = await axios.get(`/api/v1/orgs/${ctx.orgSlug}/contributions`);
      return data.data;
    },
    staleTime: 10 * 60_000,
  });

  const repoCount = ctx.repos.length;
  const memberCount = membersData?.total ?? "—";
  const openIssues = issues?.length ?? 0;

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {/* Stats grid + active workflows */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-4 items-stretch">
        <section className="grid grid-cols-2 md:grid-cols-3 gap-2.5 lg:col-span-2 auto-rows-min">
          <StatCard
            label="Repos"
            value={repoCount}
            icon={<GitFork className="h-4 w-4" />}
            pill={{ text: "Connected", tone: "muted" }}
            href={`/org/${ctx.orgSlug}/repos`}
          />
          <StatCard
            label="Members"
            value={typeof memberCount === "number" ? memberCount : 0}
            icon={<Users className="h-4 w-4" />}
            pill={{ text: `${membersData?.members.filter((m) => m.joined).length ?? 0} joined`, tone: "primary" }}
            href={`/org/${ctx.orgSlug}/members`}
          />
          <StatCard
            label="Open issues"
            value={openIssues}
            icon={<AlertCircle className="h-4 w-4" />}
            pill={openIssues > 0 ? { text: "Triage", tone: "primary" } : { text: "Clear", tone: "muted" }}
          />
          <StatCard
            label="New reports today"
            value={stats?.today ?? 0}
            icon={<Bug className="h-4 w-4" />}
            pill={{ text: `avg ${stats?.avgPerDay ?? 0}/day`, tone: "muted" }}
            href={`/org/${ctx.orgSlug}/reports`}
          />
          <StatCard
            label="Failed retries"
            value={stats?.failed ?? 0}
            icon={<AlertTriangle className="h-4 w-4" />}
            critical={(stats?.failed ?? 0) > 0}
            pill={
              (stats?.failed ?? 0) > 0
                ? { text: "Manual override", tone: "danger" }
                : { text: "None", tone: "muted" }
            }
            href={(stats?.failed ?? 0) > 0 ? `/org/${ctx.orgSlug}/reports` : undefined}
          />
          <StatCard
            label="Avg closed / day"
            value={closedData?.avgPerDay ?? 0}
            icon={<TrendingUp className="h-4 w-4" />}
            pill={{ text: "14-day avg", tone: "muted" }}
            decimal
          />
        </section>

        {/* Active workflows panel */}
        <Card className="lg:col-span-1 flex flex-col py-0 rounded-md">
          <CardContent className="px-3 py-2.5 flex-1 flex flex-col min-h-0">
            <ActiveWorkflowsWidget
              apiPath={`/api/v1/orgs/${ctx.orgSlug}/workflow-runs`}
              queryKey={["org-workflow-runs", ctx.orgSlug]}
            />
          </CardContent>
        </Card>
      </div>

      {/* Three-column action lists */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
        <ListPanel
          icon={<Users className="h-4 w-4 text-primary" />}
          title="Team"
          meta={`${membersData?.members.filter((m) => m.joined).length ?? 0}/${membersData?.total ?? 0} joined`}
          footer={{ href: `/org/${ctx.orgSlug}/members`, label: "Manage members" }}
        >
          <TeamPanel orgSlug={ctx.orgSlug} isOwner={ctx.role === "OWNER"} />
        </ListPanel>

        <ListPanel
          icon={<AlertCircle className="h-4 w-4 text-primary" />}
          title="Priority issues triage"
          meta="Sort: Severity"
          footer={{
            href: `https://github.com/orgs/${ctx.orgSlug}/repositories`,
            label: "Open on GitHub",
            external: true,
          }}
        >
          <OrgIssuesTriage orgSlug={ctx.orgSlug} />
        </ListPanel>

        <OrgIssuesClosedPreview orgSlug={ctx.orgSlug} />
      </div>

      {/* Org-wide contributions heatmap */}
      <Card className="relative overflow-hidden py-0 rounded-md">
        <div
          aria-hidden
          className="absolute inset-0 z-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <CardContent className="relative z-10 px-5 py-4 space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-sm font-medium text-foreground">
                {ctx.orgName} contributions
              </h2>
              <p className="text-xs font-mono text-muted-foreground mt-0.5">
                {contribData?.total?.toLocaleString() ?? "—"} combined commits · last 12 months · all repos
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
              <span>Less</span>
              <span className="h-3 w-3 rounded-xs bg-muted border border-border" />
              <span className="h-3 w-3 rounded-xs bg-primary/25 border border-primary/30" />
              <span className="h-3 w-3 rounded-xs bg-primary/50 border border-primary/60" />
              <span className="h-3 w-3 rounded-xs bg-primary/75 border border-primary/80" />
              <span className="h-3 w-3 rounded-xs bg-primary border border-foreground/30" />
              <span>More</span>
            </div>
          </div>
          <GithubContributions
            apiPath={`/api/v1/orgs/${ctx.orgSlug}/contributions`}
            queryKey={["org-contributions", ctx.orgSlug]}
            emptyMessage="No commit activity yet — GitHub stats may still be computing. Refresh in a moment."
          />
        </CardContent>
      </Card>

      {/* Footer strip */}
      <div className="hidden md:flex items-center justify-between text-[11px] font-mono text-muted-foreground border-t border-border pt-4">
        <span>{ctx.orgSlug} · {ctx.orgName}</span>
        <Link href={`/org/${ctx.orgSlug}/chat`} className="hover:text-primary transition-colors">
          ⌘ K to open chat
        </Link>
      </div>
    </div>
  );
}
