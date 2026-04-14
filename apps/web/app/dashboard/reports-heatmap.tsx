"use client";

import { useMemo } from "react";

interface HeatmapProps {
  daily: { date: string; count: number }[];
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_LABELS = ["Mon", "Wed", "Fri"];

function formatLongDate(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export function ReportsHeatmap({ daily }: HeatmapProps) {
  const { weeks, monthMarkers, max } = useMemo(() => {
    if (daily.length === 0) return { weeks: [], monthMarkers: [] as { col: number; label: string }[], max: 0 };

    const map = new Map(daily.map((d) => [d.date, d.count]));
    const first = new Date(daily[0].date + "T00:00:00Z");
    const last = new Date(daily[daily.length - 1].date + "T00:00:00Z");

    // Align to the Sunday before `first` (GitHub uses Sun start)
    const gridStart = new Date(first);
    gridStart.setUTCDate(gridStart.getUTCDate() - gridStart.getUTCDay());

    const weeks: { date: string; count: number | null }[][] = [];
    const monthMarkers: { col: number; label: string }[] = [];
    let seenMonth = -1;

    const cursor = new Date(gridStart);
    let col = 0;
    while (cursor <= last) {
      const week: { date: string; count: number | null }[] = [];
      for (let i = 0; i < 7; i++) {
        const iso = cursor.toISOString().slice(0, 10);
        const inRange = cursor >= first && cursor <= last;
        week.push({
          date: iso,
          count: inRange ? map.get(iso) ?? 0 : null,
        });
        if (i === 0) {
          const month = cursor.getUTCMonth();
          if (month !== seenMonth) {
            monthMarkers.push({ col, label: MONTH_LABELS[month] });
            seenMonth = month;
          }
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      weeks.push(week);
      col++;
    }

    const max = Math.max(1, ...daily.map((d) => d.count));
    return { weeks, monthMarkers, max };
  }, [daily]);

  function level(count: number | null) {
    if (count == null) return "opacity-0 pointer-events-none";
    if (count === 0) return "bg-muted";
    const ratio = count / max;
    if (ratio <= 0.25) return "bg-primary/25";
    if (ratio <= 0.5) return "bg-primary/50";
    if (ratio <= 0.75) return "bg-primary/75";
    return "bg-primary";
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-1 min-w-full">
          {/* Month labels row */}
          <div className="flex gap-[3px] pl-8 text-[10px] text-muted-foreground h-3 relative">
            {weeks.map((_, i) => {
              const marker = monthMarkers.find((m) => m.col === i);
              return (
                <div key={i} className="w-[11px] relative">
                  {marker && <span className="absolute left-0 top-0 whitespace-nowrap">{marker.label}</span>}
                </div>
              );
            })}
          </div>

          <div className="flex gap-[3px]">
            {/* Day labels column */}
            <div className="flex flex-col gap-[3px] pr-1 text-[10px] text-muted-foreground w-7 shrink-0">
              {Array.from({ length: 7 }).map((_, i) => {
                const idx = [-1, 0, -1, 1, -1, 2, -1][i];
                return (
                  <div key={i} className="h-[11px] leading-[11px]">
                    {idx >= 0 ? DAY_LABELS[idx] : ""}
                  </div>
                );
              })}
            </div>

            {/* Week columns */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((cell, di) => (
                  <div
                    key={di}
                    className={`h-[11px] w-[11px] rounded-[2px] transition ${level(cell.count)}`}
                    title={
                      cell.count == null
                        ? undefined
                        : `${cell.count} report${cell.count === 1 ? "" : "s"} · ${formatLongDate(cell.date)}`
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
        <span>Less</span>
        <span className="h-[11px] w-[11px] rounded-[2px] bg-muted" />
        <span className="h-[11px] w-[11px] rounded-[2px] bg-primary/25" />
        <span className="h-[11px] w-[11px] rounded-[2px] bg-primary/50" />
        <span className="h-[11px] w-[11px] rounded-[2px] bg-primary/75" />
        <span className="h-[11px] w-[11px] rounded-[2px] bg-primary" />
        <span>More</span>
      </div>
    </div>
  );
}
