"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { Loader2, Mic, Radio, FileText, AlertTriangle, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface MeetingRow {
  id: string;
  repoId: string;
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
        ? 15_000
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
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm text-foreground truncate">
                  {m.title || "Untitled call"}
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1 font-mono text-[10px] text-muted-foreground/70">
                  <span>{m.repoFullName}</span>
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
              </div>

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
          </Link>
        ))}
      </div>
    </div>
  );
}
