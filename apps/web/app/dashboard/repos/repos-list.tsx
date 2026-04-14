"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  ChevronRight,
  GitFork,
  Github,
  Loader2,
  Users,
} from "lucide-react";

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
  const totalCount = ownRepos.length + sharedRepos.length;

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
    <div className="relative">
      <div className="flex items-center justify-between pb-3 border-b border-border/50 mb-2">
        <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
          {ownRepos.length > 0 && (
            <span>
              {ownRepos.length} connected
              {sharedRepos.length > 0 ? " · " : ""}
            </span>
          )}
          {sharedRepos.length > 0 && (
            <span>{sharedRepos.length} shared</span>
          )}
        </div>
        <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest flex items-center gap-2">
          {isFetching && !isLoading && (
            <Loader2 className="h-3 w-3 animate-spin" />
          )}
          <span>{totalCount} results</span>
        </div>
      </div>

      <div className="hidden sm:grid grid-cols-[3fr_1fr_1fr_auto] gap-4 font-mono text-[10px] text-muted-foreground uppercase tracking-widest pl-5 pr-8 pb-3 mb-1">
        <div>repository / metadata</div>
        <div>tokens</div>
        <div>reports</div>
        <div className="text-right">status</div>
      </div>

      <div className="flex flex-col gap-1">
        {sharedRepos.map((repo) => (
          <RepoRow key={repo.id} repo={repo} kind="shared" />
        ))}
        {ownRepos.map((repo) => (
          <RepoRow key={repo.id} repo={repo} kind="own" />
        ))}
      </div>
    </div>
  );
}

function RepoRow({ repo, kind }: { repo: Repo; kind: "own" | "shared" }) {
  const [owner, name] = repo.fullName.includes("/")
    ? repo.fullName.split("/")
    : ["—", repo.fullName];

  const stripClass =
    kind === "shared"
      ? "bg-primary shadow-[0_0_8px_rgba(34,211,238,0.4)]"
      : "bg-primary shadow-[0_0_8px_rgba(34,211,238,0.4)]";

  return (
    <div className="data-row group relative grid grid-cols-[auto_1fr_auto_40px] sm:grid-cols-[auto_1fr_auto_auto_auto_40px] items-center gap-y-1 p-3 rounded bg-transparent hover:bg-card/60 border border-transparent hover:border-border/50 transition-colors">
      <div className={`absolute inset-y-2 left-[2px] w-[2px] ${stripClass}`} />
      <div className="w-8 h-8 rounded border border-border bg-card flex items-center justify-center text-muted-foreground mr-4 shrink-0">
        {kind === "shared" ? (
          <Users className="h-4 w-4" />
        ) : (
          <Github className="h-4 w-4" />
        )}
      </div>
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground truncate">
            {name}
          </span>
          <span className="px-1.5 py-px rounded bg-muted text-[9px] font-mono text-muted-foreground uppercase border border-border">
            {repo.isPrivate ? "private" : "public"}
          </span>
        </div>
        <div className="font-mono text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
          <span className="truncate">{owner}</span>
          <span className="w-0.75 h-0.75 rounded-full bg-border shrink-0" />
          <span className="truncate">id:{repo.githubId}</span>
          <span className="sm:hidden w-0.75 h-0.75 rounded-full bg-border shrink-0" />
          <span className="sm:hidden">
            {repo.tokens} tok · {repo.reports} rep
          </span>
        </div>
      </div>
      <div className="hidden sm:block font-mono text-[11px] text-muted-foreground tabular-nums mr-8">
        {repo.tokens} {repo.tokens === 1 ? "token" : "tokens"}
      </div>
      <div className="hidden sm:block font-mono text-[11px] text-muted-foreground tabular-nums mr-8">
        {repo.reports} {repo.reports === 1 ? "report" : "reports"}
      </div>
      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-primary/10 border border-primary/30 text-primary font-mono text-[10px] uppercase tracking-wider">
        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        {kind === "shared" ? "shared" : "connected"}
      </div>
      <div className="flex justify-end pr-2 text-muted-foreground opacity-0 -translate-x-3 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0">
        <ChevronRight className="h-4 w-4" />
      </div>
    </div>
  );
}
