"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  ChevronRight,
  FileText,
  GitFork,
  Github,
  Key,
  Loader2,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { resyncRepo } from "./actions";

interface Repo {
  id: string;
  githubId: number;
  fullName: string;
  isPrivate: boolean;
  tokens: number;
  reports: number;
}

interface ReposData {
  ownRepos: Repo[];
  sharedRepos: Repo[];
}

export function ReposList({ isOwner }: { isOwner: boolean }) {
  const [search, setSearch] = useState("");

  const { data, isLoading, isFetching } = useQuery<ReposData>({
    queryKey: ["repos"],
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/repos");
      return data.data;
    },
  });

  const ownRepos = data?.ownRepos ?? [];
  const sharedRepos = data?.sharedRepos ?? [];
  const hasAnyRepos = ownRepos.length > 0 || sharedRepos.length > 0;

  const q = search.toLowerCase();
  const filteredOwn = ownRepos.filter((r) =>
    r.fullName.toLowerCase().includes(q)
  );
  const filteredShared = sharedRepos.filter((r) =>
    r.fullName.toLowerCase().includes(q)
  );
  const totalCount = filteredOwn.length + filteredShared.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasAnyRepos) {
    return (
      <div className="border border-dashed border-border rounded p-10 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center mb-4">
          <GitFork className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="font-mono text-sm text-foreground mb-2">
          {isOwner ? "no repositories connected" : "no shared repositories"}
        </h3>
        <p className="text-xs text-muted-foreground max-w-sm mb-6">
          {isOwner
            ? "Connect a GitHub repo to generate API tokens and start capturing bugs."
            : "No repositories have been shared with you yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
        <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground uppercase tracking-widest shrink-0">
          {isFetching && !isLoading && (
            <Loader2 className="h-3 w-3 animate-spin" />
          )}
          <span>{totalCount} repos</span>
        </div>
      </div>

      {totalCount === 0 && search ? (
        <div className="border border-dashed border-border rounded p-10 flex flex-col items-center text-center">
          <Search className="h-5 w-5 text-muted-foreground mb-3" />
          <p className="font-mono text-sm text-muted-foreground">
            no repos match &ldquo;{search}&rdquo;
          </p>
        </div>
      ) : (
        <>
          {filteredShared.length > 0 && (
            <section className="space-y-3">
              <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                shared · {filteredShared.length}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredShared.map((repo) => (
                  <RepoCard key={repo.id} repo={repo} kind="shared" />
                ))}
              </div>
            </section>
          )}
          {filteredOwn.length > 0 && (
            <section className="space-y-3">
              {filteredShared.length > 0 && (
                <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                  connected · {filteredOwn.length}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredOwn.map((repo) => (
                  <RepoCard key={repo.id} repo={repo} kind="own" />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function RepoCard({ repo, kind }: { repo: Repo; kind: "own" | "shared" }) {
  const [owner, name] = repo.fullName.includes("/")
    ? repo.fullName.split("/")
    : ["—", repo.fullName];

  const queryClient = useQueryClient();

  const { mutate: syncRepo, isPending: isSyncing } = useMutation({
    mutationFn: () => resyncRepo(repo.id),
    onSuccess: (result) => {
      if (result.changed) {
        toast.success(`Synced: now ${result.fullName}`);
      } else {
        toast.info("Already up to date");
      }
      queryClient.invalidateQueries({ queryKey: ["repos"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to sync repo");
    },
  });

  return (
    <div className="group relative flex flex-col gap-3 p-4 rounded-lg bg-card border border-border hover:border-primary/40 transition-colors cursor-pointer">
      <div className="absolute inset-y-3 left-[3px] w-[2px] rounded-full bg-primary shadow-[0_0_8px_rgba(34,211,238,0.4)]" />

      <div className="flex items-start justify-between gap-2">
        <div className="w-9 h-9 rounded border border-border bg-background flex items-center justify-center text-muted-foreground shrink-0">
          {kind === "shared" ? (
            <Users className="h-4 w-4" />
          ) : (
            <Github className="h-4 w-4" />
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="px-1.5 py-px rounded bg-muted text-[9px] font-mono text-muted-foreground uppercase border border-border">
            {repo.isPrivate ? "private" : "public"}
          </span>
          <div className="flex items-center gap-1 px-1.5 py-px rounded bg-primary/10 border border-primary/30 text-primary font-mono text-[9px] uppercase tracking-wider">
            <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
            {kind === "shared" ? "shared" : "live"}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-semibold text-foreground truncate">
          {name}
        </span>
        <span className="font-mono text-[11px] text-muted-foreground truncate">
          {owner}
        </span>
      </div>

      <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Key className="h-3 w-3 shrink-0" />
          <span>
            {repo.tokens} {repo.tokens === 1 ? "token" : "tokens"}
          </span>
        </div>
        <div className="w-px h-3 bg-border" />
        <div className="flex items-center gap-1.5">
          <FileText className="h-3 w-3 shrink-0" />
          <span>
            {repo.reports} {repo.reports === 1 ? "report" : "reports"}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-border/50">
        <span className="font-mono text-[10px] text-muted-foreground truncate">
          id:{repo.githubId}
        </span>
        <div className="flex items-center gap-1.5">
          {kind === "own" && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                syncRepo();
              }}
              disabled={isSyncing}
              title="Sync with GitHub"
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border bg-background text-muted-foreground hover:text-foreground hover:border-primary/40 font-mono text-[10px] uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              {isSyncing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              sync
            </button>
          )}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground">
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
}
