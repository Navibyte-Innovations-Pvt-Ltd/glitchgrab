"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import {
  AlertTriangle,
  Check,
  ExternalLink,
  Loader2,
  MessageSquare,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

/**
 * Issues from a call (#issue-from-meeting).
 *
 * A meeting is where the work gets decided; the transcript is where that
 * decision usually dies. This panel is the bridge — but deliberately NOT an
 * automatic one. Every draft here is unfiled and stays unfiled until a human
 * presses the button, because the failure this feature has to survive is the
 * model hearing "attendance" and confidently writing an issue about biometric
 * hardware when the room meant a WhatsApp check-in. Correcting that is the
 * feature; the extraction is just the first draft.
 */

interface Quote {
  speaker?: string;
  text: string;
  tMs?: number;
}

interface DraftFrame {
  id: string;
  tMs: number;
  url: string | null;
}

interface Draft {
  id: string;
  title: string;
  body: string;
  labels: string[];
  quotes: Quote[];
  status: "DRAFT" | "CREATED" | "DISCARDED";
  corrections: { role: "user" | "assistant"; content: string }[];
  frames: DraftFrame[];
  githubNumber: number | null;
  githubUrl: string | null;
}

interface DraftsResponse {
  drafts: Draft[];
  frameCount: number;
  extractedAt: string | null;
  canExtract: boolean;
  hasRepo: boolean;
}

function stamp(tMs?: number): string {
  if (typeof tMs !== "number") return "";
  const total = Math.round(tMs / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function MeetingIssues({ meetingId }: { meetingId: string }) {
  const queryClient = useQueryClient();
  const key = ["meetings", meetingId, "issue-drafts"];
  // null means "nobody has touched the checkboxes yet", which reads as all
  // pending drafts selected. Storing an empty Set instead would make a page
  // refresh silently deselect everything and grey out the Create button —
  // the state most people are in when they come back to finish filing.
  const [selected, setSelected] = useState<Set<string> | null>(null);

  const { data, isLoading } = useQuery<DraftsResponse>({
    queryKey: key,
    queryFn: async () => {
      const { data } = await axios.get(`/api/v1/meetings/${meetingId}/issue-drafts`);
      return data.data;
    },
  });

  const extract = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post(`/api/v1/meetings/${meetingId}/issue-drafts`);
      return data.data as { drafts: Draft[]; framesUsed: number };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: key });
      // Back to the default: everything selected. Matches what people actually
      // do — read the panel, throw out the wrong one, file the rest.
      setSelected(null);
      toast.success(
        result.drafts.length
          ? `${result.drafts.length} draft ${result.drafts.length === 1 ? "issue" : "issues"} from this call`
          : "Nothing in this call looked like work to file"
      );
    },
    onError: (err) => {
      toast.error(
        axios.isAxiosError(err) ? err.response?.data?.error ?? "Could not read this call." : "Could not read this call."
      );
    },
  });

  const create = useMutation({
    mutationFn: async (draftIds: string[]) => {
      const { data } = await axios.post(`/api/v1/meetings/${meetingId}/issue-drafts/create`, {
        draftIds,
      });
      return data.data as { created: { number: number }[]; failed: { title: string }[] };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: key });
      // A call's issues land in the repo's lists too — that page must not keep
      // showing yesterday's count.
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      setSelected(null);
      if (result.created.length) toast.success(`Filed ${result.created.length} on GitHub`);
      for (const f of result.failed) toast.error(`Could not file "${f.title}"`);
    },
    onError: (err) => {
      toast.error(
        axios.isAxiosError(err) ? err.response?.data?.error ?? "Could not file these." : "Could not file these."
      );
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-2 py-6 font-mono text-[11px] text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        loading issues…
      </div>
    );
  }

  const drafts = data.drafts.filter((d) => d.status !== "DISCARDED");
  const pending = drafts.filter((d) => d.status === "DRAFT");
  const filed = drafts.filter((d) => d.status === "CREATED");
  const pendingIds = pending.map((d) => d.id);
  const isSelected = (id: string) => (selected ? selected.has(id) : true);
  const selectedIds = pendingIds.filter(isSelected);

  const toggle = (id: string) =>
    setSelected((prev) => {
      // First touch materialises the implicit "all" into a real set, so
      // unticking one draft does not read as unticking every draft.
      const next = new Set(prev ?? pendingIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
          Issues from this call
        </h2>

        <button
          type="button"
          onClick={() => extract.mutate()}
          disabled={extract.isPending || !data.canExtract}
          className="inline-flex items-center gap-1.5 font-mono text-[10px] px-2.5 py-1.5 rounded border border-border hover:border-primary/50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {extract.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3" />
          )}
          {extract.isPending
            ? "reading the call…"
            : data.extractedAt
              ? "read it again"
              : "get issues from this call"}
        </button>
      </div>

      {!data.canExtract && (
        <p className="font-mono text-[10px] text-muted-foreground border border-border rounded p-3">
          Waiting for the transcript. The assistant reads the words, not the audio.
        </p>
      )}

      {data.canExtract && !data.extractedAt && (
        <p className="font-mono text-[10px] text-muted-foreground border border-border rounded p-3">
          Reads the transcript{data.frameCount > 0 ? ` and ${data.frameCount} screenshots from the call` : ""}, then
          drafts one issue per thing that was asked for. Nothing reaches GitHub until you say so.
          {data.frameCount === 0 &&
            " This call has no screenshots — they are taken while a call records, so only calls recorded since this shipped have them."}
        </p>
      )}

      {!data.hasRepo && drafts.length > 0 && (
        <div className="flex items-start gap-2 border border-amber-500/30 bg-amber-500/5 rounded p-3">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400/70 mt-0.5 shrink-0" />
          <p className="font-mono text-[10px] text-amber-400">
            This call is not filed to a project yet, so there is no repo to open issues in. File it
            first and these drafts stay as they are.
          </p>
        </div>
      )}

      {extract.isPending && (
        <p className="font-mono text-[10px] text-muted-foreground">
          A long call takes a minute or two — it is reading the whole transcript and the screenshots.
        </p>
      )}

      {drafts.map((draft) => (
        <DraftCard
          key={draft.id}
          meetingId={meetingId}
          draft={draft}
          selected={isSelected(draft.id)}
          onToggle={() => toggle(draft.id)}
          queryKey={key}
        />
      ))}

      {data.extractedAt && drafts.length === 0 && (
        <p className="font-mono text-[11px] text-muted-foreground py-6 text-center border border-border rounded">
          Nothing in this call looked like work to file.
        </p>
      )}

      {pending.length > 0 && (
        // Sticky, because the decision this button represents is the end of a
        // scroll through four long drafts — burying it under them means
        // scrolling back up every time.
        <div className="sticky bottom-4 flex items-center justify-between gap-3 border border-border bg-background/95 backdrop-blur rounded p-3">
          <span className="font-mono text-[10px] text-muted-foreground">
            {selectedIds.length} of {pending.length} selected
            {filed.length > 0 && ` · ${filed.length} already filed`}
          </span>
          <button
            type="button"
            onClick={() => create.mutate(selectedIds)}
            disabled={create.isPending || selectedIds.length === 0 || !data.hasRepo}
            className="inline-flex items-center gap-1.5 font-mono text-[10px] px-3 py-1.5 rounded bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {create.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Check className="w-3 h-3" />
            )}
            {create.isPending ? "filing…" : `create ${selectedIds.length} on GitHub`}
          </button>
        </div>
      )}
    </div>
  );
}

function DraftCard({
  meetingId,
  draft,
  selected,
  onToggle,
  queryKey,
}: {
  meetingId: string;
  draft: Draft;
  selected: boolean;
  onToggle: () => void;
  queryKey: unknown[];
}) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [showChat, setShowChat] = useState(false);
  const filed = draft.status === "CREATED";

  const correct = useMutation({
    mutationFn: async (text: string) => {
      const { data } = await axios.post(
        `/api/v1/meetings/${meetingId}/issue-drafts/${draft.id}/chat`,
        { message: text }
      );
      return data.data as { reply: string };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey });
      setMessage("");
      toast.success(result.reply);
    },
    onError: (err) => {
      toast.error(
        axios.isAxiosError(err)
          ? err.response?.data?.error ?? "The assistant could not rewrite it."
          : "The assistant could not rewrite it."
      );
    },
  });

  const discard = useMutation({
    mutationFn: async () => {
      await axios.delete(`/api/v1/meetings/${meetingId}/issue-drafts/${draft.id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => toast.error("Could not discard it."),
  });

  return (
    <div
      className={`border rounded p-3 space-y-2.5 ${
        filed ? "border-green-500/30 bg-green-500/5" : selected ? "border-primary/50" : "border-border"
      }`}
    >
      <div className="flex items-start gap-2.5">
        {!filed && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="mt-0.5 w-4 h-4 accent-primary cursor-pointer"
            aria-label={`Select ${draft.title}`}
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground leading-snug">{draft.title}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {draft.labels.map((l) => (
              <span
                key={l}
                className="font-mono text-[9px] px-1.5 py-0.5 rounded border border-border text-muted-foreground"
              >
                {l}
              </span>
            ))}
            {filed && draft.githubUrl && (
              <a
                href={draft.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono text-[9px] text-green-400 hover:underline"
              >
                #{draft.githubNumber}
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
        </div>

        {!filed && (
          <button
            type="button"
            onClick={() => discard.mutate()}
            disabled={discard.isPending}
            title="Discard this draft"
            className="-m-2 p-2 text-muted-foreground/60 hover:text-red-400 disabled:opacity-40"
          >
            {discard.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>

      <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap leading-relaxed font-mono border-l border-border pl-3">
        {draft.body}
      </pre>

      {draft.quotes.length > 0 && (
        // The evidence, always visible. A wrong draft is nearly always traceable
        // to one sentence, and reading that sentence is faster than arguing.
        <div className="space-y-1">
          {draft.quotes.map((q, i) => (
            <p key={i} className="font-mono text-[10px] text-muted-foreground/80">
              <span className="text-muted-foreground/50">{stamp(q.tMs)} </span>
              {q.speaker && <span className="text-foreground/70">{q.speaker}: </span>}
              {q.text}
            </p>
          ))}
        </div>
      )}

      {draft.frames.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {draft.frames.map((f) =>
            f.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={f.id}
                src={f.url}
                alt={`Call at ${stamp(f.tMs)}`}
                className="h-20 rounded border border-border shrink-0"
              />
            ) : null
          )}
        </div>
      )}

      {draft.corrections.length > 0 && (
        <div className="space-y-1 border-t border-border pt-2">
          {draft.corrections.map((c, i) => (
            <p
              key={i}
              className={`font-mono text-[10px] ${
                c.role === "user" ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {c.role === "user" ? "you: " : "assistant: "}
              {c.content}
            </p>
          ))}
        </div>
      )}

      {!filed &&
        (showChat ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (message.trim()) correct.mutate(message.trim());
            }}
            className="flex flex-wrap items-center gap-2"
          >
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              autoFocus
              placeholder="attendance here means WhatsApp check-in, not a biometric device"
              className="flex-1 bg-transparent border border-border rounded px-2 py-1.5 font-mono text-[10px] text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 outline-none"
            />
            <button
              type="submit"
              disabled={correct.isPending || !message.trim()}
              className="inline-flex items-center gap-1.5 font-mono text-[10px] px-3 py-2 rounded border border-border hover:border-primary/50 disabled:opacity-40"
            >
              {correct.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              {correct.isPending ? "rewriting…" : "fix it"}
            </button>
            <button
              type="button"
              onClick={() => setShowChat(false)}
              className="-m-2 p-2 text-muted-foreground/60 hover:text-foreground"
              aria-label="Close correction box"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowChat(true)}
            className="inline-flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground hover:text-foreground"
          >
            <MessageSquare className="w-3 h-3" />
            that&apos;s not what we meant
          </button>
        ))}
    </div>
  );
}
