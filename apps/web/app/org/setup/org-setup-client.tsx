"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Loader2, Building2, GitFork, CheckCircle2, Check } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface GitHubOrg {
  id: number;
  login: string;
  description: string | null;
  avatarUrl: string | null;
}

export function OrgSetupClient() {
  const [selected, setSelected] = useState<string>("");
  const router = useRouter();

  const { data: orgs, isLoading: orgsLoading } = useQuery<GitHubOrg[]>({
    queryKey: ["my-github-orgs"],
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/orgs/my-github-orgs");
      return data.data as GitHubOrg[];
    },
    staleTime: 60_000,
  });

  const { mutate, isPending, isSuccess } = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post("/api/v1/orgs", { githubOrgLogin: selected.trim() });
      return data.data as { org: { githubOrgLogin: string }; repoCount: number };
    },
    onSuccess: (data) => {
      toast.success(`Org connected! ${data.repoCount} repos synced.`);
      router.push(`/org/${data.org.githubOrgLogin}`);
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : "Failed to connect org";
      toast.error(msg ?? "Failed to connect org");
    },
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border border-primary/20 mb-2">
            <Building2 size={22} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Connect your GitHub Org</h1>
          <p className="text-sm text-muted-foreground">
            All repos synced automatically. Team members auto-detected on login.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">

          {/* Org picker */}
          <div className="space-y-2">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Your GitHub Orgs
            </p>

            {orgsLoading ? (
              <div className="flex items-center gap-2 py-4 justify-center text-muted-foreground">
                <Loader2 size={14} className="animate-spin" />
                <span className="text-sm font-mono">Loading orgs…</span>
              </div>
            ) : !orgs || orgs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No GitHub orgs found. You need to be a member of at least one org.
              </p>
            ) : (
              <ul className="space-y-2">
                {orgs.map((org) => (
                  <li key={org.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(org.login)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors text-left",
                        selected === org.login
                          ? "border-primary/60 bg-primary/10"
                          : "border-border bg-background hover:border-primary/30 hover:bg-muted"
                      )}
                    >
                      {org.avatarUrl ? (
                        <Image
                          src={org.avatarUrl}
                          alt={org.login}
                          width={28}
                          height={28}
                          className="rounded-md border border-border shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                          <Building2 size={14} className="text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-mono font-medium text-foreground">{org.login}</div>
                        {org.description && (
                          <div className="text-[11px] text-muted-foreground truncate mt-0.5">{org.description}</div>
                        )}
                      </div>
                      {selected === org.login && (
                        <Check size={14} className="text-primary shrink-0" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* What happens */}
          <div className="space-y-2 rounded-lg bg-muted/50 border border-border/60 p-3">
            <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">What happens</p>
            {[
              "All org repos synced automatically",
              "Team members auto-detected on login",
              "You become org OWNER with full access",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-primary shrink-0" />
                <span className="text-xs text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => mutate()}
            disabled={isPending || !selected || isSuccess}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-background font-mono font-semibold text-sm disabled:opacity-60 hover:bg-primary/90 transition-colors"
          >
            {isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Connecting…
              </>
            ) : (
              <>
                <GitFork size={14} />
                {selected ? `Connect ${selected}` : "Select an org above"}
              </>
            )}
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground/50">
          Personal repos still available at{" "}
          <a href="/dashboard" className="text-primary/70 hover:text-primary transition-colors">
            /dashboard
          </a>
        </p>
      </div>
    </div>
  );
}
