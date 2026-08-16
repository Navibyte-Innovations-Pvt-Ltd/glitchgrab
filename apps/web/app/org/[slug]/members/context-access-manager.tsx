"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Brain, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Repo {
  id: string;
  fullName: string;
}

interface OrgUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
}

interface Grant {
  id: string;
  userId: string;
}

/**
 * Who can read a project's context (#311 Phase A).
 *
 * Deliberately separate from org membership: being in the org grants nothing
 * here. Client-call material — decisions, complaints, promises — is more
 * sensitive than a bug report, so each person is attached to each project
 * explicitly. The repo owner is implicit and never listed.
 */
export function ContextAccessManager({
  repos,
  users,
}: {
  repos: Repo[];
  users: OrgUser[];
}) {
  const queryClient = useQueryClient();
  const [repoId, setRepoId] = useState(repos[0]?.id ?? "");

  const { data: grants = [], isLoading } = useQuery<Grant[]>({
    queryKey: ["context-access", repoId],
    queryFn: async () => {
      const { data } = await axios.get(`/api/v1/project-context/access?repoId=${repoId}`);
      return data.data ?? [];
    },
    enabled: Boolean(repoId),
  });

  const grantMutation = useMutation({
    mutationFn: async ({ userId, grant }: { userId: string; grant: boolean }) => {
      if (grant) {
        await axios.post("/api/v1/project-context/access", { repoId, userId });
      } else {
        await axios.delete(`/api/v1/project-context/access?repoId=${repoId}&userId=${userId}`);
      }
    },
    onSuccess: (_res, { grant }) => {
      queryClient.invalidateQueries({ queryKey: ["context-access", repoId] });
      // The grantee's own timeline scope changes too.
      queryClient.invalidateQueries({ queryKey: ["project-context"] });
      toast.success(grant ? "Context access granted" : "Context access revoked");
    },
    onError: (err) => {
      const message =
        axios.isAxiosError(err) && err.response?.status === 404
          ? "Only the repo owner can change context access"
          : "Could not update access";
      toast.error(message);
    },
  });

  const busyUserId = grantMutation.isPending ? grantMutation.variables?.userId : null;
  const grantedIds = new Set(grants.map((g) => g.userId));

  if (repos.length === 0) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Brain className="w-4 h-4 text-muted-foreground" />
          Context access
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Who can read a project&apos;s memory — client decisions, requests and promises.
          Being in this org is not enough; attach each person to each project.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {repos.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRepoId(r.id)}
            className={cn(
              "font-mono text-[10px] px-2 py-1 rounded border transition-colors",
              repoId === r.id
                ? "border-primary/50 text-primary bg-primary/10"
                : "border-border text-muted-foreground hover:border-primary/30"
            )}
          >
            {r.fullName}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          loading access…
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => {
            const granted = grantedIds.has(u.id);
            const busy = busyUserId === u.id;

            return (
              <div
                key={u.id}
                className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-3"
              >
                <Avatar className="h-8 w-8 border border-border shrink-0">
                  <AvatarImage src={u.image ?? undefined} />
                  <AvatarFallback className="font-mono text-xs">
                    {(u.name ?? u.email ?? "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground truncate">
                    {u.name ?? u.email ?? "Unknown"}
                  </div>
                  {u.email && (
                    <div className="text-[11px] font-mono text-muted-foreground/60 truncate">
                      {u.email}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => grantMutation.mutate({ userId: u.id, grant: !granted })}
                  className={cn(
                    "inline-flex items-center gap-1.5 font-mono text-[10px] px-2.5 py-1.5 rounded border shrink-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                    granted
                      ? "border-primary/50 text-primary bg-primary/10 hover:border-red-500/50 hover:text-red-400"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {busy && <Loader2 className="w-3 h-3 animate-spin" />}
                  {busy ? "saving…" : granted ? "has access" : "grant access"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
