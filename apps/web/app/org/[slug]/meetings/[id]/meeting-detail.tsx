"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { ArrowLeft, Copy, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface MeetingDetail {
  id: string;
  repoFullName: string;
  title: string | null;
  meetUrl: string | null;
  startsAt: string | null;
  durationSec: number | null;
  transcript: string | null;
  transcriptStatus: "IDLE" | "RUNNING" | "DONE" | "FAILED";
  transcriptError: string | null;
  recorder: string | null;
  botStatus: string | null;
  botError: string | null;
  tabAudioUrl: string | null;
  micAudioUrl: string | null;
}

export function MeetingDetail({ meetingId, orgSlug }: { meetingId: string; orgSlug: string }) {
  const { data, isLoading, error } = useQuery<MeetingDetail>({
    queryKey: ["meetings", meetingId],
    queryFn: async () => {
      const { data } = await axios.get(`/api/v1/meetings/${meetingId}`);
      return data.data;
    },
    // Opening this page nudges the Sarvam job server-side, so polling while it
    // runs is also what drives it to completion.
    refetchInterval: (query) =>
      query.state.data?.transcriptStatus === "RUNNING" ? 20_000 : false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 font-mono text-[11px] text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        loading call…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="border border-red-500/30 bg-red-500/5 rounded p-8 text-center">
        <p className="font-mono text-[11px] text-red-400">Could not load this call.</p>
      </div>
    );
  }

  async function copyTranscript() {
    if (!data?.transcript) return;
    await navigator.clipboard.writeText(data.transcript);
    toast.success("Transcript copied");
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/org/${orgSlug}/meetings`}
        className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-3 h-3" />
        all calls
      </Link>

      <div>
        <h1 className="text-xl font-medium text-foreground">{data.title || "Untitled call"}</h1>
        <div className="flex flex-wrap gap-3 mt-1 font-mono text-[10px] text-muted-foreground/70">
          <span>{data.repoFullName}</span>
          <span>{data.startsAt ? new Date(data.startsAt).toLocaleString() : "—"}</span>
          {data.meetUrl && <span className="truncate max-w-xs">{data.meetUrl}</span>}
        </div>
      </div>

      {/* A bot that never got into the call is the most common failure, and
          the reason is the only thing that makes it fixable. Show it loudly. */}
      {data.botStatus === "FAILED" && (
        <div className="border border-red-500/30 bg-red-500/5 rounded p-4 space-y-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400/70" />
            <span className="font-mono text-[11px] text-red-400">The bot could not record this call.</span>
          </div>
          <p className="font-mono text-[11px] text-foreground">
            {data.botError ?? "No reason was reported."}
          </p>
          <p className="font-mono text-[10px] text-muted-foreground">
            Common causes: nobody pressed Admit within 10 minutes, the meeting
            link was wrong, or Google changed Meet&apos;s UI.
          </p>
        </div>
      )}

      {/* Two tracks, played separately — they were never mixed, because which
          track a line came from is what identifies the speaker. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <AudioTrack label="Client (call audio)" url={data.tabAudioUrl} />
        <AudioTrack label="You (microphone)" url={data.micAudioUrl} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
            Transcript
          </h2>
          {data.transcript && (
            <button
              type="button"
              onClick={copyTranscript}
              className="inline-flex items-center gap-1.5 font-mono text-[10px] px-2 py-1 rounded border border-border hover:border-primary/50"
            >
              <Copy className="w-3 h-3" />
              Copy
            </button>
          )}
        </div>

        {data.transcriptStatus === "RUNNING" && (
          <div className="border border-amber-500/30 bg-amber-500/5 rounded p-6 text-center">
            <Loader2 className="w-5 h-5 mx-auto animate-spin text-amber-400/70" />
            <p className="font-mono text-[11px] text-amber-400 mt-2">Transcribing…</p>
            <p className="font-mono text-[10px] text-muted-foreground mt-1">
              A one-hour call takes a few minutes. This page refreshes itself.
            </p>
          </div>
        )}

        {data.transcriptStatus === "FAILED" && (
          <div className="border border-red-500/30 bg-red-500/5 rounded p-6 text-center space-y-1">
            <AlertTriangle className="w-5 h-5 mx-auto text-red-400/70" />
            <p className="font-mono text-[11px] text-red-400">Transcription failed.</p>
            {data.transcriptError && (
              <p className="font-mono text-[10px] text-muted-foreground">{data.transcriptError}</p>
            )}
            <p className="font-mono text-[10px] text-muted-foreground">
              The audio is still stored — nothing was lost.
            </p>
          </div>
        )}

        {data.transcriptStatus === "IDLE" && !data.transcript && (
          <p className="font-mono text-[11px] text-muted-foreground py-6 text-center border border-border rounded">
            No transcript for this call.
          </p>
        )}

        {data.transcript && (
          <pre className="border border-border rounded p-4 text-xs text-foreground whitespace-pre-wrap leading-relaxed font-mono overflow-x-auto">
            {data.transcript}
          </pre>
        )}
      </div>
    </div>
  );
}

function AudioTrack({ label, url }: { label: string; url: string | null }) {
  return (
    <div className="border border-border rounded p-3 space-y-2">
      <div className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
        {label}
      </div>
      {url ? (
         
        <audio controls src={url} className="w-full" preload="none" />
      ) : (
        <p className="font-mono text-[10px] text-muted-foreground/60">not recorded</p>
      )}
    </div>
  );
}
