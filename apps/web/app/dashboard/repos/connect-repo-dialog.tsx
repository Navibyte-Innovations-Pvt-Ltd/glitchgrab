"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Check, Search } from "lucide-react";
import { toast } from "sonner";
import { connectRepo } from "./actions";

interface GitHubRepo {
  githubId: number;
  fullName: string;
  name: string;
  owner: string;
  isPrivate: boolean;
  description: string | null;
}

export function ConnectRepoDialog() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: repos = [], isLoading, isFetching } = useQuery<GitHubRepo[]>({
    queryKey: ["github-repos"],
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/repos/github");
      return data.data;
    },
    enabled: open,
  });

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

  const filtered = repos.filter((repo) =>
    repo.fullName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setSearch(""); }}>
      <DialogTrigger render={<Button size="icon" className="shrink-0" />}>
        <Plus className="h-4 w-4" />
        <span className="sr-only">Connect Repo</span>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Connect a GitHub Repo</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search repos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {isFetching && !isLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              {repos.length === 0
                ? "No repos found on your GitHub account"
                : "No repos match your search"}
            </p>
          ) : (
            filtered.map((repo) => {
              const isConnected = connectedGithubIds.includes(repo.githubId);
              const isConnecting = isPending && variables?.githubId === repo.githubId;

              return (
                <div
                  key={repo.githubId}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    isConnected ? "opacity-50" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1 mr-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium break-all">
                        {repo.fullName}
                      </span>
                      <Badge
                        variant={repo.isPrivate ? "secondary" : "outline"}
                        className="shrink-0"
                      >
                        {repo.isPrivate ? "Private" : "Public"}
                      </Badge>
                    </div>
                    {repo.description && (
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {repo.description}
                      </p>
                    )}
                  </div>

                  {isConnected ? (
                    <Button variant="ghost" size="sm" disabled className="gap-1">
                      <Check className="h-3 w-3" />
                      Connected
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isConnecting}
                      onClick={() => mutate(repo)}
                    >
                      {isConnecting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Connect"
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
