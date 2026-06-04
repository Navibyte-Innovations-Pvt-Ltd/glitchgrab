"use client";

import { useState } from "react";
import { useQueryState, parseAsString, parseAsStringLiteral } from "nuqs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import {
  GitFork,
  Users,
  Mail,
  Loader2,
  Check,
  AlertCircle,
  AlertTriangle,
  Bug,
  TrendingUp,
  CheckCircle2,
  Circle,
  Folder,
  MessageCircle,
  ArrowRight,
  GitPullRequest,
  GitCommitHorizontal,
  RefreshCw,
  Activity,
  Copy,
  ExternalLink,
  SlidersHorizontal,
  Search,
  X,
  Globe,
  UploadCloud,
  Plus,
} from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { ConnectGscDialog } from "@/components/seo/connect-gsc-dialog";
import { ActiveWorkflowsWidget } from "@/app/dashboard/active-workflows-widget";
import { GithubContributions } from "@/app/dashboard/github-contributions";
import type { OrgContext } from "./lib/get-org-context";

// ─── Types ──────────────────────────────────────────────────────────────────

interface MergedMember {
  githubLogin: string;
  avatarUrl: string;
  name: string | null;
  email: string | null;
  role: string | null;
  joined: boolean;
}

interface MembersData {
  members: MergedMember[];
  total: number;
}

interface RepoStat {
  name: string;
  commits: number;
  branches?: string[];
  prs?: number;
}
interface MemberActivity {
  [githubLogin: string]: { commits: number; repos: RepoStat[] };
}

interface OrgStats {
  total: number;
  avgPerDay: number;
  today: number;
  failed: number;
}

interface IssueItem {
  number: number;
  title: string;
  url: string;
  createdAt: string;
  author: string;
  comments: number;
  labels: { name: string; color: string }[];
  repoFullName: string;
  assignees?: { login: string; avatarUrl: string }[];
}

interface DayBucket {
  date: string;
  count: number;
}

interface ClosedData {
  daily: DayBucket[];
  total: number;
  avgPerDay: number;
}

interface GscSummaryItem {
  id: string;
  siteUrl: string;
  indexedCount: number;
  notIndexedCount: number;
  notIndexedPages: Array<{ url: string; reason?: string }> | null;
  lastSyncAt: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < 60 * 60 * 1000) return `${Math.max(1, Math.round(diff / 60000))}m`;
  if (diff < day) return `${Math.round(diff / (60 * 60 * 1000))}h`;
  if (diff < 30 * day) return `${Math.round(diff / day)}d`;
  return new Date(iso).toLocaleDateString();
}

function isHighPriority(labels: { name: string }[]) {
  return labels.some((l) => /p0|p1|critical|urgent|security/i.test(l.name));
}

function repoShortName(fullName: string) {
  return fullName.split("/")[1] ?? fullName;
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

type PillTone = "primary" | "warn" | "danger" | "muted";

function StatCard({
  label,
  value,
  icon,
  pill,
  critical,
  href,
  decimal,
  loading,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  pill: { text: string; tone: PillTone };
  critical?: boolean;
  href?: string;
  decimal?: boolean;
  loading?: boolean;
}) {
  const toneClasses: Record<PillTone, string> = {
    primary: "text-primary bg-primary/10 border-primary/20",
    warn: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    danger: "text-red-400 bg-red-400/10 border-red-400/20",
    muted: "text-muted-foreground bg-muted border-border",
  };

  const card = (
    <Card
      className={cn(
        "relative overflow-hidden transition-colors py-0 rounded-md",
        critical
          ? "bg-red-500/5 border-red-500/30"
          : "hover:border-foreground/30",
      )}
    >
      {critical && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500/60" />
      )}
      <CardContent className="px-3 py-2.5">
        <div className="flex items-start justify-between mb-1">
          <span
            className={cn(
              "text-[10px] font-mono uppercase tracking-[0.15em]",
              critical ? "text-red-400" : "text-muted-foreground",
            )}
          >
            {label}
          </span>
          <span
            className={cn(
              critical ? "text-red-400/70" : "text-muted-foreground/60",
              "[&>svg]:h-3.5 [&>svg]:w-3.5",
            )}
          >
            {icon}
          </span>
        </div>
        {loading ? (
          <div className="flex items-baseline gap-2">
            <Skeleton className="h-8 w-10" />
            <Skeleton className="h-4 w-16" />
          </div>
        ) : (
          <div className="flex items-baseline gap-2 flex-wrap">
            <span
              className={cn(
                "text-2xl font-mono tabular-nums font-medium",
                critical ? "text-red-400" : "text-foreground",
              )}
            >
              {typeof value === "number"
                ? decimal
                  ? value.toFixed(1)
                  : value < 100
                    ? String(value).padStart(2, "0")
                    : value
                : value}
            </span>
            <span
              className={cn(
                "text-[10px] font-mono px-1.5 py-0.5 rounded border",
                toneClasses[pill.tone],
              )}
            >
              {pill.text}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href)
    return (
      <Link href={href} className="block">
        {card}
      </Link>
    );
  return card;
}

// ─── List Panel ───────────────────────────────────────────────────────────────

function ListPanel({
  icon,
  title,
  meta,
  footer,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  meta?: React.ReactNode;
  footer?: { href: string; label: string; external?: boolean };
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
          {icon}
          {title}
        </h2>
        {meta && (
          <span className="text-xs font-mono text-muted-foreground">
            {meta}
          </span>
        )}
      </div>
      <div>{children}</div>
      {footer &&
        (footer.external ? (
          <a
            href={footer.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto text-xs font-mono text-muted-foreground hover:text-primary transition-colors w-max"
          >
            {footer.label} →
          </a>
        ) : (
          <Link
            href={footer.href}
            className="mt-auto text-xs font-mono text-muted-foreground hover:text-primary transition-colors w-max"
          >
            {footer.label} →
          </Link>
        ))}
    </div>
  );
}

// ─── Issue Row ───────────────────────────────────────────────────────────────

function IssueRow({
  issue,
  critical,
}: {
  issue: IssueItem;
  critical: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    void navigator.clipboard.writeText(issue.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <a
      href={issue.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group flex items-center gap-2 rounded px-2 py-1.5 transition-colors border text-xs",
        critical
          ? "bg-red-500/5 border-red-500/15 hover:border-red-500/40"
          : "bg-card/30 border-border/60 hover:border-primary/40 hover:bg-card/60",
      )}
    >
      {critical ? (
        <AlertCircle className="h-3 w-3 text-red-400 shrink-0" />
      ) : (
        <Circle className="h-3 w-3 text-primary/50 shrink-0" />
      )}
      <span className="flex-1 truncate text-foreground/90 group-hover:text-foreground transition-colors">
        {issue.title}
      </span>
      <span className="font-mono text-[10px] text-muted-foreground/50 shrink-0">
        #{issue.number} · {timeAgo(issue.createdAt)}
      </span>
      {issue.comments > 0 && (
        <span className="font-mono text-[10px] text-muted-foreground/50 shrink-0 flex items-center gap-0.5">
          <MessageCircle className="h-2.5 w-2.5" />
          {issue.comments}
        </span>
      )}
      {issue.assignees && issue.assignees.length > 0 ? (
        <div className="flex items-center gap-1 shrink-0">
          {issue.assignees.slice(0, 2).map((a) => (
            <Image
              key={a.login}
              src={`${a.avatarUrl}&s=32`}
              alt={a.login}
              title={`@${a.login}`}
              width={16}
              height={16}
              className="h-4 w-4 rounded-full border border-border/60"
            />
          ))}
          {issue.assignees.length === 1 && (
            <span className="text-[10px] font-mono text-muted-foreground/60 hidden group-hover:inline">
              @{issue.assignees[0].login}
            </span>
          )}
        </div>
      ) : (
        <span className="text-[10px] font-mono text-muted-foreground/30 shrink-0 hidden group-hover:inline">
          unassigned
        </span>
      )}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            copyLink();
          }}
          className="p-1 rounded hover:bg-muted transition-colors"
          title="Copy link"
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-400" />
          ) : (
            <Copy className="h-3 w-3 text-muted-foreground" />
          )}
        </button>
        <span className="p-1 rounded" title="View on GitHub">
          <ExternalLink className="h-3 w-3 text-muted-foreground" />
        </span>
      </div>
    </a>
  );
}

// ─── Repo Filter Popover (header button) ─────────────────────────────────────

const ASSIGN_VIEWS = ["all", "assigned", "unassigned"] as const;
type AssignView = (typeof ASSIGN_VIEWS)[number];

function TriageFilterPopover({
  allRepos,
  selectedRepo,
  onSelect,
  assignView,
  onAssignViewChange,
}: {
  allRepos: [string, IssueItem[]][];
  selectedRepo: string | null;
  onSelect: (repo: string | null) => void;
  assignView: AssignView;
  onAssignViewChange: (v: AssignView) => void;
}) {
  const [search, setSearch] = useState("");

  const filteredRepos = allRepos.filter(([repo]) =>
    repoShortName(repo).toLowerCase().includes(search.toLowerCase()),
  );

  const isFiltered = selectedRepo !== null || assignView !== "assigned";
  const label = selectedRepo
    ? repoShortName(selectedRepo)
    : assignView === "all"
      ? "All issues"
      : assignView === "unassigned"
        ? "Unassigned"
        : "Filter";

  return (
    <Popover>
      <div className="flex items-center">
        <PopoverTrigger
          className={cn(
            "flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 border transition-colors",
            isFiltered
              ? "rounded-l bg-primary/15 border-primary/50 text-primary"
              : "rounded border-border text-muted-foreground hover:border-primary/50 hover:text-primary",
          )}
        >
          <SlidersHorizontal className="h-2.5 w-2.5 shrink-0" />
          {label}
        </PopoverTrigger>
        {isFiltered && (
          <button
            type="button"
            onClick={() => { onSelect(null); onAssignViewChange("all"); }}
            className="flex items-center px-1 py-0.5 rounded-r border border-l-0 bg-primary/15 border-primary/50 text-primary hover:text-destructive hover:border-destructive/40 transition-colors"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        )}
      </div>
      <PopoverContent align="end" side="bottom" className="w-56 p-2 flex flex-col gap-1.5">
        {/* Assign filter */}
        <div className="space-y-1">
          <p className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest px-1">Assignment</p>
          <div className="flex rounded border border-border overflow-hidden">
            {ASSIGN_VIEWS.map((v, i) => (
              <button
                key={v}
                type="button"
                onClick={() => onAssignViewChange(v)}
                className={cn(
                  "flex-1 py-1 text-[10px] font-mono capitalize transition-colors",
                  i > 0 && "border-l border-border",
                  assignView === v ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-1.5 space-y-1">
          <p className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest px-1">Repo</p>
          <div className="flex items-center gap-1.5 border border-border rounded px-2 py-1 bg-background">
            <Search className="h-3 w-3 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search repos…"
              autoFocus
              className="flex-1 bg-transparent text-xs font-mono text-foreground outline-none placeholder:text-muted-foreground/50"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")}>
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => onSelect(null)}
            className={cn(
              "w-full flex items-center justify-between px-2 py-1 rounded text-[11px] font-mono transition-colors",
              !selectedRepo
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span>All repos</span>
            <span className="text-[10px]">{allRepos.reduce((s, [, its]) => s + its.length, 0)}</span>
          </button>

          <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto">
            {filteredRepos.map(([repo, items]) => {
              const isSelected = selectedRepo === repo;
              const hasCritical = items.some((i) => isHighPriority(i.labels));
              return (
                <button
                  key={repo}
                  type="button"
                  onClick={() => onSelect(isSelected ? null : repo)}
                  className={cn(
                    "flex items-center justify-between gap-2 px-2 py-1 rounded text-[11px] font-mono transition-colors",
                    isSelected
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <Folder className="h-2.5 w-2.5 shrink-0" />
                    <span className="truncate">{repoShortName(repo)}</span>
                  </span>
                  <span className={cn("shrink-0 text-[10px]", hasCritical && !isSelected ? "text-red-400" : "")}>
                    {items.length}
                  </span>
                </button>
              );
            })}
            {filteredRepos.length === 0 && (
              <p className="text-[10px] font-mono text-muted-foreground/50 px-2 py-1">No repos match</p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
// ─── Issues Triage Body ───────────────────────────────────────────────────────

function OrgIssuesTriageBody({
  data,
  allCount,
  isLoading,
  selectedRepo,
  onSelect,
  assignView,
}: {
  data: IssueItem[];
  allCount: number;
  isLoading: boolean;
  selectedRepo: string | null;
  onSelect: (repo: string | null) => void;
  assignView: AssignView;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2 rounded px-2 py-1.5 border border-border/40">
            <Skeleton className="h-3 w-3 rounded-full shrink-0" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-2.5 w-12 shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center gap-3 border border-dashed border-border rounded-md px-4 py-4">
        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
        <p className="text-xs font-mono text-muted-foreground">
          {assignView === "assigned"
            ? "No assigned issues."
            : assignView === "unassigned"
              ? "All issues are assigned — great!"
              : "No open issues — all clear."}
        </p>
      </div>
    );
  }

  const grouped = data.reduce<Record<string, IssueItem[]>>((acc, issue) => {
    (acc[issue.repoFullName] ??= []).push(issue);
    return acc;
  }, {});
  const sortedRepos = Object.entries(grouped).sort(([, a], [, b]) => b.length - a.length);
  const top3 = sortedRepos.slice(0, 3);

  return (
    <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
      {/* Summary + quick-filter chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-mono text-muted-foreground/50 mr-1">
          {data.length}{allCount !== data.length ? `/${allCount}` : ""} issues
        </span>
        {top3.map(([repo, items]) => {
          const hasCritical = items.some((i) => isHighPriority(i.labels));
          const isSelected = selectedRepo === repo;
          return (
            <button
              key={repo}
              type="button"
              onClick={() => onSelect(isSelected ? null : repo)}
              className={cn(
                "flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border transition-colors",
                isSelected
                  ? "bg-primary/15 border-primary/50 text-primary"
                  : hasCritical
                    ? "bg-red-500/10 border-red-500/30 text-red-400 hover:border-red-500/60"
                    : "bg-card/60 border-border text-muted-foreground hover:border-primary/50 hover:text-primary",
              )}
            >
              <Folder className="h-2.5 w-2.5 shrink-0" />
              <span>{repoShortName(repo)}</span>
              <span className={cn("font-bold px-0.5", isSelected ? "text-primary" : hasCritical ? "text-red-300" : "text-foreground")}>
                {items.length}
              </span>
            </button>
          );
        })}
        {sortedRepos.length > 3 && !selectedRepo && (
          <span className="text-[10px] font-mono text-muted-foreground/50">+{sortedRepos.length - 3} more</span>
        )}
        {selectedRepo && !top3.some(([r]) => r === selectedRepo) && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border bg-primary/15 border-primary/50 text-primary"
          >
            <Folder className="h-2.5 w-2.5 shrink-0" />
            {repoShortName(selectedRepo)}
            <X className="h-2.5 w-2.5" />
          </button>
        )}
      </div>

      {/* Issue list grouped by repo */}
      <div className="flex flex-col gap-3">
        {sortedRepos.map(([repo, items]) => (
          <div key={repo} className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest">
              <Folder className="h-2.5 w-2.5" />
              <span>{repoShortName(repo)}</span>
              <span className="text-primary/60 ml-auto">{items.length}</span>
            </div>
            <ul className="flex flex-col gap-1">
              {(selectedRepo ? items : items.slice(0, 3)).map((issue) => (
                <li key={`${repo}-${issue.number}`}>
                  <IssueRow issue={issue} critical={isHighPriority(issue.labels)} />
                </li>
              ))}
              {!selectedRepo && items.length > 3 && (
                <li>
                  <button
                    type="button"
                    onClick={() => onSelect(repo)}
                    className="text-[10px] font-mono text-muted-foreground/50 hover:text-primary transition-colors pl-1"
                  >
                    +{items.length - 3} more →
                  </button>
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Issues Triage Section ────────────────────────────────────────────────────

function OrgIssuesTriage({ orgSlug }: { orgSlug: string }) {
  const [assignView, setAssignView] = useQueryState<AssignView>(
    "triageAssign",
    parseAsStringLiteral(ASSIGN_VIEWS).withDefault("assigned"),
  );
  const [selectedRepo, setSelectedRepo] = useQueryState(
    "triageRepo",
    parseAsString.withDefault(""),
  );

  const repoFilter = selectedRepo || null;
  const setRepoFilter = (r: string | null) => void setSelectedRepo(r ?? "");

  const { data, isLoading } = useQuery<IssueItem[]>({
    queryKey: ["org-issues", orgSlug],
    queryFn: async () => {
      const { data } = await axios.get(`/api/v1/orgs/${orgSlug}/issues`);
      return data.data ?? [];
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: 10 * 60_000,
  });

  // Apply local filters
  const filtered = (data ?? []).filter((issue) => {
    if (repoFilter && issue.repoFullName !== repoFilter) return false;
    if (assignView === "assigned") return (issue.assignees?.length ?? 0) > 0;
    if (assignView === "unassigned") return (issue.assignees?.length ?? 0) === 0;
    return true;
  });

  const grouped = (data ?? []).reduce<Record<string, IssueItem[]>>(
    (acc, issue) => {
      (acc[issue.repoFullName] ??= []).push(issue);
      return acc;
    },
    {},
  );
  const sortedRepos = Object.entries(grouped).sort(
    ([, a], [, b]) => b.length - a.length,
  );

  return (
    <ListPanel
      icon={<AlertCircle className="h-4 w-4 text-primary" />}
      title="Priority issues triage"
      meta={
        <TriageFilterPopover
          allRepos={sortedRepos}
          selectedRepo={repoFilter}
          onSelect={setRepoFilter}
          assignView={assignView}
          onAssignViewChange={(v) => void setAssignView(v)}
        />
      }
      footer={{
        href: `https://github.com/orgs/${orgSlug}/repositories`,
        label: "Open on GitHub",
        external: true,
      }}
    >
      <OrgIssuesTriageBody
        data={filtered}
        allCount={data?.length ?? 0}
        isLoading={isLoading}
        selectedRepo={repoFilter}
        onSelect={setRepoFilter}
        assignView={assignView}
      />
    </ListPanel>
  );
}

// ─── Issues Closed Preview ────────────────────────────────────────────────────

const MONTHS_SHORT = [
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
function fmtClosedDate(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

function OrgIssuesClosedPreview({ orgSlug }: { orgSlug: string }) {
  const { data, isLoading } = useQuery<ClosedData>({
    queryKey: ["org-issues-closed", orgSlug, 14],
    queryFn: async () => {
      const { data } = await axios.get(
        `/api/v1/orgs/${orgSlug}/issues-closed?days=14`,
      );
      return data.data;
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });

  const maxCount = data ? Math.max(1, ...data.daily.map((d) => d.count)) : 1;
  const topDays = data
    ? [...data.daily]
        .sort((a, b) => b.count - a.count)
        .filter((d) => d.count > 0)
        .slice(0, 4)
    : [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          Issues closed
        </h2>
        <a
          href={`https://github.com/orgs/${orgSlug}/repositories`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
        >
          GitHub <ArrowRight className="h-3 w-3" />
        </a>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-end gap-0.5 h-28 w-full">
            {[45, 72, 30, 88, 55, 40, 65, 80, 35, 70, 50, 60, 78, 42].map(
              (h, i) => (
                <Skeleton
                  key={i}
                  className="flex-1 rounded-t-xs"
                  style={{ height: `${h}%` }}
                />
              ),
            )}
          </div>
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
      ) : !data || data.total === 0 ? (
        <p className="text-xs font-mono text-muted-foreground py-4 text-center">
          No issues closed in last 14 days
        </p>
      ) : (
        <>
          <div className="flex items-end gap-0.5 h-28 w-full">
            {data.daily.map((bucket) => {
              const heightPct = (bucket.count / maxCount) * 100;
              return (
                <div
                  key={bucket.date}
                  title={`${bucket.count} closed · ${fmtClosedDate(bucket.date)}`}
                  className={cn(
                    "group/mini relative flex-1 min-w-0 rounded-t-xs transition-colors cursor-default",
                    bucket.count === 0
                      ? "bg-muted/40 border border-border/30"
                      : "bg-primary/50 hover:bg-primary",
                  )}
                  style={{
                    height: `${Math.max(bucket.count > 0 ? 8 : 3, heightPct)}%`,
                  }}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground border-b border-border/40 pb-2">
            <span>
              <span className="text-foreground font-medium">{data.total}</span>{" "}
              closed · 14 days
            </span>
            <span>
              avg <span className="text-foreground">{data.avgPerDay}</span>/day
            </span>
          </div>

          {topDays.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                Top days
              </div>
              <ul className="flex flex-col gap-1.5">
                {topDays.map((d) => (
                  <li key={d.date} className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-muted-foreground w-14 shrink-0">
                      {fmtClosedDate(d.date)}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/60"
                        style={{ width: `${(d.count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono text-foreground tabular-nums w-5 text-right shrink-0">
                      {d.count}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      <a
        href={`/dashboard/analytics`}
        className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors w-max mt-auto"
      >
        Full analytics →
      </a>
    </div>
  );
}

// ─── Team Panel ───────────────────────────────────────────────────────────────

function TeamPanel({
  orgSlug,
  isOwner,
}: {
  orgSlug: string;
  isOwner: boolean;
}) {
  const { data: membersData } = useQuery<MembersData>({
    queryKey: ["org-members", orgSlug],
    queryFn: async () => {
      const { data } = await axios.get(`/api/v1/orgs/${orgSlug}/members`);
      return data.data;
    },
    staleTime: 30_000,
  });

  const { data: memberStats } = useQuery<MemberActivity>({
    queryKey: ["org-member-stats", orgSlug],
    queryFn: async () => {
      const { data } = await axios.get(`/api/v1/orgs/${orgSlug}/member-stats`);
      return data.data as MemberActivity;
    },
    staleTime: 2 * 60_000,
    refetchInterval: 5 * 60_000,
  });

  if (!membersData) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-20 rounded-full" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-start gap-2.5 px-2.5 py-2 rounded-lg border border-border/40"
          >
            <Skeleton className="w-8 h-8 rounded-full shrink-0 mt-0.5" />
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-4 w-12 rounded ml-auto" />
              </div>
              <Skeleton className="h-2.5 w-24" />
              <div className="flex gap-1">
                <Skeleton className="h-4 w-16 rounded" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const joined = membersData.members.filter((m) => m.joined);
  const pending = membersData.members.filter((m) => !m.joined);

  return (
    <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
      {joined.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full border border-green-500/30 bg-green-500/10 text-green-400 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              {joined.length} active
            </span>
          </div>
          <ul className="flex flex-col gap-1.5">
            {joined.map((m) => {
              const stats = memberStats?.[m.githubLogin];
              return (
                <li
                  key={m.githubLogin}
                  className="flex items-start gap-2.5 px-2.5 py-2 rounded-lg border border-border/50 bg-card/40 hover:border-border hover:bg-card/60 transition-colors"
                >
                  <div className="relative shrink-0 mt-0.5">
                    {m.avatarUrl ? (
                      <Image
                        src={m.avatarUrl}
                        alt={m.githubLogin}
                        width={32}
                        height={32}
                        className="rounded-full border border-border"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-mono font-bold">
                        {(m.name ?? m.githubLogin).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-400 border-2 border-background" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm font-medium text-foreground truncate flex-1">
                        {m.name ?? m.githubLogin}
                      </span>
                      {m.role && (
                        <span
                          className={cn(
                            "font-mono text-[9px] px-1.5 py-0.5 rounded border uppercase tracking-wide shrink-0",
                            m.role === "OWNER"
                              ? "text-primary border-primary/30 bg-primary/10"
                              : "text-muted-foreground border-border bg-muted",
                          )}
                        >
                          {m.role}
                        </span>
                      )}
                    </div>
                    {stats ? (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1 text-[10px] font-mono text-green-400/80">
                          <GitCommitHorizontal className="h-3 w-3 shrink-0" />
                          <span>
                            {stats.commits} commit{stats.commits !== 1 ? "s" : ""} · 24h
                          </span>
                        </div>
                        <TooltipProvider delay={150}>
                          <div className="flex flex-wrap gap-1">
                            {stats.repos.map((r) => (
                              <Tooltip key={r.name}>
                                <TooltipTrigger
                                  render={
                                    <span className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded border border-border/60 bg-background/50 text-muted-foreground hover:border-primary/40 hover:text-primary/70 cursor-help transition-colors" />
                                  }
                                >
                                  <Folder className="h-2.5 w-2.5 shrink-0" />
                                  <span>{r.name}</span>
                                  <span className="text-foreground/70 tabular-nums ml-0.5">
                                    {r.commits}
                                  </span>
                                  {r.prs ? (
                                    <span className="inline-flex items-center gap-0.5 text-primary/60 ml-0.5">
                                      <GitPullRequest className="h-2 w-2 shrink-0" />
                                      {r.prs}
                                    </span>
                                  ) : null}
                                </TooltipTrigger>
                                <TooltipContent>
                                  {r.branches?.length
                                    ? `branches: ${r.branches.join(", ")}`
                                    : "no branch info"}
                                </TooltipContent>
                              </Tooltip>
                            ))}
                          </div>
                        </TooltipProvider>
                      </div>
                    ) : memberStats !== undefined ? (
                      <div className="text-[10px] font-mono text-muted-foreground/40">
                        no commits · 24h
                      </div>
                    ) : (
                      <Skeleton className="h-2.5 w-36 mt-0.5" />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {pending.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 pb-1">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
              {pending.length} pending
            </span>
          </div>
          <ul className="flex flex-col gap-1.5">
            {pending.slice(0, 4).map((m) => (
              <PendingMemberRow
                key={m.githubLogin}
                member={m}
                orgSlug={orgSlug}
                isOwner={isOwner}
                stats={memberStats?.[m.githubLogin]}
              />
            ))}
            {pending.length > 4 && (
              <li>
                <Link
                  href={`/org/${orgSlug}/members`}
                  className="text-[11px] font-mono text-muted-foreground hover:text-primary transition-colors pl-1"
                >
                  +{pending.length - 4} more →
                </Link>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function PendingMemberRow({
  member,
  orgSlug,
  isOwner,
  stats,
}: {
  member: MergedMember;
  orgSlug: string;
  isOwner: boolean;
  stats?: { commits: number; repos: RepoStat[] };
}) {
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");

  const {
    mutate: sendInvite,
    isPending,
    isSuccess,
  } = useMutation({
    mutationFn: async () => {
      await axios.post(`/api/v1/orgs/${orgSlug}/members/invite`, {
        email: email.trim(),
        githubLogin: member.githubLogin,
      });
    },
    onSuccess: () => {
      toast.success(`Invite sent to ${email}`);
      setShowInvite(false);
      setEmail("");
    },
    onError: () => toast.error("Failed to send invite"),
  });

  return (
    <li className="space-y-1.5">
      <div className="flex items-center gap-2.5 px-1 py-1.5 rounded-md">
        <div className="relative shrink-0">
          {member.avatarUrl ? (
            <Image
              src={member.avatarUrl}
              alt={member.githubLogin}
              width={28}
              height={28}
              className="rounded-full border border-border"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-mono font-bold">
              {member.githubLogin.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-yellow-500 border border-background" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-muted-foreground truncate">
            @{member.githubLogin}
          </div>
          {stats ? (
            <TooltipProvider delay={150}>
              <div className="text-[10px] font-mono text-muted-foreground/60">
                ↑ {stats.commits} commit{stats.commits !== 1 ? "s" : ""} · 24h
                ·{" "}
                {stats.repos
                  .map((r) => (
                    <Tooltip key={r.name}>
                      <TooltipTrigger
                        render={
                          <span className="inline-flex items-center gap-1 underline decoration-dotted underline-offset-2 cursor-help" />
                        }
                      >
                        {r.name} (
                        <span className="inline-flex items-center gap-0.5">
                          <GitCommitHorizontal className="h-2.5 w-2.5 shrink-0" />
                          {r.commits}
                        </span>
                        {r.prs ? (
                          <>
                            <span className="mx-0.5">·</span>
                            <span className="inline-flex items-center gap-0.5 text-primary/70">
                              <GitPullRequest className="h-2.5 w-2.5 shrink-0" />
                              {r.prs}
                            </span>
                          </>
                        ) : null}
                        )
                      </TooltipTrigger>
                      <TooltipContent>
                        {r.branches?.length
                          ? `branches: ${r.branches.join(", ")}`
                          : "no branch info"}
                      </TooltipContent>
                    </Tooltip>
                  ))
                  .reduce(
                    (acc, el, i) => (i === 0 ? [el] : [...acc, ", ", el]),
                    [] as React.ReactNode[],
                  )}
              </div>
            </TooltipProvider>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isOwner && !showInvite && (
            <button
              type="button"
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors uppercase tracking-wide"
            >
              <Mail size={9} />
              Invite
            </button>
          )}
        </div>
      </div>
      {showInvite && (
        <div className="flex items-center gap-2 pl-9">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && email.trim() && sendInvite()}
            placeholder={`${member.githubLogin}@email.com`}
            autoFocus
            className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40"
          />
          <button
            type="button"
            onClick={() => sendInvite()}
            disabled={isPending || !email.trim() || isSuccess}
            className="flex items-center gap-1 px-2 py-1 rounded bg-primary text-background text-xs font-mono font-semibold disabled:opacity-60 hover:bg-primary/90 transition-colors"
          >
            {isPending ? (
              <Loader2 size={10} className="animate-spin" />
            ) : isSuccess ? (
              <Check size={10} />
            ) : (
              <Mail size={10} />
            )}
            Send
          </button>
          <button
            type="button"
            onClick={() => setShowInvite(false)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
          >
            ✕
          </button>
        </div>
      )}
    </li>
  );
}

// ─── PRs / Workflows Tab Panel ────────────────────────────────────────────────

interface PullRequestItem {
  number: number;
  title: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  draft: boolean;
  author: string;
  authorAvatar: string | null;
  headRef: string;
  baseRef: string;
  labels: { name: string; color: string }[];
  reviewers: string[];
  repoFullName: string;
  checks?: {
    state: "passed" | "failed" | "pending" | "none";
    passed: number;
    failed: number;
    total: number;
  };
}

type PanelTab = "prs" | "workflows";
const TAB_STORAGE_KEY = "org-panel-tab";

function OrgPRsOrWorkflowsPanel({ orgSlug }: { orgSlug: string }) {
  const [tab, setTab] = useState<PanelTab>(() => {
    if (typeof window === "undefined") return "prs";
    return (localStorage.getItem(TAB_STORAGE_KEY) as PanelTab) ?? "prs";
  });

  const switchTab = (t: PanelTab) => {
    setTab(t);
    localStorage.setItem(TAB_STORAGE_KEY, t);
  };

  const {
    data: prs,
    isLoading: prsLoading,
    isFetching: prsFetching,
    refetch: refetchPRs,
  } = useQuery<PullRequestItem[]>({
    queryKey: ["org-pull-requests", orgSlug],
    queryFn: async () => {
      const { data } = await axios.get(`/api/v1/orgs/${orgSlug}/pull-requests`);
      return data.data ?? [];
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: 10 * 60_000,
  });

  return (
    <section className="flex flex-col gap-3 h-full min-h-0 flex-1">
      {/* Tab bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {(["prs", "workflows"] as PanelTab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => switchTab(t)}
              className={cn(
                "flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.12em] px-2 py-1 rounded transition-colors border",
                tab === t
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "text-muted-foreground hover:text-foreground border-transparent",
              )}
            >
              {t === "prs" ? (
                <GitPullRequest className="h-3 w-3 shrink-0" />
              ) : (
                <Activity className="h-3 w-3 shrink-0" />
              )}
              {t === "prs" ? "Open PRs" : "Workflows"}
              {t === "prs" && !prsLoading && prs !== undefined && (
                <span
                  className={cn(
                    "text-[9px] px-1 rounded",
                    tab === "prs"
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {prs.length}
                </span>
              )}
            </button>
          ))}
        </div>
        {tab === "prs" && (
          <button
            type="button"
            onClick={() => void refetchPRs()}
            disabled={prsFetching}
            className="text-muted-foreground/60 hover:text-muted-foreground transition-colors disabled:opacity-40"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${prsFetching ? "animate-spin" : ""}`}
            />
          </button>
        )}
      </div>

      {/* Content */}
      {tab === "workflows" ? (
        <ActiveWorkflowsWidget
          apiPath={`/api/v1/orgs/${orgSlug}/workflow-runs`}
          queryKey={["org-workflow-runs", orgSlug]}
        />
      ) : prsLoading ? (
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-md border border-border/40 px-2.5 py-1.5"
            >
              <Skeleton className="h-5 w-5 rounded shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <Skeleton className="h-2.5 w-full" />
                <Skeleton className="h-2 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : !prs || prs.length === 0 ? (
        <div className="flex items-center gap-3 border border-dashed border-border rounded-md px-3 py-4">
          <GitPullRequest className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-xs font-mono text-muted-foreground">
            No open PRs — all clear.
          </p>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-1 max-h-60 overflow-y-auto pr-1 flex-1 min-h-0">
            {prs.map((pr) => (
              <li key={`${pr.repoFullName}:${pr.number}`}>
                <a
                  href={pr.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-2.5 rounded-md border border-border bg-card/40 px-2.5 py-2 hover:border-foreground/30 hover:bg-card transition-colors"
                >
                  <span
                    className={cn(
                      "inline-flex items-center justify-center h-6 w-6 rounded shrink-0 border mt-0.5",
                      pr.draft
                        ? "bg-muted/40 border-border/50 text-muted-foreground"
                        : "bg-primary/10 border-primary/30 text-primary",
                    )}
                  >
                    <GitPullRequest className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {pr.title}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0 tabular-nums">
                        {timeAgo(pr.updatedAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono text-muted-foreground truncate">
                        {repoShortName(pr.repoFullName)} #{pr.number}
                      </span>
                      {pr.draft && (
                        <span className="text-[9px] font-mono px-1 py-0 rounded border border-border text-muted-foreground/60 uppercase tracking-wide">
                          draft
                        </span>
                      )}
                      {pr.checks && pr.checks.state !== "none" && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-0.5 text-[9px] font-mono px-1 py-0 rounded border uppercase tracking-wide",
                            pr.checks.state === "passed" &&
                              "border-green-500/30 bg-green-500/10 text-green-500",
                            pr.checks.state === "failed" &&
                              "border-red-500/30 bg-red-500/10 text-red-500",
                            pr.checks.state === "pending" &&
                              "border-yellow-500/30 bg-yellow-500/10 text-yellow-500",
                          )}
                          title={`${pr.checks.passed}/${pr.checks.total} checks passed${pr.checks.failed ? `, ${pr.checks.failed} failed` : ""}`}
                        >
                          {pr.checks.state === "passed" && "✓ checks"}
                          {pr.checks.state === "failed" &&
                            `✕ ${pr.checks.failed} failed`}
                          {pr.checks.state === "pending" && "● running"}
                        </span>
                      )}
                      {pr.labels.slice(0, 2).map((l) => (
                        <span
                          key={l.name}
                          className="text-[9px] font-mono px-1 py-0 rounded border uppercase tracking-wide"
                          style={{
                            borderColor: `#${l.color}40`,
                            color: `#${l.color}`,
                            backgroundColor: `#${l.color}15`,
                          }}
                        >
                          {l.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
          <a
            href={`https://github.com/orgs/${orgSlug}/repositories`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors w-max mt-auto"
          >
            Open on GitHub →
          </a>
        </>
      )}
    </section>
  );
}

// ─── SEO Panel ────────────────────────────────────────────────────────────────

function getSiteDomainSmall(siteUrl: string): string {
  if (siteUrl.startsWith("sc-domain:"))
    return siteUrl.replace("sc-domain:", "");
  try {
    return new URL(siteUrl).hostname;
  } catch {
    return siteUrl;
  }
}

function SiteFaviconSmall({ siteUrl }: { siteUrl: string }) {
  const [failed, setFailed] = useState(false);
  const domain = getSiteDomainSmall(siteUrl);
  if (failed)
    return <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/v1/gsc/favicon?domain=${encodeURIComponent(domain)}&size=32`}
      alt=""
      width={14}
      height={14}
      className="shrink-0 rounded-sm"
      onError={() => setFailed(true)}
    />
  );
}

function buildHealthPrompt(
  siteUrl: string,
  faviconIssues: { status: string; text: string }[],
  ogIssues: { severity: string; field: string; message: string }[],
): string | null {
  if (faviconIssues.length === 0 && ogIssues.length === 0) return null;
  const parts: string[] = [
    `Fix the favicon and OG metadata issues for ${siteUrl}.`,
  ];
  if (faviconIssues.length > 0) {
    parts.push(
      `\nFavicon issues (${faviconIssues.length}):\n${faviconIssues.map((i) => `- [${i.status}] ${i.text}`).join("\n")}`,
    );
    parts.push(
      `\nGenerate all missing favicon files: ICO, PNG (16×16, 32×32, 96×96, 180×180), SVG, and web manifest. Add correct <link> tags in <head>.`,
    );
  }
  if (ogIssues.length > 0) {
    parts.push(
      `\nOG / social metadata issues (${ogIssues.length}):\n${ogIssues.map((i) => `- [${i.severity.toUpperCase()}] ${i.field}: ${i.message}`).join("\n")}`,
    );
    parts.push(
      `\nFix all OG meta tags in <head>. Ensure og:title (≤60 chars), og:description (≤160 chars), og:image (1200×630px, <300KB), og:url, twitter:card="summary_large_image".`,
    );
  }
  return parts.join("\n");
}

function SeoPropertyRow({
  property,
  orgSlug,
}: {
  property: GscSummaryItem;
  orgSlug: string;
}) {
  const queryClient = useQueryClient();
  const [copiedIssues, setCopiedIssues] = useState(false);
  const [copiedHealth, setCopiedHealth] = useState(false);

  const domain = getSiteDomainSmall(property.siteUrl);
  const total = property.indexedCount + property.notIndexedCount;
  const pct =
    total > 0 ? Math.round((property.indexedCount / total) * 100) : null;
  const notSynced = !property.lastSyncAt;
  const displayDomain = property.siteUrl
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .replace(/^sc-domain:/, "");

  const { data: healthData, isFetching: isHealthFetching } = useQuery({
    queryKey: ["seo-health", domain],
    queryFn: async () => {
      const [faviconRes, ogRes] = await Promise.allSettled([
        axios.get(
          `/api/v1/gsc/favicon-check?domain=${encodeURIComponent(domain)}`,
        ),
        axios.get(`/api/v1/gsc/og-check?domain=${encodeURIComponent(domain)}`),
      ]);
      const faviconIssues: { status: string; text: string }[] =
        faviconRes.status === "fulfilled" && faviconRes.value.data.success
          ? faviconRes.value.data.data.issues
          : [];
      const ogIssues: { severity: string; field: string; message: string }[] =
        ogRes.status === "fulfilled" && ogRes.value.data.success
          ? ogRes.value.data.data.issues
          : [];
      return {
        faviconIssues,
        ogIssues,
        prompt: buildHealthPrompt(property.siteUrl, faviconIssues, ogIssues),
      };
    },
    staleTime: 5 * 60_000,
    retry: false,
    enabled: !notSynced,
  });

  const { mutate: reindex, isPending: isReindexing } = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post("/api/v1/gsc/reindex", {
        propertyId: property.id,
      });
      if (!data.success) throw new Error(data.error ?? "Reindex failed");
      return data.data as { submitted: number };
    },
    onSuccess: (result) =>
      toast.success(`Submitted ${result.submitted} URLs for re-indexing`),
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Reindex failed"),
  });

  const { mutate: syncNow, isPending: isSyncing } = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post(
        `/api/v1/gsc/properties/${property.id}/sync`,
      );
      if (!data.success) throw new Error(data.error ?? "Sync failed");
      return data.data as {
        synced: number;
        indexed: number;
        notIndexed: number;
        noSitemap?: boolean;
      };
    },
    onSuccess: (result) => {
      if (result.noSitemap) {
        toast.warning("No sitemap found for this property");
      } else {
        toast.success(
          `Synced ${result.synced} URLs — ${result.indexed} indexed, ${result.notIndexed} not indexed`,
        );
      }
      queryClient.invalidateQueries({ queryKey: ["gsc-properties"] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Sync failed"),
  });

  const copyIssuesPrompt = () => {
    const pages = property.notIndexedPages ?? [];
    const grouped = new Map<string, string[]>();
    for (const p of pages) {
      const reason = p.reason?.trim() || "Unknown reason";
      const list = grouped.get(reason) ?? [];
      list.push(p.url);
      grouped.set(reason, list);
    }
    const sections = Array.from(grouped.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .map(([reason, urls]) => {
        const list = urls.map((u) => `- ${u}`).join("\n");
        return `## ${reason} (${urls.length})\n${list}`;
      })
      .join("\n\n");

    const prompt = `Fix Google Search Console indexing issues for ${property.siteUrl}.

${property.notIndexedCount} page${property.notIndexedCount !== 1 ? "s are" : " is"} not indexed. Fix the root cause in the codebase for each URL below.

${sections || "(No cached URLs — run Sync now first.)"}

For every URL above:
1. Open the page locally and confirm it renders with status 200.
2. Inspect <head>: no noindex meta, correct canonical, valid hreflang.
3. Confirm the URL is in sitemap.xml and reachable via internal links.
4. Check robots.txt does not disallow it.
5. For redirects/canonical mismatches, fix so the canonical URL is the indexed one.
6. After fixing, request re-indexing in GSC URL Inspection.`;

    navigator.clipboard.writeText(prompt).then(() => {
      setCopiedIssues(true);
      setTimeout(() => setCopiedIssues(false), 2000);
    });
  };

  const copyHealthPrompt = () => {
    if (!healthData?.prompt) return;
    navigator.clipboard.writeText(healthData.prompt).then(() => {
      setCopiedHealth(true);
      setTimeout(() => setCopiedHealth(false), 2000);
    });
  };

  return (
    <div className="relative rounded-md border border-border/60 bg-card/30 overflow-hidden shrink-0">
      {isSyncing && <span aria-hidden className="sync-progress-bar" />}
      <Link
        href={`/org/${orgSlug}/seo/${property.id}`}
        className="group flex items-center gap-3 px-3 py-2 hover:bg-card/60 transition-colors"
      >
        <SiteFaviconSmall siteUrl={property.siteUrl} />
        <span className="flex-1 min-w-0 font-mono text-[11px] text-foreground/90 truncate group-hover:text-foreground transition-colors">
          {displayDomain}
        </span>
        {notSynced ? (
          <span className="font-mono text-[10px] text-muted-foreground shrink-0">
            not synced
          </span>
        ) : total === 0 ? (
          <span className="font-mono text-[10px] text-muted-foreground shrink-0">
            no data
          </span>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-[10px] text-green-400">
              {property.indexedCount} indexed
            </span>
            {property.notIndexedCount > 0 && (
              <span className="font-mono text-[10px] text-red-400">
                {property.notIndexedCount} issues
              </span>
            )}
            {pct !== null && (
              <span
                className={cn(
                  "text-[10px] font-mono px-1.5 py-0.5 rounded border",
                  pct === 100
                    ? "text-green-400 bg-green-400/10 border-green-400/20"
                    : pct >= 80
                      ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/20"
                      : "text-red-400 bg-red-400/10 border-red-400/20",
                )}
              >
                {pct}%
              </span>
            )}
          </div>
        )}
      </Link>

      <div className="flex items-center gap-1.5 px-3 py-1.5 border-t border-border/40 bg-background/20 flex-wrap">
        {notSynced || isSyncing ? (
          <button
            type="button"
            onClick={() => syncNow()}
            disabled={isSyncing}
            title={
              notSynced ? "Sync GSC data for this property" : "Re-sync GSC data"
            }
            className={cn(
              "inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded border transition-colors",
              isSyncing
                ? "opacity-60 cursor-not-allowed border-border text-muted-foreground"
                : "border-primary/40 text-primary hover:bg-primary/10",
            )}
          >
            {isSyncing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            {isSyncing ? "Syncing…" : "Sync now"}
          </button>
        ) : isReindexing ? (
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded border opacity-60 cursor-not-allowed border-border text-muted-foreground"
          >
            <Loader2 className="h-3 w-3 animate-spin" />
            Submitting…
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={copyIssuesPrompt}
              disabled={property.notIndexedCount === 0}
              title="Copy prompt to fix not-indexed pages"
              className={cn(
                "inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded border transition-colors",
                property.notIndexedCount === 0
                  ? "opacity-40 cursor-not-allowed border-border text-muted-foreground"
                  : copiedIssues
                    ? "border-green-500/40 text-green-400 bg-green-500/10"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5",
              )}
            >
              {copiedIssues ? (
                <Check className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              {copiedIssues ? "Copied!" : "Page issues"}
            </button>

            {isHealthFetching ? (
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded border border-border text-muted-foreground opacity-60">
                <Loader2 className="h-3 w-3 animate-spin" />
                Checking…
              </span>
            ) : healthData && !healthData.prompt ? (
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded border border-green-500/30 text-green-400 bg-green-500/10">
                <CheckCircle2 className="h-3 w-3" />
                Health OK
              </span>
            ) : healthData?.prompt ? (
              <button
                type="button"
                onClick={copyHealthPrompt}
                title="Copy favicon & OG fix prompt"
                className={cn(
                  "inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded border transition-colors",
                  copiedHealth
                    ? "border-green-500/40 text-green-400 bg-green-500/10"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5",
                )}
              >
                {copiedHealth ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                {copiedHealth ? "Copied!" : "Favicon/OG"}
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => reindex()}
              disabled={property.notIndexedCount === 0}
              title="Submit not-indexed pages for re-crawling"
              className={cn(
                "inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded border transition-colors",
                property.notIndexedCount === 0
                  ? "opacity-40 cursor-not-allowed border-border text-muted-foreground"
                  : "border-amber-500/40 text-amber-400 hover:bg-amber-500/10",
              )}
            >
              <UploadCloud className="h-3 w-3" />
              Reindex
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function OrgSeoPanel({ orgSlug }: { orgSlug: string }) {
  const [connectOpen, setConnectOpen] = useState(false);
  const { data: properties, isLoading } = useQuery<GscSummaryItem[]>({
    queryKey: ["gsc-properties"],
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/gsc/properties");
      return data.data ?? [];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            SEO indexing
          </h2>
        </div>
        <div className="flex flex-col gap-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="flex flex-col rounded-md border border-border/40 overflow-hidden"
            >
              <div className="flex items-center gap-3 px-3 py-2">
                <Skeleton className="h-3.5 w-3.5 rounded shrink-0" />
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-3 w-20 shrink-0" />
              </div>
              <div className="flex gap-1.5 px-3 py-1.5 border-t border-border/40">
                <Skeleton className="h-5 w-20 rounded" />
                <Skeleton className="h-5 w-20 rounded" />
                <Skeleton className="h-5 w-16 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!properties || properties.length === 0) {
    return (
      <>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            SEO indexing
          </h2>
        </div>
        <div className="flex items-center gap-3 border border-dashed border-border rounded-md px-4 py-4">
          <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-xs font-mono text-muted-foreground">
            No GSC properties connected.
          </p>
          <button
            type="button"
            onClick={() => setConnectOpen(true)}
            className="text-xs font-mono text-primary hover:underline ml-auto shrink-0"
          >
            Connect →
          </button>
        </div>
      </div>
      <ConnectGscDialog open={connectOpen} onOpenChange={setConnectOpen} />
      </>
    );
  }

  return (
    <>
    <div className="flex flex-col gap-3 h-full min-h-0">
      <div className="flex items-center justify-between border-b border-border pb-2 shrink-0">
        <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          SEO indexing
          <span className="text-[10px] font-mono text-muted-foreground">
            {properties.length}{" "}
            {properties.length === 1 ? "property" : "properties"}
          </span>
        </h2>
        <button
          type="button"
          onClick={() => setConnectOpen(true)}
          title="Connect new GSC property"
          className="inline-flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-primary transition-colors"
        >
          <Plus className="h-3 w-3" />
          Connect
        </button>
      </div>

      <div className="flex flex-col gap-2 flex-1 min-h-0 max-h-90 overflow-y-auto pr-1 -mr-1">
        {properties.map((p) => (
          <SeoPropertyRow key={p.id} property={p} orgSlug={orgSlug} />
        ))}
      </div>

      <Link
        href={`/org/${orgSlug}/seo`}
        className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors w-max shrink-0"
      >
        SEO details →
      </Link>
    </div>
    <ConnectGscDialog open={connectOpen} onOpenChange={setConnectOpen} />
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OrgOverview({ ctx }: { ctx: OrgContext }) {
  const { data: stats } = useQuery<OrgStats>({
    queryKey: ["org-stats", ctx.orgSlug],
    queryFn: async () => {
      const { data } = await axios.get(`/api/v1/orgs/${ctx.orgSlug}/stats`);
      return data.data;
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: 10 * 60_000,
  });

  const { data: issues } = useQuery<IssueItem[]>({
    queryKey: ["org-issues", ctx.orgSlug],
    queryFn: async () => {
      const { data } = await axios.get(`/api/v1/orgs/${ctx.orgSlug}/issues`);
      return data.data ?? [];
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: 10 * 60_000,
  });

  const { data: membersData } = useQuery<MembersData>({
    queryKey: ["org-members", ctx.orgSlug],
    queryFn: async () => {
      const { data } = await axios.get(`/api/v1/orgs/${ctx.orgSlug}/members`);
      return data.data;
    },
    staleTime: 30_000,
  });

  const { data: closedData } = useQuery<ClosedData>({
    queryKey: ["org-issues-closed", ctx.orgSlug, 14],
    queryFn: async () => {
      const { data } = await axios.get(
        `/api/v1/orgs/${ctx.orgSlug}/issues-closed?days=14`,
      );
      return data.data;
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });

  const { data: contribData } = useQuery<{ total: number; orgSlug: string }>({
    queryKey: ["org-contributions", ctx.orgSlug],
    queryFn: async () => {
      const { data } = await axios.get(
        `/api/v1/orgs/${ctx.orgSlug}/contributions`,
      );
      return data.data;
    },
    staleTime: 10 * 60_000,
  });

  const { data: gscProperties } = useQuery<GscSummaryItem[]>({
    queryKey: ["gsc-properties"],
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/gsc/properties");
      return data.data ?? [];
    },
    staleTime: 60_000,
    enabled: ctx.role === "OWNER",
  });

  const repoCount = ctx.repos.length;
  const memberCount = membersData?.total ?? "—";
  const openIssues = issues?.length ?? 0;
  const totalIndexed =
    gscProperties?.reduce((s, p) => s + p.indexedCount, 0) ?? 0;
  const totalNotIndexed =
    gscProperties?.reduce((s, p) => s + p.notIndexedCount, 0) ?? 0;
  const totalGscPages = totalIndexed + totalNotIndexed;
  const indexedPct =
    totalGscPages > 0 ? Math.round((totalIndexed / totalGscPages) * 100) : null;

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {/* Stats grid + active workflows */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-4 items-stretch">
        <section className="grid grid-cols-2 md:grid-cols-3 gap-2.5 lg:col-span-2 auto-rows-min">
          <StatCard
            label="Repos"
            value={repoCount}
            icon={<GitFork className="h-4 w-4" />}
            pill={{ text: "Connected", tone: "muted" }}
            href={`/org/${ctx.orgSlug}/repos`}
          />
          <StatCard
            label="Members"
            value={typeof memberCount === "number" ? memberCount : 0}
            icon={<Users className="h-4 w-4" />}
            pill={{
              text: `${membersData?.members.filter((m) => m.joined).length ?? 0} joined`,
              tone: "primary",
            }}
            href={`/org/${ctx.orgSlug}/members`}
            loading={!membersData}
          />
          <StatCard
            label="Open issues"
            value={openIssues}
            icon={<AlertCircle className="h-4 w-4" />}
            pill={
              openIssues > 0
                ? { text: "Triage", tone: "primary" }
                : { text: "Clear", tone: "muted" }
            }
            loading={!issues}
          />
          <StatCard
            label="New reports today"
            value={stats?.today ?? 0}
            icon={<Bug className="h-4 w-4" />}
            pill={{ text: `avg ${stats?.avgPerDay ?? 0}/day`, tone: "muted" }}
            href={`/org/${ctx.orgSlug}/reports`}
            loading={!stats}
          />
          <StatCard
            label="Failed retries"
            value={stats?.failed ?? 0}
            icon={<AlertTriangle className="h-4 w-4" />}
            critical={(stats?.failed ?? 0) > 0}
            pill={
              (stats?.failed ?? 0) > 0
                ? { text: "Manual override", tone: "danger" }
                : { text: "None", tone: "muted" }
            }
            href={
              (stats?.failed ?? 0) > 0
                ? `/org/${ctx.orgSlug}/reports`
                : undefined
            }
            loading={!stats}
          />
          <StatCard
            label="Avg closed / day"
            value={closedData?.avgPerDay ?? 0}
            icon={<TrendingUp className="h-4 w-4" />}
            pill={{ text: "14-day avg", tone: "muted" }}
            decimal
            loading={!closedData}
          />
          {ctx.role === "OWNER" && (
            <StatCard
              label="Indexed pages"
              value={
                gscProperties === undefined
                  ? 0
                  : totalGscPages === 0
                    ? "—"
                    : totalIndexed
              }
              icon={<Globe className="h-4 w-4" />}
              pill={
                indexedPct === null
                  ? { text: "No data", tone: "muted" }
                  : totalNotIndexed > 0
                    ? { text: `${totalNotIndexed} issues`, tone: "warn" }
                    : { text: "All indexed", tone: "primary" }
              }
              critical={
                totalNotIndexed > 0 && indexedPct !== null && indexedPct < 80
              }
              href={`/org/${ctx.orgSlug}/seo`}
              loading={ctx.role === "OWNER" && gscProperties === undefined}
            />
          )}
        </section>

        {/* Open PRs → fallback to active workflows */}
        <Card className="lg:col-span-1 flex flex-col py-0 rounded-md">
          <CardContent className="px-3 py-2.5 flex-1 flex flex-col min-h-0">
            <OrgPRsOrWorkflowsPanel orgSlug={ctx.orgSlug} />
          </CardContent>
        </Card>
      </div>

      {/* Three-column action lists */}
      <div
        className={cn(
          "grid grid-cols-1 gap-4 md:gap-6",
          ctx.role === "OWNER"
            ? "lg:grid-cols-2 xl:grid-cols-4"
            : "lg:grid-cols-3",
        )}
      >
        <ListPanel
          icon={<Users className="h-4 w-4 text-primary" />}
          title="Team"
          meta={`${membersData?.members.filter((m) => m.joined).length ?? 0}/${membersData?.total ?? 0} joined`}
          footer={{
            href: `/org/${ctx.orgSlug}/members`,
            label: "Manage members",
          }}
        >
          <TeamPanel orgSlug={ctx.orgSlug} isOwner={ctx.role === "OWNER"} />
        </ListPanel>

        <OrgIssuesTriage orgSlug={ctx.orgSlug} />

        <OrgIssuesClosedPreview orgSlug={ctx.orgSlug} />

        {ctx.role === "OWNER" && <OrgSeoPanel orgSlug={ctx.orgSlug} />}
      </div>

      {/* Org-wide contributions heatmap */}
      <Card className="relative overflow-hidden py-0 rounded-md">
        <div
          aria-hidden
          className="absolute inset-0 z-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <CardContent className="relative z-10 px-5 py-4 space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-sm font-medium text-foreground">
                {ctx.orgName} contributions
              </h2>
              <p className="text-xs font-mono text-muted-foreground mt-0.5">
                {contribData?.total?.toLocaleString() ?? "—"} combined commits ·
                last 12 months · all repos
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
              <span>Less</span>
              <span className="h-3 w-3 rounded-xs bg-muted border border-border" />
              <span className="h-3 w-3 rounded-xs bg-primary/25 border border-primary/30" />
              <span className="h-3 w-3 rounded-xs bg-primary/50 border border-primary/60" />
              <span className="h-3 w-3 rounded-xs bg-primary/75 border border-primary/80" />
              <span className="h-3 w-3 rounded-xs bg-primary border border-foreground/30" />
              <span>More</span>
            </div>
          </div>
          <GithubContributions
            apiPath={`/api/v1/orgs/${ctx.orgSlug}/contributions`}
            queryKey={["org-contributions", ctx.orgSlug]}
            emptyMessage="No commit activity yet — GitHub stats may still be computing. Refresh in a moment."
          />
        </CardContent>
      </Card>

      {/* Footer strip */}
      <div className="hidden md:flex items-center justify-between text-[11px] font-mono text-muted-foreground border-t border-border pt-4">
        <span>
          {ctx.orgSlug} · {ctx.orgName}
        </span>
        <Link
          href={`/org/${ctx.orgSlug}/chat`}
          className="hover:text-primary transition-colors"
        >
          ⌘ K to open chat
        </Link>
      </div>
    </div>
  );
}
