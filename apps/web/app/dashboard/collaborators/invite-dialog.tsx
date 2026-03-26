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
import { Plus, Loader2, Check } from "lucide-react";
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
      <DialogTrigger render={<Button size="sm" className="gap-1.5 shrink-0" />}>
        <Plus className="h-4 w-4" />
        Invite
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Invite Collaborator</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="collab-email">Email address</Label>
            <Input
              id="collab-email"
              type="email"
              placeholder="collaborator@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select repositories</Label>
              {repos.length > 1 && (
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={toggleAll}>
                  {allSelected ? "Deselect all" : "Select all"}
                </Button>
              )}
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-md border p-2">
              {repos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
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
                      className={`flex items-center justify-between w-full rounded-md px-3 py-2 text-sm transition ${
                        selected
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted text-foreground"
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
            className="w-full"
            disabled={isPending || !email || selectedRepoIds.size === 0}
            onClick={() => mutate()}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Sending invitation...
              </>
            ) : (
              `Send invitation (${selectedRepoIds.size} repo${selectedRepoIds.size !== 1 ? "s" : ""})`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
