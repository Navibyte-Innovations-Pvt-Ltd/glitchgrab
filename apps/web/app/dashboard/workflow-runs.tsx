"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  Clock,
  GitBranch,
  Loader2,
  PlayCircle,
  RefreshCw,
  SkipForward,
  XCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type {
  WorkflowRun,
  WorkflowRunConclusion,
  WorkflowRunStatus,
} from "@/lib/github";

interface RepoWorkflowRuns {
  repoId: string;
  repoFullName: string;
  runs: WorkflowRun[];
  error: string | null;
}

const POLL_INTERVAL_MS = 30_000;
const QUERY_KEY = ["workflow-runs"] as const;

function isLive(status: WorkflowRunStatus): boolean {
  return status === "in_progress" || status === "queued" || status === "waiting" || status === "pending" || status === "requested";
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return `${Math.max(1, Math.round(diff / 1000))}s ago`;
  if (diff < 60 * 60_000) return `${Math.round(diff / 60_000)}m ago`;
  const day = 24 * 60 * 60_000;
  if (diff < day) return `${Math.round(diff / (60 * 60_000))}h ago`;
  if (diff < 30 * day) return `${Math.round(diff / day)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function formatDuration(ms: number | null): string | null {
  if (ms === null) return null;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return rs ? `${m}m ${rs}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h}h ${rm}m` : `${h}h`;
}

export function WorkflowRunsSection() {
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, refetch } = useQuery<RepoWorkflowRuns[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/repos/workflow-runs");
      return data.data ?? [];
    },
    refetchInterval: (query) => {
      const repos = query.state.data as RepoWorkflowRuns[] | undefined;
      const hasLive = repos?.some((r) => r.runs.some((run) => isLive(run.status))) ?? false;
      return hasLive ? POLL_INTERVAL_MS : false;
    },
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });

  const reposWithRuns = useMemo(
    () => (data ?? []).filter((r) => r.runs.length > 0 || r.error),
    [data]
  );

  const liveCount = useMemo(
    () =>
      (data ?? []).reduce(
        (sum, r) => sum + r.runs.filter((run) => isLive(run.status)).length,
        0
      ),
    [data]
  );

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    void refetch();
  };

  if (isLoading) {
    return (
      <section className="flex flex-col gap-3">
        <SectionHeader liveCount={0} onRefresh={handleRefresh} isFetching />
        <div className="flex items-center justify-center py-10 border border-dashed border-border rounded-md">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  if (!data || reposWithRuns.length === 0) {
    return (
      <section className="flex flex-col gap-3">
        <SectionHeader liveCount={0} onRefresh={handleRefresh} isFetching={isFetching} />
        <div className="flex items-center gap-3 border border-dashed border-border rounded-md px-4 py-4">
          <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-xs font-mono text-muted-foreground">
            No workflow runs found across your connected repos.
          </p>
        </div>
      </section>
    );
  }

  // Auto-expand the most recently active repo (by latest run updatedAt)
  const sorted = [...reposWithRuns].sort((a, b) => {
    const aLatest = a.runs[0]?.updatedAt ?? "";
    const bLatest = b.runs[0]?.updatedAt ?? "";
    return bLatest.localeCompare(aLatest);
  });
  const initiallyExpandedId = sorted[0]?.repoId ?? null;
  const collapseByDefault = sorted.length > 3;

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader liveCount={liveCount} onRefresh={handleRefresh} isFetching={isFetching} />
      <div className="flex flex-col gap-2">
        {sorted.map((repo) => (
          <RepoWorkflowCard
            key={repo.repoId}
            repo={repo}
            defaultOpen={!collapseByDefault || repo.repoId === initiallyExpandedId}
          />
        ))}
      </div>
    </section>
  );
}

function SectionHeader({
  liveCount,
  onRefresh,
  isFetching,
}: {
  liveCount: number;
  onRefresh: () => void;
  isFetching: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2">
      <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        Recent workflow runs
        {liveCount > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            {liveCount} running
          </span>
        )}
      </h2>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        disabled={isFetching}
        className="h-7 px-2 text-xs font-mono text-muted-foreground hover:text-foreground"
      >
        <RefreshCw className={`h-3 w-3 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
        Refresh
      </Button>
    </div>
  );
}

function RepoWorkflowCard({
  repo,
  defaultOpen,
}: {
  repo: RepoWorkflowRuns;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const liveInRepo = repo.runs.filter((r) => isLive(r.status)).length;

  return (
    <div className="border border-border rounded-md bg-card/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-card transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <ChevronDown
            className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
              open ? "" : "-rotate-90"
            }`}
          />
          <span className="text-sm font-mono text-foreground truncate">{repo.repoFullName}</span>
          {liveInRepo > 0 && (
            <span className="inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary">
              {liveInRepo} live
            </span>
          )}
        </div>
        <span className="text-[11px] font-mono text-muted-foreground shrink-0">
          {repo.error ? "error" : `${repo.runs.length} run${repo.runs.length === 1 ? "" : "s"}`}
        </span>
      </button>

      {open && (
        <div className="border-t border-border px-2 py-2">
          {repo.error ? (
            <div className="px-2 py-3 text-xs font-mono text-yellow-400/90">
              {repo.error.includes("404")
                ? "Repo not accessible — it may have been deleted or your token lost access."
                : repo.error.includes("401") || repo.error.includes("403")
                  ? "GitHub access denied — try reconnecting your account in Settings."
                  : `Failed to load workflow runs (${repo.error})`}
            </div>
          ) : repo.runs.length === 0 ? (
            <div className="px-2 py-3 text-xs font-mono text-muted-foreground">
              No workflows configured for this repo.
            </div>
          ) : (
            <ul className="flex flex-col gap-1">
              {repo.runs.map((run) => (
                <WorkflowRunRow key={run.id} run={run} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function WorkflowRunRow({ run }: { run: WorkflowRun }) {
  const duration = formatDuration(run.durationMs);
  return (
    <li>
      <a
        href={run.htmlUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-start gap-3 rounded-md px-2 py-2 hover:bg-card transition-colors"
      >
        <StatusPill status={run.status} conclusion={run.conclusion} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
              {run.name}
            </span>
            {run.commitMessage && (
              <span className="text-xs font-mono text-muted-foreground truncate">
                · {run.commitMessage}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] font-mono text-muted-foreground flex-wrap">
            <span className="inline-flex items-center gap-1">
              <GitBranch className="h-3 w-3" />
              {run.branch}
            </span>
            <span className="opacity-40">·</span>
            <span className="text-primary/70">{run.commitSha}</span>
            <span className="opacity-40">·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeAgo(run.runStartedAt)}
            </span>
            {duration && (
              <>
                <span className="opacity-40">·</span>
                <span>{duration}</span>
              </>
            )}
          </div>
        </div>
        {run.actorAvatar && (
          <Avatar className="h-5 w-5 shrink-0 border border-border">
            <AvatarImage src={run.actorAvatar} alt={run.actorLogin ?? ""} />
            <AvatarFallback className="text-[9px] font-mono">
              {(run.actorLogin ?? "?").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </a>
    </li>
  );
}

function StatusPill({
  status,
  conclusion,
}: {
  status: WorkflowRunStatus;
  conclusion: WorkflowRunConclusion;
}) {
  const live = isLive(status);

  if (live) {
    return (
      <span className="inline-flex items-center justify-center h-6 w-6 rounded shrink-0 mt-0.5 bg-yellow-400/10 border border-yellow-400/30 text-yellow-400">
        <PlayCircle className="h-3.5 w-3.5 animate-pulse" />
      </span>
    );
  }

  if (conclusion === "success") {
    return (
      <span className="inline-flex items-center justify-center h-6 w-6 rounded shrink-0 mt-0.5 bg-primary/10 border border-primary/30 text-primary">
        <CheckCircle2 className="h-3.5 w-3.5" />
      </span>
    );
  }

  if (conclusion === "failure" || conclusion === "timed_out" || conclusion === "startup_failure") {
    return (
      <span className="inline-flex items-center justify-center h-6 w-6 rounded shrink-0 mt-0.5 bg-red-500/10 border border-red-500/30 text-red-400">
        <XCircle className="h-3.5 w-3.5" />
      </span>
    );
  }

  if (conclusion === "skipped" || conclusion === "cancelled" || conclusion === "neutral") {
    return (
      <span className="inline-flex items-center justify-center h-6 w-6 rounded shrink-0 mt-0.5 bg-muted border border-border text-muted-foreground">
        <SkipForward className="h-3.5 w-3.5" />
      </span>
    );
  }

  return (
    <span className="inline-flex items-center justify-center h-6 w-6 rounded shrink-0 mt-0.5 bg-muted border border-border text-muted-foreground">
      <Clock className="h-3.5 w-3.5" />
    </span>
  );
}
