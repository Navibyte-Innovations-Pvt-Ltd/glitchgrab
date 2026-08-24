"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { Loader2, Mic, Radio, FileText, AlertTriangle, Bot, Square } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";


interface ContextRepo {
  id: string;
  fullName: string;
}

/**
 * File a recording that was made before it had a project.
 *
 * The counterpart to "Record without a project": a first call about a prospect
 * is worth recording and has nothing correct to file it under yet. Filing is
 * the same move the in-call badge makes — it only changes where the recording
 * lands, never the audio or the transcript.
 */
function FileToProject({ meetingId }: { meetingId: string }) {
  const queryClient = useQueryClient();

  const { data: repos = [] } = useQuery<ContextRepo[]>({
    queryKey: ["project-context", "repos"],
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/project-context?repos=1");
      return data.data ?? [];
    },
  });

  const mutation = useMutation({
    mutationFn: async (repoId: string) => {
      const { data } = await axios.patch(`/api/v1/meetings/${meetingId}/repo`, { repoId });
      return data;
    },
    onSuccess: () => {
      // The row moves out of "no project yet" and into a project — both the
      // list and any per-project view of it are now stale.
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
  });

  return (
    <select
      // Inside a Link — without this, choosing a project navigates instead.
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onChange={(e) => {
        e.preventDefault();
        if (e.target.value) mutation.mutate(e.target.value);
      }}
      disabled={mutation.isPending || repos.length === 0}
      defaultValue=""
      className="bg-transparent border border-amber-500/40 text-amber-400 rounded px-1 py-0.5 font-mono text-[10px]"
    >
      <option value="">{mutation.isPending ? "filing…" : "no project yet — file it"}</option>
      {repos.map((r) => (
        <option key={r.id} value={r.id} className="bg-background text-foreground">
          {r.fullName}
        </option>
      ))}
    </select>
  );
}

interface MeetingRow {
  id: string;
  /** Null while the call is unfiled — recorded before it had a project. */
  repoId: string | null;
  repoFullName: string;
  title: string | null;
  startsAt: string | null;
  durationSec: number | null;
  status: string | null;
  transcriptStatus: "IDLE" | "RUNNING" | "DONE" | "FAILED";
  hasRecording: boolean;
  createdAt: string;
  recorder: string | null;
  botStatus: string | null;
  botError: string | null;
}

/**
 * What the bot is doing right now. WAITING_ADMIT is the one that matters: it
 * needs a human to press Admit inside Meet, and a bare spinner gives them no
 * reason to.
 */
const BOT_LABEL: Record<string, string> = {
  DISPATCHING: "sending bot…",
  JOINING: "bot is joining…",
  WAITING_ADMIT: "admit the bot in Meet",
  RECORDING: "bot is recording",
  UPLOADING: "saving recording…",
  DONE: "",
  FAILED: "bot failed",
};

/**
 * Phases where a live job exists to stop. DISPATCHING is excluded on purpose —
 * for those few seconds the bot service has not created the job yet, so the
 * button would only ever report that nothing is running.
 */
const STOPPABLE = ["JOINING", "WAITING_ADMIT", "RECORDING"];

/**
 * Get the bot out of a call it should have left.
 *
 * The bot decides on its own when everyone has gone by reading a Meet DOM
 * Google rewrites without notice — and every check in it errs towards keeping
 * the recording. When that goes wrong the bot sits in the client's call for
 * hours, visible to everyone in it. This is the button that ends it, and the
 * audio recorded so far is still kept.
 */
function StopBot({ meetingId }: { meetingId: string }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post(`/api/v1/meetings/${meetingId}/stop`);
      return data;
    },
    onSuccess: () => {
      toast.success("Bot is leaving the call — the recording so far is kept");
      void queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
    onError: (error) => {
      const message =
        axios.isAxiosError(error) && error.response?.data?.error
          ? String(error.response.data.error)
          : "Could not reach the bot service";
      toast.error(message);
      void queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
  });

  return (
    <button
      type="button"
      disabled={mutation.isPending}
      onClick={(e) => {
        // The whole row is a link to the meeting — stopping the bot must not
        // navigate away from the list it was pressed on.
        e.preventDefault();
        e.stopPropagation();
        mutation.mutate();
      }}
      // Taller than the badges beside it on purpose: it is the only pressable
      // thing in the row, and a 14px target is not one. Neutral until hovered —
      // a red control here would read as "this recording failed", which is what
      // the red badge further along the row actually means.
      className="font-mono text-[9px] tracking-widest uppercase px-2 min-h-8 rounded border shrink-0 inline-flex items-center gap-1 border-border text-muted-foreground hover:border-red-500/40 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50"
    >
      {mutation.isPending ? (
        <Loader2 className="w-2.5 h-2.5 animate-spin" />
      ) : (
        <Square className="w-2.5 h-2.5" />
      )}
      {mutation.isPending ? "stopping…" : "stop"}
    </button>
  );
}

/** Below this, filters are clutter — the whole list fits on screen. */
const FILTER_THRESHOLD = 10;

function formatDuration(sec: number | null): string {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

const TRANSCRIPT_LABEL: Record<MeetingRow["transcriptStatus"], string> = {
  IDLE: "no transcript",
  RUNNING: "transcribing…",
  DONE: "transcript ready",
  FAILED: "transcription failed",
};

const TRANSCRIPT_STYLE: Record<MeetingRow["transcriptStatus"], string> = {
  IDLE: "border-border text-muted-foreground",
  RUNNING: "border-amber-500/40 text-amber-400 bg-amber-500/10",
  DONE: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
  FAILED: "border-red-500/40 text-red-400 bg-red-500/10",
};

/** Empty once the bot is finished — its state stops being news at that point. */
function botLabel(m: MeetingRow): string {
  if (m.recorder !== "bot" || !m.botStatus) return "";
  return BOT_LABEL[m.botStatus] ?? "";
}

export function MeetingsList({ orgSlug }: { orgSlug: string }) {
  const [repoFilter, setRepoFilter] = useState<string | null>(null);

  const { data: meetings = [], isLoading, error } = useQuery<MeetingRow[]>({
    queryKey: ["meetings"],
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/meetings");
      return data.data ?? [];
    },
    // A call being transcribed resolves in minutes, so a slow poll beats making
    // the user refresh to find out.
    refetchInterval: (query) =>
      (query.state.data ?? []).some(
        (m) =>
          m.transcriptStatus === "RUNNING" ||
          (m.recorder === "bot" && m.botStatus !== null && !["DONE", "FAILED"].includes(m.botStatus))
      )
        ? 8_000
        : false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 font-mono text-[11px] text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        loading calls…
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-500/30 bg-red-500/5 rounded p-8 text-center space-y-2">
        <AlertTriangle className="w-6 h-6 mx-auto text-red-400/60" />
        <p className="font-mono text-[11px] text-red-400">Could not load calls.</p>
        <p className="font-mono text-[11px] text-muted-foreground">
          If this is a fresh deploy, run <code className="text-foreground">bun run db:deploy</code>.
        </p>
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="border border-border rounded p-8 text-center space-y-3">
        <Radio className="w-6 h-6 mx-auto text-muted-foreground/50" />
        <p className="font-mono text-[11px] text-muted-foreground">No recorded calls yet.</p>
        <div className="font-mono text-[11px] text-muted-foreground/70 space-y-2 max-w-md mx-auto text-left">
          <p className="text-foreground">Two ways to record:</p>
          <p>
            <span className="text-foreground">Bot</span> — paste the Meet link above,
            or connect Google Calendar and booked calls record themselves. Someone
            admits the bot in Meet and it does the rest.
          </p>
          <p>
            <span className="text-foreground">Extension</span> — open the meeting tab,
            click the Glitchgrab extension, pick the project, press Record. Needs you
            present with Chrome open.
          </p>
        </div>
      </div>
    );
  }

  const repos = Array.from(new Set(meetings.map((m) => m.repoFullName).filter(Boolean))).sort();
  const filtered = repoFilter ? meetings.filter((m) => m.repoFullName === repoFilter) : meetings;
  const showFilters = meetings.length > FILTER_THRESHOLD && repos.length > 1;

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setRepoFilter(null)}
            className={cn(
              "font-mono text-[10px] px-2 py-1 rounded border transition-colors",
              !repoFilter
                ? "border-primary/50 text-primary bg-primary/10"
                : "border-border text-muted-foreground hover:border-primary/30"
            )}
          >
            all projects
          </button>
          {repos.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setRepoFilter(repoFilter === name ? null : name)}
              className={cn(
                "font-mono text-[10px] px-2 py-1 rounded border transition-colors",
                repoFilter === name
                  ? "border-primary/50 text-primary bg-primary/10"
                  : "border-border text-muted-foreground hover:border-primary/30"
              )}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((m) => (
          <Link
            key={m.id}
            href={`/org/${orgSlug}/meetings/${m.id}`}
            className="block border border-border rounded p-3 hover:border-primary/40 transition-colors"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              {/* Grows on a wide row, but keeps a 14rem base so the badge
                  cluster wraps to its own line on a phone instead of shrinking
                  the title to "Meet - …". */}
              <div className="min-w-0 flex-[1_1_14rem]">
                <div className="text-sm text-foreground truncate">
                  {m.title || "Untitled call"}
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1 font-mono text-[10px] text-muted-foreground/70">
                  {m.repoId ? (
                    <span>{m.repoFullName}</span>
                  ) : (
                    <FileToProject meetingId={m.id} />
                  )}
                  <span>
                    {m.startsAt ? new Date(m.startsAt).toLocaleString() : "—"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Mic className="w-3 h-3" />
                    {formatDuration(m.durationSec)}
                  </span>
                  {m.recorder === "bot" && (
                    <span className="inline-flex items-center gap-1">
                      <Bot className="w-3 h-3" />
                      bot
                    </span>
                  )}
                </div>
                {m.botStatus === "FAILED" && m.botError && (
                  <div className="font-mono text-[10px] text-red-400/90 mt-1">
                    {m.botError}
                  </div>
                )}
              </div>

              {/* Button and badges wrap as one cluster. As three separate
                  shrink-0 children they squeezed the title down to a
                  two-character ellipsis on a phone. */}
              <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                {m.recorder === "bot" && STOPPABLE.includes(m.botStatus ?? "") && (
                  <StopBot meetingId={m.id} />
                )}

                {botLabel(m) && (
                <span
                  className={cn(
                    "font-mono text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded border shrink-0 inline-flex items-center gap-1",
                    m.botStatus === "FAILED"
                      ? "border-red-500/40 text-red-400 bg-red-500/10"
                      : "border-amber-500/40 text-amber-400 bg-amber-500/10"
                  )}
                >
                  {m.botStatus !== "FAILED" && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                  {botLabel(m)}
                </span>
              )}

              <span
                className={cn(
                  "font-mono text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded border shrink-0 inline-flex items-center gap-1",
                  TRANSCRIPT_STYLE[m.transcriptStatus]
                )}
              >
                {m.transcriptStatus === "RUNNING" ? (
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                ) : (
                  <FileText className="w-2.5 h-2.5" />
                )}
                {TRANSCRIPT_LABEL[m.transcriptStatus]}
              </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
