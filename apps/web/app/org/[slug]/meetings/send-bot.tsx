"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Bot, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ContextRepo {
  id: string;
  fullName: string;
}

/**
 * Send the bot to a Google Meet call (#311).
 *
 * The bot joins as a visible participant and the host has to admit it — which
 * is also the consent record: everyone on the call sees it arrive.
 */
export function SendBot() {
  const queryClient = useQueryClient();
  const [meetUrl, setMeetUrl] = useState("");
  const [title, setTitle] = useState("");
  const [repoId, setRepoId] = useState("");

  const { data: repos = [] } = useQuery<ContextRepo[]>({
    queryKey: ["project-context", "repos"],
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/project-context?repos=1");
      return data.data ?? [];
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post("/api/v1/meetings/bot", {
        repoId: repoId || repos[0]?.id,
        meetUrl: meetUrl.trim(),
        title: title.trim() || null,
      });
      return data.data as { meetingId: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Bot is joining — admit it in the meeting");
      setMeetUrl("");
      setTitle("");
    },
    onError: (err) => {
      const message =
        axios.isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : "Could not send the bot";
      toast.error(message);
    },
  });

  const looksValid = /^https:\/\/meet\.google\.com\/[a-z0-9-]+/i.test(meetUrl.trim());
  const canSend = looksValid && repos.length > 0 && !mutation.isPending;

  if (repos.length === 0) return null;

  return (
    <div className="border border-border rounded p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Bot className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
          Send bot to a call
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
        <input
          type="url"
          value={meetUrl}
          onChange={(e) => setMeetUrl(e.target.value)}
          placeholder="https://meet.google.com/abc-defg-hij"
          className="font-mono text-xs px-2 py-2 rounded border border-border bg-background"
        />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Call name (optional)"
          className="font-mono text-xs px-2 py-2 rounded border border-border bg-background"
        />
        <select
          value={repoId || repos[0]?.id}
          onChange={(e) => setRepoId(e.target.value)}
          className="font-mono text-xs px-2 py-2 rounded border border-border bg-background"
        >
          {repos.map((r) => (
            <option key={r.id} value={r.id}>
              {r.fullName}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!canSend}
          onClick={() => mutation.mutate()}
          className={cn(
            "inline-flex items-center justify-center gap-2 font-mono text-[11px] px-3 py-2 rounded border",
            "border-primary/50 text-primary hover:bg-primary/10",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {mutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Bot className="w-3.5 h-3.5" />
          )}
          {mutation.isPending ? "Sending…" : "Send bot"}
        </button>
      </div>

      <p className="font-mono text-[10px] text-muted-foreground/60">
        The bot joins as a participant — someone in the call has to admit it.
        Everyone will see it there, which is your consent record.
      </p>
    </div>
  );
}
