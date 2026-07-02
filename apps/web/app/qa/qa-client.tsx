"use client";

import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Loader2, ExternalLink, LogOut } from "lucide-react";
import type { QaCheckView } from "@/lib/qa-view";

export function QaClient({
  token,
  testerName,
  orgName,
  checks,
  showLogout = false,
}: {
  token?: string;
  testerName: string;
  orgName: string;
  checks: QaCheckView[];
  showLogout?: boolean;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async ({ checkId, result }: { checkId: string; result: "PASS" | "FAIL" }) => {
      const { data } = await axios.post(`/api/v1/qa/checks/${checkId}`, { result, token });
      return data;
    },
    onMutate: ({ checkId }) => setPendingId(checkId),
    onSuccess: (_data, vars) => {
      toast.success(vars.result === "PASS" ? "Marked as passed" : "Marked as failed — developer notified");
      router.refresh();
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : "Something went wrong";
      toast.error(msg ?? "Something went wrong");
    },
    onSettled: () => setPendingId(null),
  });

  const logout = useMutation({
    mutationFn: async () => axios.post("/api/v1/qa/logout"),
    onSuccess: () => router.refresh(),
  });

  const pending = checks.filter((c) => c.status === "PENDING");
  const done = checks.filter((c) => c.status !== "PENDING");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-mono uppercase tracking-wide text-muted-foreground">QA Verification</div>
            <h1 className="mt-1 text-2xl font-semibold">Hi {testerName} 👋</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Fixes waiting for your check in <span className="font-medium text-foreground">{orgName}</span>.
              Try each one, then mark it Pass or Fail. Failing an item reopens the issue and pings the developer.
            </p>
          </div>
          {showLogout && (
            <Button size="sm" variant="ghost" onClick={() => logout.mutate()} disabled={logout.isPending}>
              {logout.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              Log out
            </Button>
          )}
        </header>

        {pending.length === 0 ? (
          <div className="rounded-lg border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
            🎉 Nothing to verify right now. You&apos;re all caught up.
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">To verify ({pending.length})</h2>
            {pending.map((c) => (
              <div key={c.id} className="rounded-lg border border-border bg-card p-4">
                <div className="min-w-0">
                  <a
                    href={c.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium hover:underline inline-flex items-center gap-1"
                  >
                    #{c.githubNumber} {c.title}
                    <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                  </a>
                  <div className="mt-0.5 text-[11px] font-mono text-muted-foreground/70">
                    {c.repoFullName}
                    {c.prNumber && <> · PR #{c.prNumber}</>}
                    {c.developerLogin && <> · by @{c.developerLogin}</>}
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => mutation.mutate({ checkId: c.id, result: "PASS" })}
                    disabled={mutation.isPending}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {pendingId === c.id && mutation.variables?.result === "PASS" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Pass
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => mutation.mutate({ checkId: c.id, result: "FAIL" })}
                    disabled={mutation.isPending}
                    className="flex-1"
                  >
                    {pendingId === c.id && mutation.variables?.result === "FAIL" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    Fail
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {done.length > 0 && (
          <div className="mt-8 space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">History</h2>
            {done.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-border bg-card/50 px-4 py-2.5 flex items-center justify-between gap-3"
              >
                <a
                  href={c.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm truncate hover:underline"
                >
                  #{c.githubNumber} {c.title}
                </a>
                <span
                  className={cn(
                    "font-mono text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wide shrink-0",
                    c.status === "PASS"
                      ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
                      : "text-red-500 border-red-500/30 bg-red-500/10"
                  )}
                >
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
