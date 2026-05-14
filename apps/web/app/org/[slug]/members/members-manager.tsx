"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Check, ChevronDown, Loader2, GitFork } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Repo { id: string; fullName: string; name: string }
interface Member {
  id: string;
  role: string;
  user: { id: string; name: string | null; email: string | null; image: string | null; githubLogin: string | null };
  repos: { repo: Repo }[];
}

export function MembersManager({
  members,
  orgRepos,
  orgSlug,
}: {
  members: Member[];
  orgRepos: Repo[];
  orgSlug: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Members</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Assign repos to each member. Members can only submit bugs for assigned repos.
        </p>
      </div>

      <div className="space-y-3">
        {members.map((m) => (
          <MemberRow key={m.id} member={m} orgRepos={orgRepos} orgSlug={orgSlug} />
        ))}
      </div>
    </div>
  );
}

function MemberRow({ member, orgRepos, orgSlug }: { member: Member; orgRepos: Repo[]; orgSlug: string }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(member.repos.map((r) => r.repo.id))
  );
  const qc = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (repoIds: string[]) => {
      await axios.patch(`/api/v1/orgs/${orgSlug}/members/${member.id}/repos`, { repoIds });
    },
    onSuccess: () => {
      toast.success("Repos updated");
      qc.invalidateQueries({ queryKey: ["org", orgSlug] });
    },
    onError: () => toast.error("Failed to update repos"),
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const isOwner = member.role === "OWNER";

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-3">
        <Avatar className="h-9 w-9 border border-border shrink-0">
          <AvatarImage src={member.user.image ?? undefined} />
          <AvatarFallback className="font-mono text-xs">
            {(member.user.name ?? member.user.githubLogin ?? "?").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">
              {member.user.name ?? member.user.githubLogin ?? "Unknown"}
            </span>
            <span className={cn(
              "font-mono text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wide shrink-0",
              isOwner ? "text-primary border-primary/30 bg-primary/10" : "text-muted-foreground border-border bg-muted"
            )}>
              {member.role}
            </span>
          </div>
          {member.user.githubLogin && (
            <div className="text-[11px] font-mono text-muted-foreground/70">@{member.user.githubLogin}</div>
          )}
        </div>

        {!isOwner && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded border border-border hover:border-primary/30"
          >
            <GitFork size={12} />
            <span>{selected.size} repo{selected.size !== 1 ? "s" : ""}</span>
            <ChevronDown size={12} className={cn("transition-transform", open && "rotate-180")} />
          </button>
        )}
      </div>

      {!isOwner && open && (
        <div className="border-t border-border/60 px-4 py-3 space-y-3">
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {orgRepos.length === 0 ? (
              <p className="text-xs text-muted-foreground">No repos in org yet.</p>
            ) : (
              orgRepos.map((repo) => (
                <label key={repo.id} className="flex items-center gap-2.5 cursor-pointer group py-1">
                  <div className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                    selected.has(repo.id)
                      ? "bg-primary border-primary"
                      : "border-border bg-background group-hover:border-primary/50"
                  )}>
                    {selected.has(repo.id) && <Check size={10} className="text-background" />}
                  </div>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={selected.has(repo.id)}
                    onChange={() => toggle(repo.id)}
                  />
                  <span className="text-sm text-foreground font-mono truncate">{repo.fullName}</span>
                </label>
              ))
            )}
          </div>
          <button
            type="button"
            onClick={() => mutate(Array.from(selected))}
            disabled={isPending}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-primary text-background text-xs font-mono font-semibold disabled:opacity-60 hover:bg-primary/90 transition-colors"
          >
            {isPending && <Loader2 size={12} className="animate-spin" />}
            Save
          </button>
        </div>
      )}
    </div>
  );
}
