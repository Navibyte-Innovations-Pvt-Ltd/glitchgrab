"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { Loader2, Building2, GitFork, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function OrgSetupClient() {
  const [orgLogin, setOrgLogin] = useState("");
  const router = useRouter();

  const { mutate, isPending, isSuccess } = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post("/api/v1/orgs", { githubOrgLogin: orgLogin.trim() });
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
            All repos in the org will be automatically synced. Team members who log in with GitHub will be detected.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              GitHub Org Login
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 focus-within:border-primary/50 transition-colors">
              <span className="text-muted-foreground font-mono text-sm">github.com/</span>
              <input
                type="text"
                value={orgLogin}
                onChange={(e) => setOrgLogin(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && orgLogin.trim() && mutate()}
                placeholder="your-org"
                className="flex-1 bg-transparent text-foreground font-mono text-sm outline-none placeholder:text-muted-foreground/40"
                autoFocus
              />
            </div>
            <p className="text-[11px] text-muted-foreground/70 font-mono">
              Must be an org you have access to on GitHub
            </p>
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
            disabled={isPending || !orgLogin.trim() || isSuccess}
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
                Connect Org
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
