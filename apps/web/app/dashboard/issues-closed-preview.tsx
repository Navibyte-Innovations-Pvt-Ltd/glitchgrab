"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DayBucket {
  date: string;
  count: number;
}

interface ClosedData {
  daily: DayBucket[];
  total: number;
  avgPerDay: number;
  bestDay: { date: string; count: number } | null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmt(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function IssuesClosedPreview() {
  const { data, isLoading } = useQuery<ClosedData>({
    queryKey: ["issues-closed-analytics", 14],
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/reports/analytics/issues-closed?days=14");
      return data.data;
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });

  const maxCount = data ? Math.max(1, ...data.daily.map((d) => d.count)) : 1;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          Issues closed
        </h2>
        <Link
          href="/dashboard/analytics"
          className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
        >
          Full report <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : !data || data.total === 0 ? (
        <p className="text-xs font-mono text-muted-foreground py-4 text-center">
          No issues closed in last 14 days
        </p>
      ) : (
        <>
          {/* Mini bar chart */}
          <div className="flex items-end gap-0.5 h-14 w-full">
            {data.daily.map((bucket) => {
              const heightPct = (bucket.count / maxCount) * 100;
              return (
                <div
                  key={bucket.date}
                  title={`${bucket.count} closed · ${fmt(bucket.date)}`}
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

          {/* Summary row */}
          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
            <span>
              <span className="text-foreground font-medium">{data.total}</span> closed · 14 days
            </span>
            <span>
              avg <span className="text-foreground">{data.avgPerDay}</span>/day
            </span>
          </div>
        </>
      )}
    </div>
  );
}
