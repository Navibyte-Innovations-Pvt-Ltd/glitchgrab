"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, GitPullRequest, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface PullRequest {
  number: number;
  title: string;
  url: string;
  draft: boolean;
  createdAt: string;
  author: string;
  authorAvatar: string | null;
  repoFullName: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < 60 * 60 * 1000) return `${Math.max(1, Math.round(diff / 60000))}m ago`;
  if (diff < day) return `${Math.round(diff / (60 * 60 * 1000))}h ago`;
  if (diff < 30 * day) return `${Math.round(diff / day)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function OpenPullRequests() {
  const { data, isLoading } = useQuery<PullRequest[]>({
    queryKey: ["open-pull-requests"],
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/repos/pull-requests");
      return data.data ?? [];
    },
    staleTime: 60_000,
  });

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <GitPullRequest className="h-4 w-4" />
          Open PRs
        </CardTitle>
        {data && data.length > 0 && (
          <span className="text-xs text-muted-foreground">{data.length}</span>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !data || data.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <GitPullRequest className="h-8 w-8 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">No open pull requests</p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {data.map((pr) => (
              <li key={`${pr.repoFullName}-${pr.number}`}>
                <a
                  href={pr.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 py-3 group hover:bg-muted/50 -mx-2 px-2 rounded-md transition"
                >
                  <Avatar className="h-6 w-6 mt-0.5 shrink-0">
                    <AvatarImage src={pr.authorAvatar ?? undefined} alt={pr.author} />
                    <AvatarFallback className="text-[10px]">
                      {pr.author.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition">
                        {pr.title}
                      </p>
                      {pr.draft && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                          draft
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {pr.repoFullName} #{pr.number} · {pr.author} · {timeAgo(pr.createdAt)}
                    </p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground mt-1 shrink-0 group-hover:text-primary transition" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
