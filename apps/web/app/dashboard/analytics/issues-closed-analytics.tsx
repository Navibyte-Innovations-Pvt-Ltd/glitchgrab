"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2,
  TrendingUp,
  Calendar,
  Loader2,
  ExternalLink,
  BarChart3,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DayBucket {
  date: string;
  count: number;
  issues: { number: number; title: string; url: string; repoFullName: string }[];
}

interface AnalyticsData {
  daily: DayBucket[];
  total: number;
  avgPerDay: number;
  bestDay: { date: string; count: number } | null;
}

const RANGE_OPTIONS = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
] as const;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

function formatDateFull(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function IssuesClosedAnalytics() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [hoveredDay, setHoveredDay] = useState<DayBucket | null>(null);

  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["issues-closed-analytics", days],
    queryFn: async () => {
      const { data } = await axios.get(`/api/v1/reports/analytics/issues-closed?days=${days}`);
      return data.data;
    },
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: true,
  });

  const { barData, maxCount, tickDates } = useMemo(() => {
    if (!data?.daily.length) return { barData: [], maxCount: 1, tickDates: [] as string[] };
    const max = Math.max(1, ...data.daily.map((d) => d.count));

    const step = days === 7 ? 1 : days === 30 ? 5 : 15;
    const ticks: string[] = [];
    data.daily.forEach((d, i) => {
      if (i % step === 0) ticks.push(d.date);
    });

    return { barData: data.daily, maxCount: max, tickDates: ticks };
  }, [data, days]);

  const displayed = hoveredDay ?? null;

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {/* Terminal header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs font-mono text-muted-foreground border-b border-border pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <BarChart3 className="h-4 w-4 text-primary shrink-0" />
          <span className="truncate">~/glitchgrab/analytics/issues-closed</span>
        </div>
        <div className="flex items-center gap-1.5 bg-card rounded border border-border p-0.5">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              type="button"
              onClick={() => setDays(opt.days)}
              className={cn(
                "font-mono text-[11px] px-2.5 py-1 rounded transition-colors",
                days === opt.days
                  ? "bg-primary/20 text-primary border border-primary/40"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Page heading */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-medium tracking-tight text-foreground">
          Issue Closure Analytics
        </h1>
        <p className="text-sm font-mono text-muted-foreground">
          Day-wise GitHub issues closed across all connected repos
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard
          label="Total closed"
          value={isLoading ? null : (data?.total ?? 0)}
          icon={<CheckCircle2 className="h-4 w-4" />}
          sub={`last ${days} days`}
        />
        <StatCard
          label="Avg / day"
          value={isLoading ? null : (data?.avgPerDay ?? 0)}
          icon={<TrendingUp className="h-4 w-4" />}
          sub="issues closed"
          decimal
        />
        <StatCard
          label="Best day"
          value={isLoading ? null : (data?.bestDay?.count ?? 0)}
          icon={<Zap className="h-4 w-4" />}
          sub={data?.bestDay ? formatDate(data.bestDay.date) : "—"}
          className="col-span-2 md:col-span-1"
        />
      </div>

      {/* Bar chart */}
      <Card className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 z-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <CardContent className="relative z-10 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Issues closed per day
            </h2>
            <span className="text-[11px] font-mono text-muted-foreground">
              {days === 7 ? "Last 7 days" : days === 30 ? "Last 30 days" : "Last 90 days"}
            </span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : barData.length === 0 ? (
            <div className="text-xs font-mono text-muted-foreground text-center py-14 border border-dashed border-border rounded">
              No closed issues found. Connect a GitHub repo to get started.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {/* Chart area — overflow-visible so tooltips don't get clipped */}
              <div className="overflow-x-auto">
                <div className="flex items-end gap-0.5 h-40 pb-1 min-w-full">
                  {barData.map((bucket) => {
                    const heightPct = maxCount > 0 ? (bucket.count / maxCount) * 100 : 0;
                    return (
                      <div
                        key={bucket.date}
                        className="group/bar relative flex-1 min-w-1.5 flex flex-col items-center justify-end h-full cursor-pointer"
                        onMouseEnter={() => setHoveredDay(bucket)}
                        onMouseLeave={() => setHoveredDay(null)}
                      >
                        {/* CSS-only tooltip — no state, no re-render, no flicker */}
                        <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 z-30 pointer-events-none whitespace-nowrap rounded-md bg-popover text-popover-foreground border border-border px-2.5 py-1.5 text-[11px] font-mono shadow-lg opacity-0 group-hover/bar:opacity-100 transition-opacity duration-100">
                          <div className="font-semibold text-primary">{bucket.count} closed</div>
                          <div className="text-muted-foreground">{formatDateFull(bucket.date)}</div>
                          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border" />
                        </div>
                        <div
                          className={cn(
                            "w-full rounded-t-xs transition-colors group-hover/bar:bg-primary group-hover/bar:shadow-[0_0_8px_rgba(34,211,238,0.5)]",
                            bucket.count === 0
                              ? "bg-muted/50 border border-border/40"
                              : "bg-primary/60"
                          )}
                          style={{ height: `${Math.max(bucket.count > 0 ? 4 : 2, heightPct)}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* X-axis labels */}
              <div className="flex items-end gap-0.5 overflow-x-auto">
                {barData.map((bucket) => {
                  const showTick = tickDates.includes(bucket.date);
                  return (
                    <div key={bucket.date} className="flex-1 min-w-1.5 flex justify-center">
                      {showTick && (
                        <span className="text-[9px] font-mono text-muted-foreground/70 whitespace-nowrap -rotate-45 origin-top-left ml-1">
                          {formatDate(bucket.date)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hovered day issue list */}
      {displayed && displayed.issues.length > 0 && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="text-sm font-medium text-foreground">
              Closed on{" "}
              <span className="text-primary font-mono">{formatDateFull(displayed.date)}</span>
              <span className="ml-2 text-muted-foreground font-mono text-xs">
                {displayed.count} issue{displayed.count === 1 ? "" : "s"}
              </span>
            </h3>
            <ul className="space-y-1.5">
              {displayed.issues.map((issue) => (
                <li key={`${issue.repoFullName}-${issue.number}`}>
                  <Link
                    href={issue.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 group text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-400" />
                    <span className="font-mono text-[11px] text-muted-foreground/60 shrink-0">
                      #{issue.number}
                    </span>
                    <span className="truncate flex-1">{issue.title}</span>
                    <span className="text-[10px] font-mono text-muted-foreground/50 shrink-0">
                      {issue.repoFullName}
                    </span>
                    <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
              {displayed.count > displayed.issues.length && (
                <li className="text-[11px] font-mono text-muted-foreground/60 pl-5">
                  +{displayed.count - displayed.issues.length} more issues
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Daily breakdown table */}
      {!isLoading && data && data.total > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <h3 className="text-sm font-medium text-foreground">Daily breakdown</h3>
              <span className="text-[11px] font-mono text-muted-foreground">
                {data.daily.filter((d) => d.count > 0).length} active days
              </span>
            </div>
            <div className="divide-y divide-border max-h-72 overflow-y-auto">
              {[...data.daily]
                .filter((d) => d.count > 0)
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((bucket) => (
                  <div
                    key={bucket.date}
                    className="flex items-center justify-between px-5 py-2.5 hover:bg-muted/40 transition-colors"
                    onMouseEnter={() => setHoveredDay(bucket)}
                    onMouseLeave={() => setHoveredDay(null)}
                  >
                    <span className="text-sm font-mono text-foreground">
                      {formatDateFull(bucket.date)}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-0.5">
                        {Array.from({ length: Math.min(5, bucket.count) }).map((_, i) => (
                          <div key={i} className="h-2 w-2 rounded-full bg-primary/70" />
                        ))}
                        {bucket.count > 5 && (
                          <span className="text-[10px] font-mono text-muted-foreground ml-1">
                            +{bucket.count - 5}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-sm tabular-nums text-foreground w-8 text-right">
                        {bucket.count}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  sub,
  decimal,
  className,
}: {
  label: string;
  value: number | null;
  icon: React.ReactNode;
  sub: string;
  decimal?: boolean;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between mb-3">
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
            {label}
          </span>
          <span className="text-muted-foreground/60">{icon}</span>
        </div>
        <div className="flex items-baseline gap-2">
          {value === null ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <span className="text-3xl font-mono tabular-nums font-medium text-foreground">
              {decimal ? value.toFixed(1) : String(value).padStart(2, "0")}
            </span>
          )}
          <span className="text-[11px] font-mono text-muted-foreground">{sub}</span>
        </div>
      </CardContent>
    </Card>
  );
}
