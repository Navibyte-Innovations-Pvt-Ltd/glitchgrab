"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { ArrowRight, Check, Clock, GitPullRequest, Loader2, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type ChecksRollup = "passing" | "failing" | "pending" | "none";

interface PullRequest {
  number: number;
  title: string;
  url: string;
  draft: boolean;
  createdAt: string;
  author: string;
  authorAvatar: string | null;
  repoFullName: string;
  checks?: ChecksRollup;
  checksTotal?: number;
  checksFailed?: number;
}

function ChecksPill({ pr }: { pr: PullRequest }) {
  if (!pr.checks || pr.checks === "none" || !pr.checksTotal) return null;

  if (pr.checks === "passing") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono border border-green-500/30 bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded">
        <Check className="h-2.5 w-2.5" />
        {pr.checksTotal} passing
      </span>
    );
  }
  if (pr.checks === "failing") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono border border-red-500/30 bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded">
        <X className="h-2.5 w-2.5" />
        {pr.checksFailed}/{pr.checksTotal} failing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-mono border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 px-1.5 py-0.5 rounded">
      <Loader2 className="h-2.5 w-2.5 animate-spin" />
      checks running
    </span>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < 60 * 60 * 1000) return `${Math.max(1, Math.round(diff / 60000))}m ago`;
  if (diff < day) return `${Math.round(diff / (60 * 60 * 1000))}h ago`;
  if (diff < 30 * day) return `${Math.round(diff / day)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function severity(iso: string, draft: boolean): "stale" | "normal" | "fresh" | "draft" {
  if (draft) return "draft";
  const ageHrs = (Date.now() - new Date(iso).getTime()) / (60 * 60 * 1000);
  if (ageHrs > 72) return "stale";
  if (ageHrs > 24) return "normal";
  return "fresh";
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center gap-3 border border-dashed border-border rounded-md px-4 py-4">
        <GitPullRequest className="h-4 w-4 text-muted-foreground shrink-0" />
        <p className="text-xs font-mono text-muted-foreground">
          No open pull requests — all caught up.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {data.slice(0, 5).map((pr) => {
        const sev = severity(pr.createdAt, pr.draft);
        const stripColor =
          sev === "stale"
            ? "bg-yellow-500/80"
            : sev === "draft"
            ? "bg-muted"
            : sev === "fresh"
            ? "bg-primary/80"
            : "bg-border";

        return (
          <li key={`${pr.repoFullName}-${pr.number}`}>
            <a
              href={pr.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block bg-card/40 hover:bg-card border border-border hover:border-primary/50 rounded-md p-3 pl-4 transition-colors"
            >
              <span
                aria-hidden
                className={`absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-l-md ${stripColor}`}
              />
              <div className="flex items-start gap-3">
                <Avatar className="h-7 w-7 mt-0.5 shrink-0 border border-border">
                  <AvatarImage src={pr.authorAvatar ?? undefined} alt={pr.author} />
                  <AvatarFallback className="text-[10px] font-mono">
                    {pr.author.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {pr.title}
                    </h3>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:text-primary transition-all" />
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] font-mono text-muted-foreground flex-wrap">
                    <span className="text-primary/70">
                      {pr.repoFullName} #{pr.number}
                    </span>
                    <span className="opacity-40">·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {timeAgo(pr.createdAt)}
                    </span>
                    <ChecksPill pr={pr} />
                    {pr.draft && (
                      <>
                        <span className="opacity-40">·</span>
                        <span className="text-muted-foreground/80 border border-border px-1 rounded text-[10px]">
                          draft
                        </span>
                      </>
                    )}
                    {sev === "stale" && !pr.draft && (
                      <>
                        <span className="opacity-40">·</span>
                        <span className="text-yellow-400/90">stale</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
