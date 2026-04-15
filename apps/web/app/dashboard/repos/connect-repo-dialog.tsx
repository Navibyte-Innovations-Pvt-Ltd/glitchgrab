"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { signIn } from "next-auth/react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Building2, Check, Github, Loader2, Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { connectRepo } from "./actions";

interface GitHubRepo {
  githubId: number;
  fullName: string;
  name: string;
  owner: string;
  ownerType: "user" | "org";
  isPrivate: boolean;
  description: string | null;
}

interface GitHubAccount {
  login: string;
  type: "user" | "org";
}

interface GitHubReposResponse {
  repos: GitHubRepo[];
  accounts: GitHubAccount[];
  connectionUrl: string;
}

export function ConnectRepoDialog() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, refetch } = useQuery<GitHubReposResponse>({
    queryKey: ["github-repos"],
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/repos/github");
      return data.data;
    },
    enabled: open,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const repos = data?.repos ?? [];
  const accounts = data?.accounts ?? [];
  const orgAccounts = accounts.filter((a) => a.type === "org");
  const connectionUrl = data?.connectionUrl;

  const { data: connectedRepos } = useQuery<{ ownRepos: { githubId: number }[] }>({
    queryKey: ["repos"],
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/repos");
      return data.data;
    },
  });

  const connectedGithubIds = connectedRepos?.ownRepos.map((r) => r.githubId) ?? [];

  const { mutate, isPending, variables } = useMutation({
    mutationFn: async (repo: GitHubRepo) => {
      await connectRepo(
        repo.githubId,
        repo.fullName,
        repo.owner,
        repo.name,
        repo.isPrivate
      );
      return repo;
    },
    onSuccess: (repo) => {
      toast.success(`Connected ${repo.fullName}`);
      queryClient.invalidateQueries({ queryKey: ["repos"] });
      queryClient.invalidateQueries({ queryKey: ["github-repos"] });
      setOpen(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to connect repo");
    },
  });

  const filtered = repos.filter((repo) => {
    const matchesAccount = accountFilter === "all" || repo.owner === accountFilter;
    const matchesSearch = repo.fullName.toLowerCase().includes(search.toLowerCase());
    return matchesAccount && matchesSearch;
  });

  const handleOpenConnections = () => {
    if (!connectionUrl) return;
    window.open(connectionUrl, "_blank", "noopener,noreferrer");
  };

  const handleReconnectGitHub = () => {
    signIn("github", { callbackUrl: "/dashboard/repos" });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          setSearch("");
          setAccountFilter("all");
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="default"
            className="gap-2 font-mono text-xs uppercase tracking-wider shrink-0"
          />
        }
      >
        <Plus className="h-3.5 w-3.5" />
        <span>Connect Repo</span>
        <span className="hidden sm:inline-flex items-center gap-1 bg-background/40 rounded-xs px-1.5 py-0.5 text-[9px] border border-border/60 text-foreground/70 normal-case tracking-normal">
          <span className="font-mono">⌘N</span>
        </span>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm text-foreground uppercase tracking-widest flex items-center gap-2">
            <Github className="h-4 w-4 text-primary" />
            connect_github_repo
          </DialogTitle>
          <p className="font-mono text-[11px] text-muted-foreground mt-1">
            pick a repo to generate tokens & push AI-generated issues
          </p>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="grep repos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 font-mono text-sm"
          />
          {isFetching && !isLoading ? (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            !isLoading && (
              <button
                type="button"
                onClick={() => refetch()}
                title="Refresh repo list"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )
          )}
        </div>

        {!isLoading && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setAccountFilter("all")}
              className={`font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded border transition-colors ${
                accountFilter === "all"
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "bg-card border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              all
            </button>
            {orgAccounts.map((acc) => {
              const isActive = accountFilter === acc.login;
              return (
                <button
                  type="button"
                  key={acc.login}
                  onClick={() => setAccountFilter(acc.login)}
                  className={`inline-flex items-center gap-1.5 font-mono text-[10px] px-2 py-1 rounded border transition-colors ${
                    isActive
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-card border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Building2 className="h-3 w-3" />
                  {acc.login}
                </button>
              );
            })}
            <button
              type="button"
              onClick={handleOpenConnections}
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              title="Open GitHub to grant Glitchgrab access to another organization"
            >
              <Plus className="h-3 w-3" />
              add org
            </button>
            <button
              type="button"
              onClick={handleReconnectGitHub}
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors ml-auto"
              title="Reconnect GitHub to refresh org access"
            >
              <RefreshCw className="h-3 w-3" />
              reconnect
            </button>
          </div>
        )}

        {!isLoading && repos.length > 0 && (
          <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest flex items-center justify-between px-1">
            <span>{filtered.length} / {repos.length} repos</span>
            <span>
              {connectedGithubIds.length > 0 && (
                <>{connectedGithubIds.length} already connected</>
              )}
            </span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0 space-y-1 pr-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="border border-dashed border-border rounded p-6 flex flex-col items-center text-center gap-3">
              <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center">
                <Github className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="font-mono text-xs text-muted-foreground">
                {repos.length === 0
                  ? "no repos found on your GitHub account"
                  : accountFilter !== "all"
                    ? `no repos under ${accountFilter}`
                    : "no repos match your search"}
              </p>
              {connectionUrl && (
                <button
                  type="button"
                  onClick={handleOpenConnections}
                  className="font-mono text-[10px] uppercase tracking-wider text-primary hover:underline"
                >
                  missing an organization? grant access →
                </button>
              )}
            </div>
          ) : (
            filtered.map((repo) => {
              const isConnected = connectedGithubIds.includes(repo.githubId);
              const isConnecting = isPending && variables?.githubId === repo.githubId;

              return (
                <div
                  key={repo.githubId}
                  className={`group relative grid grid-cols-[auto_1fr_auto] items-center gap-3 p-3 rounded border border-transparent transition-colors ${
                    isConnected
                      ? "opacity-60"
                      : "hover:bg-card/60 hover:border-border/50"
                  }`}
                >
                  <div
                    className={`absolute inset-y-2 left-[2px] w-[2px] ${
                      isConnected ? "bg-border" : "bg-primary/70"
                    }`}
                  />
                  <div className="w-8 h-8 rounded border border-border bg-card flex items-center justify-center text-muted-foreground shrink-0 ml-1">
                    <Github className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground break-all">
                        {repo.fullName}
                      </span>
                      {repo.ownerType === "org" && (
                        <span className="px-1.5 py-px rounded bg-primary/10 text-[9px] font-mono text-primary uppercase border border-primary/30">
                          org
                        </span>
                      )}
                      <span className="px-1.5 py-px rounded bg-muted text-[9px] font-mono text-muted-foreground uppercase border border-border">
                        {repo.isPrivate ? "private" : "public"}
                      </span>
                    </div>
                    {repo.description && (
                      <p className="font-mono text-[11px] text-muted-foreground truncate mt-0.5">
                        {repo.description}
                      </p>
                    )}
                  </div>

                  {isConnected ? (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-primary/10 border border-primary/30 text-primary font-mono text-[10px] uppercase tracking-wider shrink-0">
                      <Check className="h-3 w-3" />
                      connected
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isConnecting}
                      onClick={() => mutate(repo)}
                      className="font-mono text-[10px] uppercase tracking-wider shrink-0"
                    >
                      {isConnecting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "connect"
                      )}
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
