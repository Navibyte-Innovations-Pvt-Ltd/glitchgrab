"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { LineChart, RefreshCw, UploadCloud } from "lucide-react";
import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Snapshot {
  id: string;
  kind: string; // "sync" | "reindex"
  indexedCount: number;
  notIndexedCount: number;
  totalChecked: number;
  submittedCount: number | null;
  createdAt: string; // ISO
}

interface HistoryResponse {
  snapshots: Snapshot[];
}

// Chart geometry
const VIEW_W = 600;
const VIEW_H = 180;
const PAD_T = 14;
const PAD_R = 14;
const PAD_B = 26;
const PAD_L = 36;
const PLOT_W = VIEW_W - PAD_L - PAD_R;
const PLOT_H = VIEW_H - PAD_T - PAD_B;

export function IndexingHistoryChart({
  propertyId,
}: {
  propertyId: string;
}) {
  const { data, isFetching, isError, refetch } = useQuery<HistoryResponse>({
    queryKey: ["gsc-history", propertyId],
    queryFn: async () => {
      const { data } = await axios.get(
        `/api/v1/gsc/properties/${propertyId}/history`,
      );
      if (!data.success)
        throw new Error(data.error ?? "Failed to load indexing history");
      return data.data as HistoryResponse;
    },
    staleTime: 30_000,
  });

  const snapshots = data?.snapshots ?? [];

  return (
    <div className="border border-border rounded bg-card/40 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/60">
        <div className="flex items-center gap-2 min-w-0">
          <LineChart className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest truncate">
            Indexing History
          </span>
          {snapshots.length > 0 && (
            <span className="font-mono text-[10px] text-muted-foreground/70">
              · {snapshots.length} {snapshots.length === 1 ? "snapshot" : "snapshots"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
          <Legend color="bg-green-400" label="Indexed" />
          <Legend color="bg-red-400" label="Not indexed" />
        </div>
      </div>

      <div className="p-4">
        {isFetching && snapshots.length === 0 ? (
          <Skeleton className="h-44 w-full" />
        ) : isError ? (
          <div className="flex items-center gap-2 py-6">
            <p className="font-mono text-[11px] text-red-400">
              Could not load indexing history.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="font-mono text-[11px] text-primary hover:underline"
            >
              Retry
            </button>
          </div>
        ) : snapshots.length === 0 ? (
          <div className="py-8 text-center">
            <p className="font-mono text-[11px] text-muted-foreground">
              No history yet. Run{" "}
              <span className="text-foreground">Sync Now</span> to start tracking
              indexing changes over time.
            </p>
          </div>
        ) : snapshots.length === 1 ? (
          <SinglePointMessage snap={snapshots[0]} />
        ) : (
          <Chart snapshots={snapshots} />
        )}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-1.5 w-3 rounded-sm shrink-0", color)} />
      {label}
    </span>
  );
}

function SinglePointMessage({ snap }: { snap: Snapshot }) {
  return (
    <div className="space-y-2 py-2">
      <p className="font-mono text-[11px] text-muted-foreground">
        Only one snapshot recorded so far. The chart will appear after the next
        sync.
      </p>
      <SnapshotRow snap={snap} />
    </div>
  );
}

function SnapshotRow({ snap }: { snap: Snapshot }) {
  const ts = new Date(snap.createdAt);
  return (
    <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
      {snap.kind === "reindex" ? (
        <UploadCloud className="h-3 w-3 text-amber-400" />
      ) : (
        <RefreshCw className="h-3 w-3" />
      )}
      <span>{ts.toLocaleString()}</span>
      <span className="text-green-400">{snap.indexedCount} indexed</span>
      <span className="text-red-400">{snap.notIndexedCount} not</span>
    </div>
  );
}

function Chart({ snapshots }: { snapshots: Snapshot[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const { indexedPath, notIndexedPath, indexedArea, points, yMax } = useMemo(
    () => buildGeometry(snapshots),
    [snapshots],
  );

  const firstSnap = snapshots[0];
  const lastSnap = snapshots[snapshots.length - 1];
  if (!firstSnap || !lastSnap) return null;

  const firstDate = new Date(firstSnap.createdAt);
  const lastDate = new Date(lastSnap.createdAt);
  const sameDay = firstDate.toDateString() === lastDate.toDateString();

  const fmtAxis = (d: Date) =>
    sameDay
      ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  const handlePointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const px = xRatio * VIEW_W;
    if (px < PAD_L || px > VIEW_W - PAD_R) {
      setHoverIdx(null);
      return;
    }
    const ratio = (px - PAD_L) / PLOT_W;
    const idx = Math.round(ratio * (snapshots.length - 1));
    setHoverIdx(Math.max(0, Math.min(snapshots.length - 1, idx)));
  };

  const hovered = hoverIdx !== null ? (snapshots[hoverIdx] ?? null) : null;
  const hoveredPt = hoverIdx !== null ? (points[hoverIdx] ?? null) : null;

  const yTicks = niceTicks(yMax, 3);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full h-auto select-none"
        preserveAspectRatio="none"
        onPointerMove={handlePointer}
        onPointerLeave={() => setHoverIdx(null)}
        role="img"
        aria-label="Indexing history line chart"
      >
        {/* Y grid + labels */}
        {yTicks.map((tick) => {
          const y = yToSvg(tick, yMax);
          return (
            <g key={tick}>
              <line
                x1={PAD_L}
                x2={VIEW_W - PAD_R}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.08}
                strokeDasharray="2 4"
              />
              <text
                x={PAD_L - 6}
                y={y + 3}
                textAnchor="end"
                fontFamily="monospace"
                fontSize={9}
                fill="currentColor"
                opacity={0.5}
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* X-axis labels: first and last */}
        <text
          x={PAD_L}
          y={VIEW_H - 8}
          textAnchor="start"
          fontFamily="monospace"
          fontSize={9}
          fill="currentColor"
          opacity={0.5}
        >
          {fmtAxis(firstDate)}
        </text>
        <text
          x={VIEW_W - PAD_R}
          y={VIEW_H - 8}
          textAnchor="end"
          fontFamily="monospace"
          fontSize={9}
          fill="currentColor"
          opacity={0.5}
        >
          {fmtAxis(lastDate)}
        </text>

        {/* Indexed area */}
        <path d={indexedArea} fill="rgb(74 222 128 / 0.12)" />

        {/* Indexed line */}
        <path
          d={indexedPath}
          fill="none"
          stroke="rgb(74 222 128)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Not-indexed line */}
        <path
          d={notIndexedPath}
          fill="none"
          stroke="rgb(248 113 113)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Reindex event markers (vertical dashed line + amber dot at top) */}
        {snapshots.map((s, i) => {
          if (s.kind !== "reindex") return null;
          const pt = points[i];
          if (!pt) return null;
          const x = pt.x;
          return (
            <g key={`reindex-${s.id}`}>
              <line
                x1={x}
                x2={x}
                y1={PAD_T}
                y2={VIEW_H - PAD_B}
                stroke="rgb(251 191 36)"
                strokeOpacity={0.35}
                strokeDasharray="2 3"
                strokeWidth={1}
              />
              <circle
                cx={x}
                cy={PAD_T + 2}
                r={2.5}
                fill="rgb(251 191 36)"
              />
            </g>
          );
        })}

        {/* Hover guide */}
        {hoveredPt && (
          <g>
            <line
              x1={hoveredPt.x}
              x2={hoveredPt.x}
              y1={PAD_T}
              y2={VIEW_H - PAD_B}
              stroke="currentColor"
              strokeOpacity={0.25}
            />
            <circle
              cx={hoveredPt.x}
              cy={hoveredPt.yIndexed}
              r={3}
              fill="rgb(74 222 128)"
              stroke="rgb(0 0 0)"
              strokeWidth={1}
            />
            <circle
              cx={hoveredPt.x}
              cy={hoveredPt.yNotIndexed}
              r={3}
              fill="rgb(248 113 113)"
              stroke="rgb(0 0 0)"
              strokeWidth={1}
            />
          </g>
        )}
      </svg>

      {/* Tooltip */}
      {hovered && hoveredPt && (
        <div
          className="absolute pointer-events-none -translate-x-1/2 bg-popover border border-border rounded px-3 py-2 shadow-md space-y-1"
          style={{
            left: `${(hoveredPt.x / VIEW_W) * 100}%`,
            top: 4,
          }}
        >
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            {hovered.kind === "reindex" ? (
              <>
                <UploadCloud className="h-2.5 w-2.5 text-amber-400" />
                Reindex
              </>
            ) : (
              <>
                <RefreshCw className="h-2.5 w-2.5" />
                Sync
              </>
            )}
            <span className="text-muted-foreground/70 normal-case tracking-normal ml-1">
              {new Date(hovered.createdAt).toLocaleString()}
            </span>
          </div>
          <div className="font-mono text-[11px] flex items-center gap-3">
            <span className="text-green-400">
              {hovered.indexedCount} indexed
            </span>
            <span className="text-red-400">
              {hovered.notIndexedCount} not
            </span>
            {hovered.totalChecked > 0 && (
              <span className="text-muted-foreground">
                / {hovered.totalChecked} checked
              </span>
            )}
          </div>
          {hovered.kind === "reindex" && hovered.submittedCount !== null && (
            <div className="font-mono text-[10px] text-amber-400">
              {hovered.submittedCount} URL{hovered.submittedCount === 1 ? "" : "s"} submitted
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── geometry helpers ───────────────────────────────────────────────────

interface PointGeo {
  x: number;
  yIndexed: number;
  yNotIndexed: number;
}

function buildGeometry(snapshots: Snapshot[]): {
  indexedPath: string;
  notIndexedPath: string;
  indexedArea: string;
  points: PointGeo[];
  yMax: number;
} {
  const maxIndexed = Math.max(...snapshots.map((s) => s.indexedCount));
  const maxNotIndexed = Math.max(...snapshots.map((s) => s.notIndexedCount));
  const rawMax = Math.max(maxIndexed, maxNotIndexed, 1);
  const yMax = niceCeil(rawMax);

  const points: PointGeo[] = snapshots.map((s, i) => {
    const x =
      snapshots.length === 1
        ? PAD_L + PLOT_W / 2
        : PAD_L + (i / (snapshots.length - 1)) * PLOT_W;
    return {
      x,
      yIndexed: yToSvg(s.indexedCount, yMax),
      yNotIndexed: yToSvg(s.notIndexedCount, yMax),
    };
  });

  const indexedPath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.yIndexed.toFixed(2)}`)
    .join(" ");

  const notIndexedPath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.yNotIndexed.toFixed(2)}`)
    .join(" ");

  // Area under indexed line, anchored to bottom of plot
  const baselineY = VIEW_H - PAD_B;
  const first = points[0];
  const last = points[points.length - 1];
  const indexedArea =
    first && last
      ? `M ${first.x.toFixed(2)} ${baselineY.toFixed(2)} ` +
        points
          .map((p) => `L ${p.x.toFixed(2)} ${p.yIndexed.toFixed(2)}`)
          .join(" ") +
        ` L ${last.x.toFixed(2)} ${baselineY.toFixed(2)} Z`
      : "";

  return { indexedPath, notIndexedPath, indexedArea, points, yMax };
}

function yToSvg(value: number, yMax: number): number {
  if (yMax <= 0) return VIEW_H - PAD_B;
  const ratio = value / yMax;
  return VIEW_H - PAD_B - ratio * PLOT_H;
}

function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const exp = Math.floor(Math.log10(value));
  const base = Math.pow(10, exp);
  const m = value / base;
  let nice: number;
  if (m <= 1) nice = 1;
  else if (m <= 2) nice = 2;
  else if (m <= 5) nice = 5;
  else nice = 10;
  return nice * base;
}

function niceTicks(yMax: number, count: number): number[] {
  if (yMax <= 0) return [0];
  const step = yMax / count;
  const ticks: number[] = [];
  for (let i = 0; i <= count; i++) {
    ticks.push(Math.round(i * step));
  }
  return Array.from(new Set(ticks));
}
