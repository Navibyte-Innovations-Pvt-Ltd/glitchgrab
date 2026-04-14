"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";

interface ContribDay {
  date: string;
  count: number;
}

interface ContribData {
  total: number;
  login: string | null;
  weeks: ContribDay[][];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function ordinal(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n}st`;
  if (mod10 === 2 && mod100 !== 12) return `${n}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${n}rd`;
  return `${n}th`;
}

function formatTooltipDate(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  return `${MONTHS[d.getUTCMonth()]} ${ordinal(d.getUTCDate())}`;
}

export function GithubContributions() {
  const { data, isLoading } = useQuery<ContribData>({
    queryKey: ["github-contributions"],
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/github/contributions");
      return data.data;
    },
    staleTime: 5 * 60_000,
  });

  const { weeks, max, monthMarkers } = useMemo(() => {
    if (!data?.weeks?.length) return { weeks: [], max: 0, monthMarkers: [] as { col: number; label: string }[] };
    const allCounts = data.weeks.flat().map((d) => d.count);
    const max = Math.max(1, ...allCounts);
    const markers: { col: number; label: string }[] = [];
    let seen = -1;
    data.weeks.forEach((week, i) => {
      const firstDay = week[0];
      if (firstDay) {
        const m = new Date(firstDay.date + "T00:00:00Z").getUTCMonth();
        if (m !== seen) {
          markers.push({ col: i, label: MONTHS[m] });
          seen = m;
        }
      }
    });
    return { weeks: data.weeks, max, monthMarkers: markers };
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.weeks.length === 0) {
    return (
      <div className="text-xs font-mono text-muted-foreground text-center py-10 border border-dashed border-border rounded">
        Couldn&apos;t load GitHub contributions. Make sure GitHub is connected.
      </div>
    );
  }

  function level(count: number) {
    if (count === 0) return "bg-muted border-border/60";
    const r = count / max;
    if (r <= 0.25) return "bg-primary/20 border-primary/30";
    if (r <= 0.5) return "bg-primary/45 border-primary/60";
    if (r <= 0.75) return "bg-primary/70 border-primary/80";
    return "bg-primary border-foreground/40 shadow-[0_0_8px_rgba(34,211,238,0.4)]";
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex gap-2 w-full">
        {/* Day labels */}
        <div className="flex flex-col gap-1 shrink-0 text-[10px] font-mono text-muted-foreground/80 w-6">
          <div className="h-3.25" />
          <div className="h-3.25 leading-3.25">Mon</div>
          <div className="h-3.25" />
          <div className="h-3.25 leading-3.25">Wed</div>
          <div className="h-3.25" />
          <div className="h-3.25 leading-3.25">Fri</div>
          <div className="h-3.25" />
        </div>

        {/* Week columns */}
        <div className="flex flex-1 gap-1 min-w-0">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex-1 flex flex-col gap-1 min-w-0">
              {Array.from({ length: 7 }).map((_, di) => {
                const cell = week[di];
                if (!cell) {
                  return <div key={di} className="aspect-square w-full opacity-0" />;
                }
                return (
                  <div
                    key={di}
                    className={`group/cell relative aspect-square w-full rounded-[2px] border transition-colors hover:border-primary ${level(
                      cell.count
                    )}`}
                  >
                    <div
                      role="tooltip"
                      className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md bg-popover text-popover-foreground border border-border px-2 py-1 text-[11px] font-mono shadow-lg opacity-0 group-hover/cell:opacity-100 transition-opacity z-20"
                    >
                      <span className="font-semibold">{cell.count}</span>
                      {" "}contribution{cell.count === 1 ? "" : "s"} on {formatTooltipDate(cell.date)}
                      <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border" />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Month labels */}
      <div className="flex gap-2 w-full text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">
        <div className="w-6 shrink-0" />
        <div className="flex flex-1 gap-1 min-w-0">
          {weeks.map((_, i) => {
            const marker = monthMarkers.find((m) => m.col === i);
            return (
              <div key={i} className="flex-1 min-w-0 relative">
                {marker && (
                  <span className="absolute left-0 top-0 whitespace-nowrap">{marker.label}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
