"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ExternalLink, Loader2, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface IssueItem {
  number: number;
  title: string;
  url: string;
  createdAt: string;
  author: string;
  authorAvatar: string | null;
  comments: number;
  labels: { name: string; color: string }[];
  repoFullName: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < 60 * 60 * 1000) return `${Math.max(1, Math.round(diff / 60000))}m`;
  if (diff < day) return `${Math.round(diff / (60 * 60 * 1000))}h`;
  if (diff < 30 * day) return `${Math.round(diff / day)}d`;
  return new Date(iso).toLocaleDateString();
}

export function OpenIssues() {
  const { data, isLoading } = useQuery<IssueItem[]>({
    queryKey: ["open-issues"],
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/repos/issues");
      return data.data ?? [];
    },
    staleTime: 60_000,
  });

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Open issues
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
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">No open issues — nice!</p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {data.map((issue) => (
              <li key={`${issue.repoFullName}-${issue.number}`}>
                <a
                  href={issue.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 py-3 group hover:bg-muted/50 -mx-2 px-2 rounded-md transition"
                >
                  <Avatar className="h-6 w-6 mt-0.5 shrink-0">
                    <AvatarImage src={issue.authorAvatar ?? undefined} alt={issue.author} />
                    <AvatarFallback className="text-[10px]">
                      {issue.author.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition">
                      {issue.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-xs text-muted-foreground">
                        {issue.repoFullName} #{issue.number} · {timeAgo(issue.createdAt)}
                      </p>
                      {issue.comments > 0 && (
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          <MessageCircle className="h-3 w-3" />
                          {issue.comments}
                        </span>
                      )}
                      {issue.labels.slice(0, 2).map((label) => (
                        <span
                          key={label.name}
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: `#${label.color}22`,
                            color: `#${label.color}`,
                          }}
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>
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
