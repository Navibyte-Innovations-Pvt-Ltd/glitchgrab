"use client";

import { useState, useMemo, useCallback, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2,
  TrendingUp,
  Calendar,
  BarChart3,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DayBucket {
  date: string;
  count: number;
  issues: {
    number: number;
    title: string;
    url: string;
    repoFullName: string;
  }[];
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

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

function formatDateFull(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

// Memoized so it never re-renders when parent hoveredDay state changes.
// That's the only way to keep CSS :hover stable while parent re-renders.
const BarList = memo(function BarList({
  barData,
  maxCount,
  tickDates,
  onHover,
}: {
  barData: DayBucket[];
  maxCount: number;
  tickDates: string[];
  onHover: (bucket: DayBucket | null) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {/* mt-16 reserves space above tallest bar for CSS tooltip */}
      <div className="flex items-end gap-0.5 h-[120px] pb-1 w-full mt-16">
        {barData.map((bucket) => {
          const heightPct = maxCount > 0 ? (bucket.count / maxCount) * 100 : 0;
          return (
            <div
              key={bucket.date}
              className="group/bar relative flex-1 min-w-0 flex flex-col items-center justify-end h-full cursor-pointer"
              onMouseEnter={() => onHover(bucket)}
              onMouseLeave={() => onHover(null)}
            >
              {/* CSS-only tooltip: opacity transition, zero state, zero re-render */}
              <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 z-30 pointer-events-none whitespace-nowrap rounded-md bg-popover text-popover-foreground border border-border px-2.5 py-1.5 text-[11px] font-mono shadow-lg opacity-0 group-hover/bar:opacity-100 transition-opacity duration-100">
                <div className="font-semibold text-primary">
                  {bucket.count} closed
                </div>
                <div className="text-muted-foreground">
                  {formatDateFull(bucket.date)}
                </div>
                <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border" />
              </div>
              <div
                className={cn(
                  "w-full rounded-t-xs transition-colors group-hover/bar:bg-primary group-hover/bar:shadow-[0_0_8px_rgba(34,211,238,0.5)]",
                  bucket.count === 0
                    ? "bg-muted/50 border border-border/40"
                    : "bg-primary/60",
                )}
                style={{
                  height: `${Math.max(bucket.count > 0 ? 4 : 2, heightPct)}%`,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* X-axis labels — absolute so rotation doesn't get clipped by flex container */}
      <div className="flex gap-0.5 w-full h-9 overflow-visible">
        {barData.map((bucket) => {
          const showTick = tickDates.includes(bucket.date);
          return (
            <div key={bucket.date} className="relative flex-1 min-w-0">
              {showTick && (
                <span className="absolute left-0 top-0 text-[9px] font-mono text-muted-foreground whitespace-nowrap -rotate-45 origin-top-left bg-card border border-border px-1 py-0.5 rounded-sm leading-none">
                  {formatDate(bucket.date)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

function HoverOverlay({ hoveredDay }: { hoveredDay: DayBucket }) {
  const repoCounts = hoveredDay.issues.reduce<Record<string, number>>(
    (acc, issue) => {
      acc[issue.repoFullName] = (acc[issue.repoFullName] ?? 0) + 1;
      return acc;
    },
    {},
  );
  return (
    <div className="absolute left-3 top-3 z-20 pointer-events-none bg-card/95 backdrop-blur-sm border border-border rounded-md px-3 py-2 flex flex-col gap-1 shadow-md">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-3 w-3 text-green-400 shrink-0" />
        <span className="text-[11px] font-mono text-primary">
          {formatDateFull(hoveredDay.date)}
        </span>
        <span className="ml-2 text-[10px] font-mono text-muted-foreground">
          {hoveredDay.count} closed
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        {Object.entries(repoCounts).map(([repo, count]) => (
          <div key={repo} className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground/70 truncate max-w-[180px]">
              {repo.split("/")[1]}
            </span>
            <span className="text-[10px] font-mono text-primary/80 ml-auto shrink-0">
              {count}
            </span>
          </div>
        ))}
        {hoveredDay.count > hoveredDay.issues.length && (
          <span className="text-[9px] font-mono text-muted-foreground/50">
            +{hoveredDay.count - hoveredDay.issues.length} more
          </span>
        )}
      </div>
    </div>
  );
}

export function IssuesClosedAnalytics() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [hoveredDay, setHoveredDay] = useState<DayBucket | null>(null);

  // Stable callback — BarList memo only works if onHover ref is stable
  const handleHover = useCallback((bucket: DayBucket | null) => {
    setHoveredDay(bucket);
  }, []);

  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["issues-closed-analytics", days],
    queryFn: async () => {
      const { data } = await axios.get(
        `/api/v1/reports/analytics/issues-closed?days=${days}`,
      );
      return data.data;
    },
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: true,
  });

  const { barData, maxCount, tickDates } = useMemo(() => {
    if (!data?.daily.length)
      return { barData: [], maxCount: 1, tickDates: [] as string[] };
    const max = Math.max(1, ...data.daily.map((d) => d.count));
    const step = days === 7 ? 1 : days === 30 ? 5 : 15;
    const ticks: string[] = [];
    data.daily.forEach((d, i) => {
      if (i % step === 0) ticks.push(d.date);
    });
    return { barData: data.daily, maxCount: max, tickDates: ticks };
  }, [data, days]);

  const activeDays = data?.daily.filter((d) => d.count > 0).length ?? 0;

  return (
    <div className="flex flex-col gap-4 min-h-full">
      {/* Terminal header + range toggle */}
      <div className="flex items-center justify-between text-xs font-mono text-muted-foreground border-b border-border pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <BarChart3 className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="truncate">~/analytics/issues-closed</span>
        </div>
        <div className="flex items-center gap-1 bg-card rounded border border-border p-0.5">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              type="button"
              onClick={() => setDays(opt.days)}
              className={cn(
                "font-mono text-[11px] px-2 py-0.5 rounded transition-colors",
                days === opt.days
                  ? "bg-primary/20 text-primary border border-primary/40"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main: 2×2 stats left + chart right */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-3 lg:h-[284px]">
        {/* 2×2 stat grid */}
        <div className="grid grid-cols-2 grid-rows-2 gap-2 h-full">
          <StatCard
            label="Total closed"
            value={isLoading ? null : (data?.total ?? 0)}
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            sub={`last ${days}d`}
          />
          <StatCard
            label="Avg / day"
            value={isLoading ? null : (data?.avgPerDay ?? 0)}
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            sub="issues/day"
            decimal
          />
          <StatCard
            label="Best day"
            value={isLoading ? null : (data?.bestDay?.count ?? 0)}
            icon={<Zap className="h-3.5 w-3.5" />}
            sub={data?.bestDay ? formatDate(data.bestDay.date) : "—"}
          />
          <StatCard
            label="Active days"
            value={isLoading ? null : activeDays}
            icon={<Calendar className="h-3.5 w-3.5" />}
            sub={`of ${days} days`}
          />
        </div>

        {/* Bar chart */}
        <Card className="relative overflow-hidden py-0 rounded">
          <div
            aria-hidden
            className="absolute inset-0 z-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <CardContent className="relative z-10 px-4 pt-4 pb-1 space-y-1 overflow-visible">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Issues closed per day
              </h2>
              <span className="text-[11px] font-mono text-muted-foreground">
                Last {days} days
              </span>
            </div>

            {isLoading ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-end gap-0.5 h-[148px] pb-1 w-full mt-5">
                  {[
                    35, 55, 20, 70, 45, 60, 30, 80, 50, 40, 65, 25, 75, 45, 55,
                    30, 70, 40, 60, 35, 50, 25, 65, 45, 30, 70, 55, 40, 60, 35,
                  ]
                    .slice(0, days === 7 ? 7 : days === 30 ? 30 : 30)
                    .map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 min-w-0 bg-muted/50 animate-pulse rounded-t-xs"
                        style={{
                          height: `${h}%`,
                          animationDelay: `${(i % 8) * 60}ms`,
                        }}
                      />
                    ))}
                </div>
                <div className="flex gap-0.5 w-full h-9" />
              </div>
            ) : barData.length === 0 ? (
              <div className="text-xs font-mono text-muted-foreground text-center py-14 border border-dashed border-border rounded">
                No closed issues found. Connect a GitHub repo to get started.
              </div>
            ) : (
              <BarList
                barData={barData}
                maxCount={maxCount}
                tickDates={tickDates}
                onHover={handleHover}
              />
            )}
          </CardContent>

          {/* Hover overlay — compact, pointer-events-none so bars keep receiving hover events */}
          {hoveredDay && hoveredDay.count > 0 && (
            <HoverOverlay hoveredDay={hoveredDay} />
          )}
        </Card>
      </div>

      {/* Daily breakdown table */}
      {!isLoading && data && data.total > 0 && (
        <Card className="rounded flex-1 flex flex-col min-h-0">
          <CardContent className="p-0 flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
              <h3 className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Daily breakdown
              </h3>
              <span className="text-[10px] font-mono text-muted-foreground">
                {data.daily.filter((d) => d.count > 0).length} active days
              </span>
            </div>
            <div className="divide-y divide-border flex-1 overflow-y-auto min-h-0">
              {[...data.daily]
                .filter((d) => d.count > 0)
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((bucket) => (
                  <div
                    key={bucket.date}
                    className="flex items-center justify-between px-4 py-2 hover:bg-muted/40 transition-colors"
                  >
                    <span className="text-sm font-mono text-foreground">
                      {formatDateFull(bucket.date)}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-0.5">
                        {Array.from({ length: Math.min(5, bucket.count) }).map(
                          (_, i) => (
                            <div
                              key={i}
                              className="h-2 w-2 rounded-full bg-primary/70"
                            />
                          ),
                        )}
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
    <Card
      className={cn(
        "relative overflow-hidden transition-colors py-0 rounded hover:border-foreground/30 h-full",
        className,
      )}
    >
      <CardContent className="px-3 py-2.5 h-full flex flex-col justify-between">
        <div className="flex items-start justify-between mb-1">
          <span className="text-[9px] font-mono uppercase tracking-wide text-muted-foreground whitespace-nowrap truncate">
            {label}
          </span>
          <span className="text-muted-foreground/60 [&>svg]:h-3.5 [&>svg]:w-3.5">
            {icon}
          </span>
        </div>
        <div className="flex items-baseline gap-2 flex-wrap">
          {value === null ? (
            <div className="h-8 w-14 bg-muted/60 animate-pulse rounded" />
          ) : (
            <span className="text-2xl font-mono tabular-nums font-medium text-foreground">
              {decimal
                ? value.toFixed(1)
                : value < 100
                  ? String(value).padStart(2, "0")
                  : value}
            </span>
          )}
          {value === null ? (
            <div className="h-4 w-16 bg-muted/40 animate-pulse rounded" />
          ) : (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border text-primary bg-primary/10 border-primary/20">
              {sub}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
