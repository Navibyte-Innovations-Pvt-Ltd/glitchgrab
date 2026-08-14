"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Eye, EyeOff, Loader2, MessageSquareHeart, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface FeedbackItem {
  id: string;
  repoId: string;
  repoFullName: string;
  rating: number;
  message: string | null;
  pageUrl: string | null;
  approved: boolean;
  reporterPrimaryKey: string;
  reporterName: string;
  reporterEmail: string | null;
  reporterPhone: string | null;
  createdAt: string;
}

/** Below this, filters are clutter — the whole list fits on screen. */
const FILTER_THRESHOLD = 10;

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

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          width={size}
          height={size}
          className={cn(
            i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
          )}
        />
      ))}
    </span>
  );
}

export function FeedbackList() {
  const queryClient = useQueryClient();
  const [repoFilter, setRepoFilter] = useState<string | null>(null);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  /** Row whose delete button is armed — deleting is irreversible, so it takes two clicks. */
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data, isLoading, isFetching } = useQuery<FeedbackItem[]>({
    queryKey: ["feedback"],
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/feedback");
      return data.data ?? [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      await axios.patch(`/api/v1/feedback/${id}`, { approved });
    },
    onSuccess: (_res, { approved }) => {
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
      toast.success(approved ? "Published to your app" : "Hidden from your app");
    },
    onError: () => toast.error("Could not update feedback"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/v1/feedback/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
      toast.success("Feedback deleted");
    },
    onError: () => toast.error("Could not delete feedback"),
    onSettled: () => setConfirmDeleteId(null),
  });

  // Which row each mutation is busy on — read off the mutation itself so two
  // concurrent actions on different rows can't re-enable each other's buttons.
  const approvingId = approveMutation.isPending ? approveMutation.variables?.id : null;
  const deletingId = deleteMutation.isPending ? deleteMutation.variables : null;

  const feedback = useMemo(() => data ?? [], [data]);

  const uniqueRepos = useMemo(
    () => Array.from(new Set(feedback.map((f) => f.repoFullName).filter(Boolean))).sort(),
    [feedback]
  );

  const filtered = useMemo(() => {
    let list = feedback;
    if (repoFilter) list = list.filter((f) => f.repoFullName === repoFilter);
    if (ratingFilter) list = list.filter((f) => f.rating === ratingFilter);
    return list;
  }, [feedback, repoFilter, ratingFilter]);

  const average = useMemo(() => {
    if (feedback.length === 0) return 0;
    return feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length;
  }, [feedback]);

  const approvedCount = useMemo(() => feedback.filter((f) => f.approved).length, [feedback]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (feedback.length === 0) {
    return (
      <div className="border border-dashed border-border rounded p-10 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center mb-4">
          <MessageSquareHeart className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="font-mono text-sm text-foreground mb-2">no feedback yet</h3>
        <p className="text-xs text-muted-foreground max-w-md">
          Drop <code className="font-mono text-primary">&lt;FeedbackButton /&gt;</code> into your
          app — your users&apos; ratings land here. No table, no route, no migration on your side.
        </p>
      </div>
    );
  }

  const showFilters = feedback.length > FILTER_THRESHOLD;

  return (
    <div className="relative space-y-6">
      {isFetching && !isLoading && (
        <div className="absolute -top-4 right-0">
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border border-border rounded p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            average
          </p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-medium tabular-nums">{average.toFixed(1)}</span>
            <Stars rating={Math.round(average)} />
          </div>
        </div>
        <div className="border border-border rounded p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            total
          </p>
          <span className="text-2xl font-medium tabular-nums">{feedback.length}</span>
        </div>
        <div className="border border-border rounded p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            published
          </p>
          <span className="text-2xl font-medium tabular-nums">{approvedCount}</span>
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {uniqueRepos.length > 1 && (
            <select
              value={repoFilter ?? ""}
              onChange={(e) => setRepoFilter(e.target.value || null)}
              className="bg-background border border-border rounded px-2 py-1 font-mono text-[11px] text-foreground"
            >
              <option value="">all repos</option>
              {uniqueRepos.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-1">
            {[5, 4, 3, 2, 1].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRatingFilter(ratingFilter === r ? null : r)}
                className={cn(
                  "font-mono text-[11px] px-2 py-1 rounded border transition-colors",
                  ratingFilter === r
                    ? "bg-amber-400/10 border-amber-400/40 text-amber-400"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {r}★
              </button>
            ))}
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {filtered.map((f) => {
          const isApproving = approvingId === f.id;
          const isDeleting = deletingId === f.id;
          const isBusy = isApproving || isDeleting;
          const isArmed = confirmDeleteId === f.id;
          return (
            <div
              key={f.id}
              className="border border-border rounded p-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Stars rating={f.rating} />
                  <span className="font-mono text-[11px] text-foreground truncate">
                    {f.reporterName}
                  </span>
                  {f.reporterEmail && (
                    <span className="font-mono text-[11px] text-muted-foreground truncate">
                      {f.reporterEmail}
                    </span>
                  )}
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {formatAge(f.createdAt)}
                  </span>
                  {f.approved && (
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border bg-primary/10 border-primary/30 text-primary">
                      published
                    </span>
                  )}
                </div>

                {f.message && (
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap wrap-break-word">
                    {f.message}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-muted-foreground">
                  {f.repoFullName && <span>{f.repoFullName}</span>}
                  {f.pageUrl && <span className="truncate max-w-xs">{f.pageUrl}</span>}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() =>
                    approveMutation.mutate({ id: f.id, approved: !f.approved })
                  }
                  className={cn(
                    "flex items-center gap-1.5 font-mono text-[11px] px-2.5 py-1.5 rounded border transition-colors disabled:opacity-60",
                    f.approved
                      ? "border-border text-muted-foreground hover:text-foreground"
                      : "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                  )}
                >
                  {isApproving ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : f.approved ? (
                    <EyeOff className="h-3 w-3" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                  {f.approved ? "unpublish" : "publish"}
                </button>
                {isArmed ? (
                  <>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => deleteMutation.mutate(f.id)}
                      className="flex items-center gap-1.5 font-mono text-[11px] px-2.5 py-1.5 rounded border bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-60"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                      delete for good
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setConfirmDeleteId(null)}
                      className="font-mono text-[11px] px-2 py-1.5 rounded border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60"
                    >
                      cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setConfirmDeleteId(f.id)}
                    aria-label="Delete feedback"
                    className="flex items-center justify-center h-7.5 w-7.5 rounded border border-border text-muted-foreground hover:text-red-400 hover:border-red-400/40 transition-colors disabled:opacity-60"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="font-mono text-[11px] text-muted-foreground text-center py-8">
          no feedback matches these filters
        </p>
      )}
    </div>
  );
}
