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
import { Button } from "@/components/ui/button";
import { Check, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

interface Repo {
  id: string;
  fullName: string;
}

export function EditReposDialog({
  collaboratorId,
  email,
  currentRepoIds,
  allRepos,
}: {
  collaboratorId: string;
  email: string;
  currentRepoIds: string[];
  allRepos: Repo[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(currentRepoIds));
  const queryClient = useQueryClient();

  function toggleRepo(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const { data } = await axios.patch(`/api/v1/collaborators/${collaboratorId}/repos`, {
        repoIds: Array.from(selectedIds),
      });
      if (!data.success) throw new Error(data.error ?? "Failed to update");
      return data;
    },
    onSuccess: () => {
      toast.success(`Updated repos for ${email}`);
      queryClient.invalidateQueries({ queryKey: ["collaborators"] });
      setOpen(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    },
  });

  const hasChanges =
    selectedIds.size !== currentRepoIds.length ||
    !currentRepoIds.every((id) => selectedIds.has(id));

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setSelectedIds(new Set(currentRepoIds)); }}>
      <DialogTrigger render={<Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" />}>
        <Pencil className="h-3.5 w-3.5" />
        Edit repos
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit repo access for {email}</DialogTitle>
        </DialogHeader>

        <div className="max-h-60 overflow-y-auto space-y-1.5 rounded-md border p-2">
          {allRepos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No repos connected.
            </p>
          ) : (
            allRepos.map((repo) => {
              const selected = selectedIds.has(repo.id);
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

        <Button
          className="w-full"
          disabled={isPending || selectedIds.size === 0 || !hasChanges}
          onClick={() => mutate()}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Updating...
            </>
          ) : (
            `Update (${selectedIds.size} repo${selectedIds.size !== 1 ? "s" : ""})`
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
