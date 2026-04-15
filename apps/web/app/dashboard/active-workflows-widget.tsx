"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Activity, Loader2, PlayCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WorkflowRun, WorkflowRunStatus } from "@/lib/github";

interface RepoWorkflowRuns {
  repoId: string;
  repoFullName: string;
  runs: WorkflowRun[];
  error: string | null;
}

interface ActiveRun {
  run: WorkflowRun;
  repoFullName: string;
  estimatedMs: number | null;
}

function computeMedianByWorkflow(
  runs: WorkflowRun[],
): Map<string, number> {
  const buckets = new Map<string, number[]>();
  for (const r of runs) {
    if (r.status !== "completed" || r.conclusion !== "success" || r.durationMs === null) continue;
    const list = buckets.get(r.name) ?? [];
    list.push(r.durationMs);
    buckets.set(r.name, list);
  }
  const medians = new Map<string, number>();
  for (const [name, list] of buckets) {
    if (list.length === 0) continue;
    const sorted = [...list].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    medians.set(name, median);
  }
  return medians;
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const remSec = s % 60;
  if (m < 60) return `${m}m ${remSec}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

const POLL_INTERVAL_MS = 30_000;
const QUERY_KEY = ["workflow-runs"] as const;

function isLive(status: WorkflowRunStatus): boolean {
  return (
    status === "in_progress" ||
    status === "queued" ||
    status === "waiting" ||
    status === "pending" ||
    status === "requested"
  );
}

export function ActiveWorkflowsWidget() {
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, refetch } = useQuery<RepoWorkflowRuns[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/repos/workflow-runs");
      return data.data ?? [];
    },
    refetchInterval: (query) => {
      const repos = query.state.data as RepoWorkflowRuns[] | undefined;
      const hasLive =
        repos?.some((r) => r.runs.some((run) => isLive(run.status))) ?? false;
      return hasLive ? POLL_INTERVAL_MS : false;
    },
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });

  const activeRuns = useMemo<ActiveRun[]>(() => {
    const out: ActiveRun[] = [];
    for (const repo of data ?? []) {
      const medians = computeMedianByWorkflow(repo.runs);
      for (const run of repo.runs) {
        if (isLive(run.status)) {
          out.push({
            run,
            repoFullName: repo.repoFullName,
            estimatedMs: medians.get(run.name) ?? null,
          });
        }
      }
    }
    return out.sort((a, b) =>
      (b.run.runStartedAt ?? "").localeCompare(a.run.runStartedAt ?? "")
    );
  }, [data]);

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    void refetch();
  };

  return (
    <section className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h2 className="text-sm font-medium text-foreground flex items-center gap-2 min-w-0">
          <Activity className="h-4 w-4 text-primary shrink-0" />
          <span className="truncate">Active workflows</span>
          {activeRuns.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary shrink-0">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              {activeRuns.length} running
            </span>
          )}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isFetching}
          className="h-7 px-2 text-xs font-mono text-muted-foreground hover:text-foreground shrink-0"
        >
          <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-10 border border-dashed border-border rounded-md">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : activeRuns.length === 0 ? (
          <div className="flex items-center gap-3 border border-dashed border-border rounded-md px-3 py-4">
            <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-xs font-mono text-muted-foreground">
              No active runs — all quiet.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-1 max-h-65 overflow-y-auto pr-1">
            {activeRuns.map(({ run, repoFullName, estimatedMs }) => (
              <ActiveWorkflowRow
                key={`${repoFullName}:${run.id}`}
                run={run}
                repoFullName={repoFullName}
                estimatedMs={estimatedMs}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ActiveWorkflowRow({
  run,
  repoFullName,
  estimatedMs,
}: {
  run: WorkflowRun;
  repoFullName: string;
  estimatedMs: number | null;
}) {
  const startMs = run.runStartedAt ? new Date(run.runStartedAt).getTime() : null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const elapsedMs = startMs ? Math.max(0, now - startMs) : null;
  const progress =
    estimatedMs !== null && estimatedMs > 0 && elapsedMs !== null
      ? Math.min(0.95, elapsedMs / estimatedMs)
      : null;

  return (
    <li>
      <a
        href={run.htmlUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-2.5 rounded-md border border-border bg-card/40 px-2.5 py-2 hover:border-foreground/30 hover:bg-card transition-colors"
      >
        <span className="inline-flex items-center justify-center h-6 w-6 rounded shrink-0 bg-yellow-400/10 border border-yellow-400/30 text-yellow-400">
          <PlayCircle className="h-3.5 w-3.5 animate-pulse" />
        </span>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
              {run.name}
            </div>
            {elapsedMs !== null && (
              <div className="text-[10px] font-mono text-muted-foreground shrink-0 tabular-nums">
                {formatElapsed(elapsedMs)}
                {estimatedMs !== null && estimatedMs > 0 && (
                  <span className="opacity-60"> / ~{formatElapsed(estimatedMs)}</span>
                )}
              </div>
            )}
          </div>
          <div className="text-[10px] font-mono text-muted-foreground truncate">
            {repoFullName}
          </div>
          {/* Progress bar: determinate if we have a historical median, shimmer otherwise */}
          <div className="relative h-0.5 w-full overflow-hidden rounded-full bg-border/60">
            {progress !== null ? (
              <span
                className="absolute inset-y-0 left-0 bg-primary transition-[width] duration-500 ease-linear"
                style={{ width: `${progress * 100}%` }}
              />
            ) : (
              <span className="absolute inset-y-0 -left-1/3 w-1/3 bg-primary/70 animate-[shimmer_1.4s_ease-in-out_infinite]" />
            )}
          </div>
        </div>
      </a>
    </li>
  );
}
