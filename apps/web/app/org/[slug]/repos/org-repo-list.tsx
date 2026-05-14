"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { GitFork, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MergedRepo {
  fullName: string;
  name: string;
  isPrivate: boolean;
  dbId: string | null;
  tokens: number;
  reports: number;
  tracked: boolean;
  inThisOrg: boolean;
}

export function OrgRepoList({ repos, orgSlug }: { repos: MergedRepo[]; orgSlug: string }) {
  const qc = useQueryClient();

  const { mutate: syncRepos, isPending } = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post(`/api/v1/orgs/${orgSlug}/sync-repos`);
      return data.data as { synced: number };
    },
    onSuccess: (data) => {
      toast.success(`Synced ${data.synced} org repos`);
      qc.invalidateQueries({ queryKey: ["org", orgSlug] });
      window.location.reload();
    },
    onError: () => toast.error("Sync failed"),
  });

  const tracked = repos.filter((r) => r.tracked);
  const untracked = repos.filter((r) => !r.tracked);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Repos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {repos.length} accessible · {tracked.length} tracked
          </p>
        </div>
        <button
          type="button"
          onClick={() => syncRepos()}
          disabled={isPending}
          className="flex items-center gap-2 px-3 py-1.5 rounded border border-border text-xs font-mono text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors disabled:opacity-60"
        >
          {isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Sync org repos
        </button>
      </div>

      {/* Tracked repos — have tokens/reports */}
      {tracked.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">Tracked</h2>
          <div className="space-y-2">
            {tracked.map((repo) => (
              <RepoRow key={repo.fullName} repo={repo} />
            ))}
          </div>
        </section>
      )}

      {/* Untracked — visible on GitHub but not yet synced to Glitchgrab */}
      {untracked.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
            Not tracked ({untracked.length}) — click &quot;Sync org repos&quot; to track org repos
          </h2>
          <div className="space-y-2">
            {untracked.map((repo) => (
              <RepoRow key={repo.fullName} repo={repo} />
            ))}
          </div>
        </section>
      )}

      {repos.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No repos found. Make sure your GitHub token has repo scope.
        </p>
      )}
    </div>
  );
}

function RepoRow({ repo }: { repo: MergedRepo }) {
  return (
    <div className={cn(
      "rounded-lg border bg-card px-4 py-3 flex items-center gap-3",
      repo.tracked ? "border-border" : "border-border/50 opacity-70"
    )}>
      <GitFork size={16} className={cn("shrink-0", repo.tracked ? "text-primary" : "text-muted-foreground")} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-mono font-medium text-foreground truncate">{repo.fullName}</div>
        {repo.tracked && (
          <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
            {repo.tokens} token{repo.tokens !== 1 ? "s" : ""} · {repo.reports} report{repo.reports !== 1 ? "s" : ""}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {repo.isPrivate && (
          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border border-border text-muted-foreground uppercase tracking-wide">
            private
          </span>
        )}
        {repo.inThisOrg && (
          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border border-primary/30 text-primary bg-primary/5 uppercase tracking-wide">
            org
          </span>
        )}
      </div>
    </div>
  );
}
