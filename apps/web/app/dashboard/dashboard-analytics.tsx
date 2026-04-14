"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertCircle,
  AlertTriangle,
  Bug,
  CircleDashed,
  GitBranch,
  GitPullRequest,
  Loader2,
  TerminalSquare,
} from "lucide-react";
import { OpenPullRequests } from "./open-pull-requests";
import { OpenIssues } from "./open-issues";
import { GithubContributions } from "./github-contributions";
import { ActiveWorkflowsWidget } from "./active-workflows-widget";

interface AnalyticsData {
  daily: { date: string; count: number }[];
  total: number;
  avgPerDay: number;
  today: number;
  failed: number;
}

interface PullRequest { repoFullName: string; number: number }
interface IssueItem { repoFullName: string; number: number }

function pad2(n: number) {
  return n < 10 && n >= 0 ? `0${n}` : String(n);
}

export function DashboardAnalytics({ userName }: { userName: string }) {
  const { data: analytics, isLoading: loadingAnalytics } = useQuery<AnalyticsData>({
    queryKey: ["reports-analytics"],
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/reports/analytics");
      return data.data;
    },
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

  const { data: prs } = useQuery<PullRequest[]>({
    queryKey: ["open-pull-requests"],
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/repos/pull-requests");
      return data.data ?? [];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

  const { data: issues } = useQuery<IssueItem[]>({
    queryKey: ["open-issues"],
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/repos/issues");
      return data.data ?? [];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

  const { data: contrib } = useQuery<{ total: number; login: string | null; weeks: unknown[] }>({
    queryKey: ["github-contributions"],
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/github/contributions");
      return data.data;
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60_000,
  });

  if (loadingAnalytics || !analytics) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasData = analytics.total > 0;
  const openPrs = prs?.length ?? 0;
  const openIssues = issues?.length ?? 0;

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {/* Terminal status bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs font-mono text-muted-foreground border-b border-border pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <TerminalSquare className="h-4 w-4 text-primary shrink-0" />
          <span className="truncate">~/glitchgrab/dashboard</span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-card rounded border border-border">
            <GitBranch className="h-3 w-3" /> main
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
          </span>
          <span>System Ops Normal</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-medium tracking-tight text-foreground">
          Good to see you, {userName}.
        </h1>
        <p className="text-sm font-mono text-muted-foreground leading-relaxed max-w-2xl">
          {openPrs > 0 && (
            <>
              You have <span className="text-primary">{openPrs} open PR{openPrs === 1 ? "" : "s"}</span> awaiting review
              {openIssues > 0 ? ", and " : "."}
            </>
          )}
          {openIssues > 0 && (
            <>
              <span className="text-yellow-400">{openIssues} open issue{openIssues === 1 ? "" : "s"}</span> to triage.
            </>
          )}
          {openPrs === 0 && openIssues === 0 && "Nothing pressing — enjoy the quiet."}
        </p>
      </div>

      {/* Stat grid + active workflows widget */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <section className="grid grid-cols-2 gap-3 lg:col-span-2">
          <StatCard
            label="PRs to review"
            value={openPrs}
            icon={<GitPullRequest className="h-4 w-4" />}
            pill={openPrs > 0 ? { text: "Action req", tone: "warn" } : { text: "Clear", tone: "muted" }}
          />
          <StatCard
            label="Open issues"
            value={openIssues}
            icon={<AlertCircle className="h-4 w-4" />}
            pill={openIssues > 0 ? { text: "Triage", tone: "primary" } : { text: "Clear", tone: "muted" }}
          />
          <StatCard
            label="New reports"
            value={analytics.today}
            icon={<Bug className="h-4 w-4" />}
            pill={{ text: `avg ${analytics.avgPerDay}/day`, tone: "muted" }}
          />
          <StatCard
            label="Failed retries"
            value={analytics.failed}
            icon={<AlertTriangle className="h-4 w-4" />}
            critical={analytics.failed > 0}
            pill={
              analytics.failed > 0
                ? { text: "Manual override", tone: "danger" }
                : { text: "None", tone: "muted" }
            }
            href={analytics.failed > 0 ? "/dashboard/reports" : undefined}
          />
        </section>

        <div className="lg:col-span-1">
          <ActiveWorkflowsWidget />
        </div>
      </div>

      {/* Two-column action lists */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
        <ListPanel
          icon={<GitPullRequest className="h-4 w-4 text-primary" />}
          title="Awaiting your review"
          meta="Filter: Assigned"
          footer={{ href: "#", label: "View all pending PRs" }}
        >
          <OpenPullRequests />
        </ListPanel>

        <ListPanel
          icon={<CircleDashed className="h-4 w-4 text-primary" />}
          title="Priority issues triage"
          meta="Sort: Severity"
          footer={{ href: "/dashboard/reports", label: "Open issue tracker" }}
        >
          <OpenIssues />
        </ListPanel>
      </div>

      {/* Yearly GitHub contributions heatmap */}
      <Card className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 z-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <CardContent className="relative z-10 p-6 space-y-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-sm font-medium text-foreground">
                GitHub contributions
                {contrib?.login && (
                  <span className="ml-2 text-muted-foreground font-mono text-xs">
                    @{contrib.login}
                  </span>
                )}
              </h2>
              <p className="text-xs font-mono text-muted-foreground mt-0.5">
                {contrib?.total?.toLocaleString() ?? "—"} contributions · last 12 months
                {hasData && (
                  <>
                    <span className="opacity-40"> · </span>
                    {analytics.total} Glitchgrab report{analytics.total === 1 ? "" : "s"}
                  </>
                )}
              </p>
            </div>
            <HeatmapLegend />
          </div>

          <GithubContributions />
        </CardContent>
      </Card>

      {/* Footer strip */}
      <div className="hidden md:flex items-center justify-between text-[11px] font-mono text-muted-foreground border-t border-border pt-4">
        <span>glitchgrab · {pad2(new Date().getHours())}:{pad2(new Date().getMinutes())} local</span>
        <Link href="/dashboard/chat" className="hover:text-primary transition-colors">
          ⌘ K to open chat
        </Link>
      </div>
    </div>
  );
}

type PillTone = "primary" | "warn" | "danger" | "muted";

function StatCard({
  label,
  value,
  icon,
  pill,
  critical,
  href,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  pill: { text: string; tone: PillTone };
  critical?: boolean;
  href?: string;
}) {
  const toneClasses: Record<PillTone, string> = {
    primary: "text-primary bg-primary/10 border-primary/20",
    warn: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    danger: "text-red-400 bg-red-400/10 border-red-400/20",
    muted: "text-muted-foreground bg-muted border-border",
  };

  const card = (
    <Card
      className={`relative overflow-hidden transition-colors ${
        critical
          ? "bg-red-500/5 border-red-500/30"
          : "hover:border-foreground/30"
      }`}
    >
      {critical && <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500/60" />}
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between mb-3">
          <span
            className={`text-[10px] font-mono uppercase tracking-[0.15em] ${
              critical ? "text-red-400" : "text-muted-foreground"
            }`}
          >
            {label}
          </span>
          <span className={critical ? "text-red-400/70" : "text-muted-foreground/60"}>
            {icon}
          </span>
        </div>
        <div className="flex items-baseline gap-3 flex-wrap">
          <span
            className={`text-3xl md:text-4xl font-mono tabular-nums font-medium ${
              critical ? "text-red-400" : "text-foreground"
            }`}
          >
            {value < 100 ? String(value).padStart(2, "0") : value}
          </span>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded border ${toneClasses[pill.tone]}`}
          >
            {pill.text}
          </span>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {card}
      </Link>
    );
  }
  return card;
}

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
  footer?: { href: string; label: string };
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
        <Link
          href={footer.href}
          className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors w-max"
        >
          {footer.label} →
        </Link>
      )}
    </div>
  );
}

function HeatmapLegend() {
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
      <span>Less</span>
      <span className="h-3 w-3 rounded-xs bg-muted border border-border" />
      <span className="h-3 w-3 rounded-xs bg-primary/25 border border-primary/30" />
      <span className="h-3 w-3 rounded-xs bg-primary/50 border border-primary/60" />
      <span className="h-3 w-3 rounded-xs bg-primary/75 border border-primary/80" />
      <span className="h-3 w-3 rounded-xs bg-primary border border-foreground/30" />
      <span>More</span>
    </div>
  );
}
