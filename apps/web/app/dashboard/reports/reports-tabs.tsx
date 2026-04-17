"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import {
  AlertTriangle,
  Bug,
  ChevronRight,
  CircleDot,
  ClipboardList,
  Clock,
  ExternalLink,
  EyeOff,
  FileText,
  Filter,
  GitPullRequest,
  Loader2,
  MessageSquare,
  Paperclip,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ReportItem {
  id: string;
  source: string;
  status: string;
  rawInput: string | null;
  failReason: string | null;
  createdAt: string;
  repoFullName: string;
  dismissed?: boolean;
  reporterPrimaryKey: string;
  reporterName: string;
  reporterEmail: string | null;
  issue: {
    githubNumber: number;
    githubUrl: string;
    title: string;
    githubState: string | null;
  } | null;
}

function computeCutoffMs(filter: "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS"): number {
  const ms =
    filter === "TODAY"
      ? 24 * 60 * 60 * 1000
      : filter === "LAST_7_DAYS"
      ? 7 * 24 * 60 * 60 * 1000
      : 30 * 24 * 60 * 60 * 1000;
  return Date.now() - ms;
}

const SOURCE_LABELS: Record<string, string> = {
  SDK_AUTO: "auto_capture",
  SDK_USER_REPORT: "user_report",
  DASHBOARD_UPLOAD: "dashboard",
  HANDWRITTEN_NOTE: "note",
  MCP: "mcp",
  COLLABORATOR: "collaborator",
};

function renderSourceIcon(source: string, className = "h-4 w-4") {
  switch (source) {
    case "SDK_AUTO":
      return <AlertTriangle className={className} />;
    case "SDK_USER_REPORT":
      return <Bug className={className} />;
    case "DASHBOARD_UPLOAD":
      return <MessageSquare className={className} />;
    case "HANDWRITTEN_NOTE":
      return <FileText className={className} />;
    case "MCP":
      return <Paperclip className={className} />;
    default:
      return <Bug className={className} />;
  }
}

// Mapping: status → left-strip color class (per design vocab)
function getStripClass(status: string): string {
  switch (status) {
    case "CREATED":
      return "bg-primary shadow-[0_0_8px_rgba(34,211,238,0.4)]";
    case "DUPLICATE":
      return "bg-amber-400";
    case "FAILED":
      return "bg-red-500";
    case "PENDING":
    case "PROCESSING":
    default:
      return "bg-muted-foreground/40";
  }
}

// Status chip color mapping (bg + border + text, mono uppercase)
function getStatusChipClass(status: string): string {
  switch (status) {
    case "CREATED":
      return "bg-primary/10 border-primary/30 text-primary";
    case "DUPLICATE":
      return "bg-amber-500/10 border-amber-500/30 text-amber-500";
    case "FAILED":
      return "bg-red-500/10 border-red-500/30 text-red-500";
    case "PROCESSING":
      return "bg-muted border-border text-muted-foreground";
    case "PENDING":
    default:
      return "bg-muted border-border text-muted-foreground";
  }
}

function getIssueStateChipClass(state: string | null): string {
  if (state === "open") return "bg-primary/10 border-primary/30 text-primary";
  if (state === "closed") return "bg-muted border-border text-muted-foreground";
  return "bg-red-500/10 border-red-500/30 text-red-500";
}

function formatAge(date: string): string {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function ReportsTabs({
  myReports,
  productIssues,
}: {
  myReports: ReportItem[];
  productIssues: ReportItem[];
}) {
  const [tab, setTab] = useState<"product" | "my">("product");
  const [search, setSearch] = useState("");
  const [repoFilter, setRepoFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<"ALL" | "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS">("ALL");
  const [cutoffTimestamp, setCutoffTimestamp] = useState<number | null>(null);
  const [issueStateFilter, setIssueStateFilter] = useState<"all" | "open" | "closed">("all");
  const router = useRouter();

  const reports = tab === "product" ? productIssues : myReports;

  const uniqueRepos = useMemo(() => {
    const repos = new Set(reports.map((r) => r.repoFullName).filter(Boolean));
    return Array.from(repos).sort();
  }, [reports]);

  const filtered = useMemo(() => {
    let list = reports.filter((r) => !r.dismissed);
    if (repoFilter) {
      list = list.filter((r) => r.repoFullName === repoFilter);
    }
    if (issueStateFilter !== "all") {
      list = list.filter((r) => r.issue?.githubState === issueStateFilter);
    }
    if (cutoffTimestamp !== null) {
      list = list.filter((r) => new Date(r.createdAt).getTime() >= cutoffTimestamp);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) => {
        const title = r.issue?.title ?? r.rawInput ?? r.failReason ?? "";
        return (
          title.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          r.repoFullName.toLowerCase().includes(q) ||
          (r.reporterName ?? "").toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [reports, search, issueStateFilter, repoFilter, cutoffTimestamp]);

  function handleDateFilterChange(filter: "ALL" | "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS") {
    setDateFilter(filter);
    setCutoffTimestamp(filter === "ALL" ? null : computeCutoffMs(filter));
  }

  function handleTabChange(next: "product" | "my") {
    setTab(next);
    setRepoFilter(null);
    setIssueStateFilter("all");
    setDateFilter("ALL");
    setCutoffTimestamp(null);
    setSearch("");
  }

  return (
    <div className="space-y-4">
      {/* Tabs — mono pill group with cyan active strip */}
      <div className="flex items-center gap-1 border-b border-border">
        <TabButton
          active={tab === "product"}
          onClick={() => handleTabChange("product")}
          icon={GitPullRequest}
          label="product_issues"
          count={productIssues.length}
        />
        <TabButton
          active={tab === "my"}
          onClick={() => handleTabChange("my")}
          icon={Bug}
          label="my_reports"
          count={myReports.length}
        />
      </div>

      {/* Filter/search strip — shown when we have reports */}
      {reports.length > 0 && (
        <div className="flex flex-col gap-3 pb-3 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 max-w-sm flex-1 border border-border rounded px-2 py-1 focus-within:border-primary transition-colors">
              <span className="font-mono text-[11px] text-primary shrink-0">~ /</span>
              <input
                type="text"
                placeholder="grep reports..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent font-mono text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              />
            </div>
            {uniqueRepos.length > 1 && (
              <>
                <div className="hidden sm:block w-px h-4 bg-border" />
                <div className="flex items-center gap-2">
                  <Filter className="h-3 w-3 text-muted-foreground shrink-0" />
                  <select
                    value={repoFilter ?? ""}
                    onChange={(e) => setRepoFilter(e.target.value || null)}
                    className="font-mono text-[11px] border border-border bg-card text-muted-foreground px-2 py-1 rounded focus:outline-none focus:border-primary transition-colors hover:text-foreground"
                  >
                    <option value="">all_repos</option>
                    {uniqueRepos.map((repo) => (
                      <option key={repo} value={repo}>
                        {repo}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div className="font-mono text-[11px] text-muted-foreground flex items-center gap-2 sm:ml-auto shrink-0">
              <span>{filtered.length} result{filtered.length === 1 ? "" : "s"}</span>
            </div>
          </div>

          {/* Date filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
            {(["ALL", "TODAY", "LAST_7_DAYS", "LAST_30_DAYS"] as const).map((d) => (
              <button
                key={d}
                onClick={() => handleDateFilterChange(d)}
                className={cn(
                  "font-mono text-[10px] border px-2.5 py-1 rounded-full uppercase tracking-wider transition-colors",
                  dateFilter === d
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-card border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {d.toLowerCase().replace(/_/g, "_")}
              </button>
            ))}
          </div>

          {/* Issue state filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <CircleDot className="h-3 w-3 text-muted-foreground shrink-0" />
            {(["all", "open", "closed"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setIssueStateFilter(s)}
                className={cn(
                  "font-mono text-[10px] border px-2.5 py-1 rounded-full uppercase tracking-wider transition-colors",
                  issueStateFilter === s
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-card border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Report list */}
      {reports.length === 0 ? (
        <div className="border border-dashed border-border rounded p-10 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center mb-4">
            <ClipboardList className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="font-mono text-sm text-foreground mb-2">
            {tab === "product" ? "no product issues yet" : "no bug reports yet"}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            {tab === "product"
              ? "Issues will appear here when bugs are captured via the SDK or dashboard."
              : "Bugs you report about Glitchgrab using the Report Bug button will show here."}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-border rounded p-8 flex flex-col items-center text-center">
          <p className="font-mono text-xs text-muted-foreground">
            no reports match your filters
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {filtered.map((report) => (
            <ReportRow
              key={report.id}
              report={report}
              onActionDone={() => router.refresh()}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Bug;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-2 px-4 py-2.5 font-mono text-[12px] uppercase tracking-wider transition-colors -mb-px",
        active
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
      {count > 0 && (
        <span
          className={cn(
            "font-mono text-[10px] px-1.5 py-0.5 rounded border",
            active
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-muted border-border text-muted-foreground"
          )}
        >
          {count}
        </span>
      )}
      {active && (
        <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
      )}
    </button>
  );
}

function ReportRow({
  report,
  onActionDone,
}: {
  report: ReportItem;
  onActionDone: () => void;
}) {
  const stripClass = getStripClass(report.status);
  const sourceLabel = SOURCE_LABELS[report.source] ?? report.source.toLowerCase();
  const title =
    report.issue?.title ??
    report.rawInput?.slice(0, 120) ??
    report.failReason ??
    "no description";
  const age = formatAge(report.createdAt);
  const idPrefix = report.id.slice(0, 8);

  const statusChip = report.issue
    ? {
        className: getIssueStateChipClass(report.issue.githubState),
        label:
          report.issue.githubState === "closed"
            ? "closed"
            : report.issue.githubState === "open"
            ? "open"
            : "deleted",
      }
    : {
        className: getStatusChipClass(report.status),
        label:
          report.status === "CREATED" ? "no_issue" : report.status.toLowerCase(),
      };

  const dismissMutation = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post(`/api/v1/reports/${report.id}/actions`, {
        action: "dismiss",
      });
      if (!data.success) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success("Report dismissed");
      onActionDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to dismiss"),
  });

  const githubUrl = report.issue?.githubUrl ?? null;
  const rowClassName = "grid grid-cols-[auto_1fr_auto_40px] items-center gap-3 p-3";
  const rowContent = (
    <>
      <div className={`absolute inset-y-2 left-[2px] w-[2px] rounded-full ${stripClass}`} />

        {/* Source icon box */}
        <div className="w-8 h-8 rounded border border-border bg-card flex items-center justify-center text-muted-foreground ml-2 shrink-0">
          {renderSourceIcon(report.source)}
        </div>

        {/* Title + mono meta */}
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium text-foreground truncate">
              {title}
            </span>
            {report.issue && (
              <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground/60" />
            )}
          </div>
          {report.status === "FAILED" && report.failReason && (
            <div className="font-mono text-[11px] text-red-500/80 truncate">
              ↳ {report.failReason}
            </div>
          )}
          <div className="font-mono text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
            <span className="truncate">rpt_{idPrefix}</span>
            <span className="w-0.75 h-0.75 rounded-full bg-border shrink-0" />
            <span className="truncate">{sourceLabel}</span>
            {report.issue && (
              <>
                <span className="w-0.75 h-0.75 rounded-full bg-border shrink-0" />
                <span className="truncate">#{report.issue.githubNumber}</span>
              </>
            )}
            {report.repoFullName && (
              <>
                <span className="w-0.75 h-0.75 rounded-full bg-border shrink-0" />
                <span className="truncate">repo:{report.repoFullName}</span>
              </>
            )}
            <span className="w-0.75 h-0.75 rounded-full bg-border shrink-0" />
            <span className="flex items-center gap-1 shrink-0">
              <Clock className="h-2.5 w-2.5" />
              {age}
            </span>
            {report.reporterName && report.reporterName !== "Unknown" && (
              <>
                <span className="w-0.75 h-0.75 rounded-full bg-border shrink-0" />
                <span className="truncate">by {report.reporterName}</span>
              </>
            )}
          </div>
        </div>

        {/* Status chip */}
        <div
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded border font-mono text-[10px] uppercase tracking-wider shrink-0",
            statusChip.className
          )}
        >
          {statusChip.label}
        </div>

        {/* Hover chevron — only when the row links out */}
        {githubUrl ? (
          <div className="flex justify-end pr-2 text-muted-foreground opacity-0 -translate-x-3 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0">
            <ChevronRight className="h-4 w-4" />
          </div>
        ) : (
          <div />
        )}
    </>
  );

  return (
    <div className="data-row group relative rounded bg-transparent hover:bg-card/60 border border-transparent hover:border-border/50 transition-colors">
      {githubUrl ? (
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={rowClassName}
        >
          {rowContent}
        </a>
      ) : (
        <div className={rowClassName}>{rowContent}</div>
      )}

      {/* Dismiss action for failed reports */}
      {report.status === "FAILED" && !report.dismissed && (
        <div className="px-3 pb-3 ml-12">
          <button
            disabled={dismissMutation.isPending}
            onClick={(e) => {
              e.preventDefault();
              dismissMutation.mutate();
            }}
            className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground border border-border/50 bg-card px-2.5 py-1 rounded disabled:opacity-50 hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            {dismissMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <EyeOff className="h-3 w-3" />
            )}
            dismiss
          </button>
        </div>
      )}
    </div>
  );
}
