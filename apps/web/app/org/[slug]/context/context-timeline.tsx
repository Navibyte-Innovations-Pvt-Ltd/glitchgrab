"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  Brain,
  ClipboardList,
  FlaskConical,
  Loader2,
  NotebookPen,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PasteNotesDialog } from "./paste-notes-dialog";

interface ContextItem {
  id: string;
  repoId: string;
  repoFullName: string;
  kind: "DECISION" | "REQUEST" | "COMPLAINT" | "COMMITMENT" | "FACT";
  text: string;
  sourceType: "MEETING" | "REPORT" | "CAPTURE" | "QA" | "MANUAL";
  sourceId: string | null;
  occurredAt: string;
  confidence: number;
  createdAt: string;
}

interface ContextRepo {
  id: string;
  fullName: string;
  owner: string;
  name: string;
  isOwner: boolean;
  itemCount: number;
  pendingSources: number;
}

/** Below this, filters are clutter — the whole list fits on screen. */
const FILTER_THRESHOLD = 10;

const KIND_STYLES: Record<ContextItem["kind"], string> = {
  DECISION: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
  REQUEST: "border-sky-500/40 text-sky-400 bg-sky-500/10",
  COMPLAINT: "border-red-500/40 text-red-400 bg-red-500/10",
  COMMITMENT: "border-amber-500/40 text-amber-400 bg-amber-500/10",
  FACT: "border-border text-muted-foreground bg-muted/40",
};

const SOURCE_ICONS: Record<ContextItem["sourceType"], typeof ClipboardList> = {
  REPORT: ClipboardList,
  QA: FlaskConical,
  MANUAL: NotebookPen,
  MEETING: Brain,
  CAPTURE: Brain,
};

const SOURCE_LABELS: Record<ContextItem["sourceType"], string> = {
  REPORT: "bug report",
  QA: "qa check",
  MANUAL: "pasted notes",
  MEETING: "client call",
  CAPTURE: "capture",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ContextTimeline({ orgSlug }: { orgSlug: string }) {
  const queryClient = useQueryClient();
  const [repoFilter, setRepoFilter] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<ContextItem["kind"] | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  /** Row whose delete is armed — removing memory is irreversible, so two clicks. */
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const {
    data: repos = [],
    isLoading: reposLoading,
    error: reposError,
  } = useQuery<ContextRepo[]>({
    queryKey: ["project-context", "repos"],
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/project-context?repos=1");
      return data.data ?? [];
    },
  });

  const {
    data: items = [],
    isLoading,
    error: itemsError,
  } = useQuery<ContextItem[]>({
    queryKey: ["project-context", "items"],
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/project-context");
      return data.data ?? [];
    },
  });

  const distillMutation = useMutation({
    mutationFn: async (repoId: string) => {
      const { data } = await axios.post("/api/v1/project-context/distill", {
        repoId,
        mode: "backfill",
      });
      return data.data as {
        itemsCreated: number;
        sourcesAttempted: number;
        failures: number;
        remaining: number;
      };
    },
    onSuccess: (result) => {
      // Both keys move: new items land in the timeline AND the repo's pending
      // count drops, which is what the button label reads from.
      queryClient.invalidateQueries({ queryKey: ["project-context"] });
      if (result.itemsCreated === 0) {
        toast.info("Nothing durable in those sources");
      } else {
        toast.success(
          `${result.itemsCreated} item${result.itemsCreated === 1 ? "" : "s"} added` +
            (result.remaining > 0 ? ` · ${result.remaining} sources left` : "")
        );
      }
      if (result.failures > 0) {
        toast.warning(`${result.failures} source${result.failures === 1 ? "" : "s"} failed`);
      }
    },
    onError: (err) => {
      const message =
        axios.isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : "Could not distill";
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/v1/project-context/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-context"] });
      toast.success("Removed");
    },
    onError: () => toast.error("Could not remove item"),
    onSettled: () => setConfirmDeleteId(null),
  });

  const distillingRepoId = distillMutation.isPending ? distillMutation.variables : null;
  const deletingId = deleteMutation.isPending ? deleteMutation.variables : null;

  const pendingTotal = useMemo(
    () => repos.reduce((sum, r) => sum + r.pendingSources, 0),
    [repos]
  );

  const filtered = useMemo(() => {
    let list = items;
    if (repoFilter) list = list.filter((i) => i.repoId === repoFilter);
    if (kindFilter) list = list.filter((i) => i.kind === kindFilter);
    return list;
  }, [items, repoFilter, kindFilter]);

  const showFilters = items.length > FILTER_THRESHOLD;

  if (isLoading || reposLoading) {
    return (
      <div className="flex items-center gap-2 py-12 font-mono text-[11px] text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        loading project memory…
      </div>
    );
  }

  // A failed request is NOT an empty account. Saying "no projects yet" to
  // someone with a dozen connected repos sends them off to fix the wrong thing
  // — most often the DB migration simply hasn't been applied yet.
  if (reposError || itemsError) {
    return (
      <div className="border border-red-500/30 bg-red-500/5 rounded p-8 text-center space-y-2">
        <Brain className="w-6 h-6 mx-auto text-red-400/60" />
        <p className="font-mono text-[11px] text-red-400">
          Could not load project context.
        </p>
        <p className="font-mono text-[11px] text-muted-foreground">
          If this is a fresh deploy, the context tables may not exist yet — run{" "}
          <code className="text-foreground">bun run db:deploy</code>.
        </p>
      </div>
    );
  }

  if (repos.length === 0) {
    return (
      <div className="border border-border rounded p-8 text-center space-y-2">
        <Brain className="w-6 h-6 mx-auto text-muted-foreground/50" />
        <p className="font-mono text-[11px] text-muted-foreground">
          No projects you can store context against.
        </p>
        <p className="font-mono text-[11px] text-muted-foreground/70">
          Context is per repo, and only the repo&apos;s owner — or someone granted
          access on the Members page — can see it. Being in this org is not enough.
        </p>
        <a
          href={`/org/${orgSlug}/repos`}
          className="inline-block font-mono text-[11px] text-primary hover:underline"
        >
          view repos →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions — paste notes proves the value with zero prior data; backfill
          reads what the repo already collected. */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPasteOpen(true)}
          className="inline-flex items-center gap-2 font-mono text-[11px] px-3 py-2 rounded border border-border hover:border-primary/50 hover:bg-muted"
        >
          <NotebookPen className="w-3.5 h-3.5" />
          Paste call notes
        </button>

        {repos
          .filter((r) => r.pendingSources > 0)
          .map((repo) => (
            <button
              key={repo.id}
              type="button"
              disabled={distillMutation.isPending}
              onClick={() => distillMutation.mutate(repo.id)}
              className="inline-flex items-center gap-2 font-mono text-[11px] px-3 py-2 rounded border border-border hover:border-primary/50 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {distillingRepoId === repo.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {distillingRepoId === repo.id
                ? "Distilling…"
                : `Distill ${repo.pendingSources} from ${repo.name}`}
            </button>
          ))}
      </div>

      {items.length === 0 && (
        <div className="border border-border rounded p-8 text-center space-y-2">
          <Brain className="w-6 h-6 mx-auto text-muted-foreground/50" />
          <p className="font-mono text-[11px] text-muted-foreground">
            No project memory yet.
          </p>
          <p className="font-mono text-[11px] text-muted-foreground/70">
            {pendingTotal > 0
              ? `${pendingTotal} report${pendingTotal === 1 ? "" : "s"} and QA check${pendingTotal === 1 ? "" : "s"} are waiting to be distilled.`
              : "Paste call notes to get started."}
          </p>
        </div>
      )}

      {showFilters && (
        <div className="flex flex-wrap gap-2">
          <FilterChip active={!kindFilter} onClick={() => setKindFilter(null)}>
            all kinds
          </FilterChip>
          {(Object.keys(KIND_STYLES) as ContextItem["kind"][]).map((kind) => (
            <FilterChip
              key={kind}
              active={kindFilter === kind}
              onClick={() => setKindFilter(kindFilter === kind ? null : kind)}
            >
              {kind.toLowerCase()}
            </FilterChip>
          ))}

          {repos.length > 1 && (
            <>
              <span className="w-px bg-border mx-1" />
              <FilterChip active={!repoFilter} onClick={() => setRepoFilter(null)}>
                all projects
              </FilterChip>
              {repos.map((r) => (
                <FilterChip
                  key={r.id}
                  active={repoFilter === r.id}
                  onClick={() => setRepoFilter(repoFilter === r.id ? null : r.id)}
                >
                  {r.name}
                </FilterChip>
              ))}
            </>
          )}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((item) => {
          const SourceIcon = SOURCE_ICONS[item.sourceType];
          const armed = confirmDeleteId === item.id;

          return (
            <div
              key={item.id}
              className="border border-border rounded p-3 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "font-mono text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded border shrink-0 mt-0.5",
                    KIND_STYLES[item.kind]
                  )}
                >
                  {item.kind}
                </span>

                <p className="flex-1 text-sm text-foreground leading-relaxed min-w-0">
                  {item.text}
                </p>

                <button
                  type="button"
                  disabled={deletingId === item.id}
                  onClick={() =>
                    armed ? deleteMutation.mutate(item.id) : setConfirmDeleteId(item.id)
                  }
                  onBlur={() => armed && setConfirmDeleteId(null)}
                  className={cn(
                    "shrink-0 font-mono text-[10px] px-2 py-1 rounded border transition-colors",
                    armed
                      ? "border-red-500/50 text-red-400 bg-red-500/10"
                      : "border-transparent text-muted-foreground/50 hover:text-red-400 hover:border-red-500/30"
                  )}
                  aria-label={armed ? "Confirm remove" : "Remove item"}
                >
                  {deletingId === item.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : armed ? (
                    "sure?"
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-2 pl-0 font-mono text-[10px] text-muted-foreground/70">
                <span className="inline-flex items-center gap-1">
                  <SourceIcon className="w-3 h-3" />
                  {SOURCE_LABELS[item.sourceType]}
                </span>
                <span>{formatDate(item.occurredAt)}</span>
                {repos.length > 1 && <span>{item.repoFullName}</span>}
                {item.confidence < 0.8 && (
                  <span className="text-amber-500/70">
                    {Math.round(item.confidence * 100)}% confidence
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {items.length > 0 && filtered.length === 0 && (
          <p className="font-mono text-[11px] text-muted-foreground py-6 text-center">
            Nothing matches those filters.
          </p>
        )}
      </div>

      <PasteNotesDialog
        open={pasteOpen}
        onOpenChange={setPasteOpen}
        repos={repos.map((r) => ({ id: r.id, fullName: r.fullName }))}
      />
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "font-mono text-[10px] px-2 py-1 rounded border transition-colors",
        active
          ? "border-primary/50 text-primary bg-primary/10"
          : "border-border text-muted-foreground hover:border-primary/30"
      )}
    >
      {children}
    </button>
  );
}
