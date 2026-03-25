"use client";

import { useState } from "react";
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
import { useRouter } from "next/navigation";

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
  const [sending, setSending] = useState(false);
  const router = useRouter();

  const allSelected = selectedRepoIds.size === repos.length && repos.length > 0;

  function toggleAll() {
    if (allSelected) {
      setSelectedRepoIds(new Set());
    } else {
      setSelectedRepoIds(new Set(repos.map((r) => r.id)));
    }
  }

  function toggleRepo(id: string) {
    const next = new Set(selectedRepoIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedRepoIds(next);
  }

  async function handleInvite() {
    if (!email || selectedRepoIds.size === 0) {
      toast.error("Enter an email and select at least one repo");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/v1/collaborators/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          repoIds: Array.from(selectedRepoIds),
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(`Invitation sent to ${email}`);
        setOpen(false);
        setEmail("");
        setSelectedRepoIds(new Set());
        router.refresh();
      } else {
        toast.error(json.error ?? "Failed to send invitation");
      }
    } catch {
      toast.error("Failed to send invitation");
    } finally {
      setSending(false);
    }
  }

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
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={toggleAll}
                >
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
            disabled={sending || !email || selectedRepoIds.size === 0}
            onClick={handleInvite}
          >
            {sending ? (
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
