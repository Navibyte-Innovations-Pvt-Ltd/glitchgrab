"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  GitPullRequest,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { OpenPullRequests } from "./open-pull-requests";
import { OpenIssues } from "./open-issues";
import { ReportsHeatmap } from "./reports-heatmap";

interface AnalyticsData {
  daily: { date: string; count: number }[];
  total: number;
  avgPerDay: number;
  today: number;
  failed: number;
}

interface PullRequest { repoFullName: string; number: number }
interface IssueItem { repoFullName: string; number: number }

export function DashboardAnalytics({ userName }: { userName: string }) {
  const { data: analytics, isLoading: loadingAnalytics } = useQuery<AnalyticsData>({
    queryKey: ["reports-analytics"],
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/reports/analytics");
      return data.data;
    },
  });

  const { data: prs } = useQuery<PullRequest[]>({
    queryKey: ["open-pull-requests"],
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/repos/pull-requests");
      return data.data ?? [];
    },
    staleTime: 60_000,
  });

  const { data: issues } = useQuery<IssueItem[]>({
    queryKey: ["open-issues"],
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/repos/issues");
      return data.data ?? [];
    },
    staleTime: 60_000,
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
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {userName}</h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what needs your attention today.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ActionCard
          icon={<GitPullRequest className="h-4 w-4" />}
          label="Open PRs"
          value={openPrs}
          hint={openPrs > 0 ? "Review pending" : "All caught up"}
          tone={openPrs > 0 ? "primary" : "muted"}
        />
        <ActionCard
          icon={<AlertCircle className="h-4 w-4" />}
          label="Open issues"
          value={openIssues}
          hint={openIssues > 0 ? "Need a fix" : "Nothing open"}
          tone={openIssues > 0 ? "primary" : "muted"}
        />
        <ActionCard
          icon={<CalendarDays className="h-4 w-4" />}
          label="New today"
          value={analytics.today}
          hint={`avg ${analytics.avgPerDay}/day`}
          tone="muted"
        />
        <ActionCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Failed reports"
          value={analytics.failed}
          hint={analytics.failed > 0 ? "Retry needed" : "None"}
          tone={analytics.failed > 0 ? "warn" : "muted"}
          href={analytics.failed > 0 ? "/dashboard/reports" : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
        <OpenPullRequests />
        <OpenIssues />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {analytics.total} report{analytics.total === 1 ? "" : "s"} in the last year
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasData ? (
            <ReportsHeatmap daily={analytics.daily} />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">No reports yet</p>
                <p className="text-xs text-muted-foreground">
                  Start a conversation to create your first issue.
                </p>
              </div>
              <Link href="/dashboard/chat">
                <Button size="sm">Open Chat</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type Tone = "primary" | "warn" | "muted";

function ActionCard({
  icon,
  label,
  value,
  hint,
  tone,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint: string;
  tone: Tone;
  href?: string;
}) {
  const toneClass =
    tone === "primary"
      ? "text-primary"
      : tone === "warn"
      ? "text-yellow-400"
      : "text-muted-foreground";

  const content = (
    <Card className={href ? "transition hover:border-foreground/30" : undefined}>
      <CardContent className="p-4">
        <div className={`flex items-center gap-2 text-xs mb-1 ${toneClass}`}>
          {icon}
          <span>{label}</span>
        </div>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{hint}</p>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
