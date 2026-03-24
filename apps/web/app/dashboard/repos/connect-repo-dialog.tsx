"use client";

import { useState, useEffect, useTransition } from "react";
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

interface ConnectRepoDialogProps {
  connectedGithubIds: number[];
}

export function ConnectRepoDialog({
  connectedGithubIds,
}: ConnectRepoDialogProps) {
  const [open, setOpen] = useState(false);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [connectingId, setConnectingId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    setSearch("");

    fetch("/api/v1/repos/github")
      .then((res) => res.json())
      .then((json: { success: boolean; data?: GitHubRepo[]; error?: string }) => {
        if (json.success && json.data) {
          setRepos(json.data);
        } else {
          toast.error(json.error ?? "Failed to fetch repos");
        }
      })
      .catch(() => {
        toast.error("Failed to fetch repos");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open]);

  const filtered = repos.filter((repo) =>
    repo.fullName.toLowerCase().includes(search.toLowerCase())
  );

  function handleConnect(repo: GitHubRepo) {
    setConnectingId(repo.githubId);

    startTransition(async () => {
      try {
        await connectRepo(
          repo.githubId,
          repo.fullName,
          repo.owner,
          repo.name,
          repo.isPrivate
        );
        toast.success(`Connected ${repo.fullName}`);
        setOpen(false);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to connect repo";
        toast.error(message);
      } finally {
        setConnectingId(null);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <span className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition sm:px-4">
          <Plus className="h-4 w-4" />
          Connect Repo
        </span>
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
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1">
          {loading ? (
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
              const isConnecting =
                connectingId === repo.githubId && isPending;

              return (
                <div
                  key={repo.githubId}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    isConnected ? "opacity-50" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1 mr-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
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
                      onClick={() => handleConnect(repo)}
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
