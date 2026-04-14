"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { UserPlus, Loader2, Check, Mail, GitFork } from "lucide-react";
import { toast } from "sonner";

interface Repo {
  id: string;
  fullName: string;
}

interface InviteCollaboratorDialogProps {
  repos: Repo[];
}

export function InviteCollaboratorDialog({ repos }: InviteCollaboratorDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [selectedRepoIds, setSelectedRepoIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const allSelected = selectedRepoIds.size === repos.length && repos.length > 0;

  function toggleAll() {
    setSelectedRepoIds(allSelected ? new Set() : new Set(repos.map((r) => r.id)));
  }

  function toggleRepo(id: string) {
    const next = new Set(selectedRepoIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRepoIds(next);
  }

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post("/api/v1/collaborators/invite", {
        email,
        repoIds: Array.from(selectedRepoIds),
      });
      if (!data.success) throw new Error(data.error ?? "Failed to send invitation");
      return data;
    },
    onSuccess: () => {
      toast.success(`Invitation sent to ${email}`);
      queryClient.invalidateQueries({ queryKey: ["collaborators"] });
      setOpen(false);
      setEmail("");
      setSelectedRepoIds(new Set());
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to send invitation");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            className="shrink-0 gap-2 bg-foreground text-background hover:bg-foreground/90 rounded-[3px] px-3 py-1.5 text-sm font-medium"
          />
        }
      >
        <UserPlus className="h-4 w-4" />
        <span>Invite Collaborator</span>
        <span className="flex items-center gap-1 bg-background/10 rounded-xs px-1.5 py-0.5 text-[9px] font-mono text-background/60 border border-background/20 uppercase tracking-wider">
          <span>⌘</span>
          <span>I</span>
        </span>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            invite_collaborator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label
              htmlFor="collab-email"
              className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5"
            >
              <Mail className="h-3 w-3" />
              email address
            </Label>
            <Input
              id="collab-email"
              type="email"
              placeholder="collaborator@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <GitFork className="h-3 w-3" />
                select repositories
              </Label>
              {repos.length > 1 && (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="font-mono text-[10px] uppercase tracking-widest text-primary hover:text-primary/80"
                >
                  {allSelected ? "deselect all" : "select all"}
                </button>
              )}
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1 rounded border border-border bg-card/40 p-2">
              {repos.length === 0 ? (
                <p className="font-mono text-xs text-muted-foreground text-center py-4">
                  No repos connected. Connect a repo first.
                </p>
              ) : (
                repos.map((repo) => {
                  const selected = selectedRepoIds.has(repo.id);
                  return (
                    <button
                      key={repo.id}
                      type="button"
                      onClick={() => toggleRepo(repo.id)}
                      className={`flex items-center justify-between w-full rounded px-3 py-2 text-sm font-mono transition border ${
                        selected
                          ? "bg-primary/10 text-primary border-primary/30"
                          : "hover:bg-muted text-foreground border-transparent"
                      }`}
                    >
                      <span className="truncate">{repo.fullName}</span>
                      {selected && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <Button
            className="w-full font-mono text-[11px] uppercase tracking-widest"
            disabled={isPending || !email || selectedRepoIds.size === 0}
            onClick={() => mutate()}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                sending invitation...
              </>
            ) : (
              <>
                send invitation ({selectedRepoIds.size} repo
                {selectedRepoIds.size !== 1 ? "s" : ""})
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
