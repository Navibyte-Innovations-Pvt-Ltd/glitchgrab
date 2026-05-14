"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { GitFork, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Repo {
  id: string;
  fullName: string;
  name: string;
  isPrivate: boolean;
  _count: { tokens: number; reports: number };
}

export function OrgRepoList({ repos, orgSlug }: { repos: Repo[]; orgSlug: string }) {
  const qc = useQueryClient();

  const { mutate: syncRepos, isPending } = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post(`/api/v1/orgs/${orgSlug}/sync-repos`);
      return data.data as { synced: number };
    },
    onSuccess: (data) => {
      toast.success(`Synced ${data.synced} repos`);
      qc.invalidateQueries({ queryKey: ["org", orgSlug] });
      window.location.reload();
    },
    onError: () => toast.error("Sync failed"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Repos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{repos.length} repo{repos.length !== 1 ? "s" : ""} in org</p>
        </div>
        <button
          type="button"
          onClick={() => syncRepos()}
          disabled={isPending}
          className="flex items-center gap-2 px-3 py-1.5 rounded border border-border text-xs font-mono text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors disabled:opacity-60"
        >
          {isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Sync from GitHub
        </button>
      </div>

      <div className="space-y-2">
        {repos.map((repo) => (
          <div key={repo.id} className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-3">
            <GitFork size={16} className="text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-mono font-medium text-foreground truncate">{repo.fullName}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                {repo._count.tokens} token{repo._count.tokens !== 1 ? "s" : ""} · {repo._count.reports} report{repo._count.reports !== 1 ? "s" : ""}
              </div>
            </div>
            {repo.isPrivate && (
              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border border-border text-muted-foreground uppercase tracking-wide">
                private
              </span>
            )}
          </div>
        ))}
        {repos.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No repos yet. Click &quot;Sync from GitHub&quot; to import all org repos.
          </p>
        )}
      </div>
    </div>
  );
}
