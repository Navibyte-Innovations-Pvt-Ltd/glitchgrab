"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Repo {
  id: string;
  fullName: string;
}

/**
 * Paste raw project material — call notes, a WhatsApp thread, an email — and
 * distil it into project memory (#311 Phase A).
 *
 * This is the path that proves the value before any recording exists. When
 * Phase C lands, a transcript flows through the same distillation service.
 */
export function PasteNotesDialog({
  open,
  onOpenChange,
  repos,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repos: Repo[];
}) {
  const queryClient = useQueryClient();
  const [repoId, setRepoId] = useState(repos[0]?.id ?? "");
  const [text, setText] = useState("");
  // Notes are usually written up after the call — default to today, let the
  // user correct it, because occurredAt is what the timeline sorts on.
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 10));

  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post("/api/v1/project-context/distill", {
        repoId,
        mode: "manual",
        text,
        occurredAt: new Date(occurredAt).toISOString(),
      });
      return data.data as { itemsCreated: number };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["project-context"] });
      if (result.itemsCreated === 0) {
        toast.info("Nothing durable in those notes — nothing was added");
        return;
      }
      toast.success(`${result.itemsCreated} item${result.itemsCreated === 1 ? "" : "s"} added`);
      setText("");
      onOpenChange(false);
    },
    onError: (err) => {
      const message =
        axios.isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : "Could not distill notes";
      toast.error(message);
    },
  });

  const canSubmit = Boolean(repoId) && text.trim().length >= 20 && !mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm">Paste call notes</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
              Project
            </label>
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
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="context-occurred-at"
              className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground"
            >
              When it happened
            </label>
            <Input
              id="context-occurred-at"
              type="date"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="context-notes"
              className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground"
            >
              Notes
            </label>
            <Textarea
              id="context-notes"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              placeholder="Paste what was said — call notes, a WhatsApp thread, an email. Decisions, requests, complaints and promises get pulled out; the rest is dropped."
              className="font-mono text-xs resize-none"
            />
            <p className="font-mono text-[10px] text-muted-foreground/60">
              Nothing is invented — every item traces back to words in this text.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
              className="font-mono text-[11px] px-3 py-2 rounded border border-border hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => mutation.mutate()}
              className="inline-flex items-center gap-2 font-mono text-[11px] px-3 py-2 rounded border border-primary/50 text-primary hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {mutation.isPending ? "Distilling…" : "Distill"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
