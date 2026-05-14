"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { FileText, GitFork, Key, Loader2, RefreshCw, Search } from "lucide-react";
import { useState } from "react";
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
  const [search, setSearch] = useState("");

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

  const q = search.toLowerCase();
  const tracked = repos.filter((r) => r.tracked && r.fullName.toLowerCase().includes(q));
  const untracked = repos.filter((r) => !r.tracked && r.fullName.toLowerCase().includes(q));
  const totalFiltered = tracked.length + untracked.length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Repos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {repos.length} accessible · {repos.filter((r) => r.tracked).length} tracked
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

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="search repositories…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded border border-border bg-card text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
        {search && (
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest shrink-0">
            {totalFiltered} repos
          </span>
        )}
      </div>

      {totalFiltered === 0 && search ? (
        <div className="border border-dashed border-border rounded p-10 flex flex-col items-center text-center">
          <Search className="h-5 w-5 text-muted-foreground mb-3" />
          <p className="font-mono text-sm text-muted-foreground">
            no repos match &ldquo;{search}&rdquo;
          </p>
        </div>
      ) : (
        <>
          {tracked.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
                Tracked · {tracked.length}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {tracked.map((repo) => (
                  <RepoCard key={repo.fullName} repo={repo} />
                ))}
              </div>
            </section>
          )}

          {untracked.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
                Not tracked · {untracked.length}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {untracked.map((repo) => (
                  <RepoCard key={repo.fullName} repo={repo} />
                ))}
              </div>
            </section>
          )}

          {repos.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No repos found. Make sure your GitHub token has repo scope.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function RepoCard({ repo }: { repo: MergedRepo }) {
  const [owner, name] = repo.fullName.includes("/")
    ? repo.fullName.split("/")
    : ["—", repo.fullName];

  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 p-4 rounded-lg border bg-card transition-colors",
        repo.tracked
          ? "border-border hover:border-primary/40"
          : "border-border/50 opacity-60 hover:opacity-80"
      )}
    >
      {repo.tracked && (
        <div className="absolute inset-y-3 left-[3px] w-[2px] rounded-full bg-primary shadow-[0_0_8px_rgba(34,211,238,0.4)]" />
      )}

      <div className="flex items-start justify-between gap-2">
        <div className={cn(
          "w-9 h-9 rounded border border-border bg-background flex items-center justify-center shrink-0",
          repo.tracked ? "text-primary" : "text-muted-foreground"
        )}>
          <GitFork className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap justify-end">
          {repo.isPrivate && (
            <span className="px-1.5 py-px rounded bg-muted text-[9px] font-mono text-muted-foreground uppercase border border-border">
              private
            </span>
          )}
          {repo.inThisOrg && (
            <span className="px-1.5 py-px rounded bg-primary/10 border border-primary/30 text-primary font-mono text-[9px] uppercase tracking-wide">
              org
            </span>
          )}
          {repo.tracked && (
            <div className="flex items-center gap-1 px-1.5 py-px rounded bg-primary/10 border border-primary/30 text-primary font-mono text-[9px] uppercase tracking-wider">
              <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
              live
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-semibold text-foreground truncate">{name}</span>
        <span className="font-mono text-[11px] text-muted-foreground truncate">{owner}</span>
      </div>

      {repo.tracked && (
        <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Key className="h-3 w-3 shrink-0" />
            <span>{repo.tokens} {repo.tokens === 1 ? "token" : "tokens"}</span>
          </div>
          <div className="w-px h-3 bg-border" />
          <div className="flex items-center gap-1.5">
            <FileText className="h-3 w-3 shrink-0" />
            <span>{repo.reports} {repo.reports === 1 ? "report" : "reports"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
