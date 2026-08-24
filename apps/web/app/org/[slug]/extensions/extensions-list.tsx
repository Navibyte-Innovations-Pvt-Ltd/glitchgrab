"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  AlertTriangle,
  Blocks,
  Check,
  Clock,
  ExternalLink,
  FileWarning,
  Link2,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ReviewState = "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "NEEDS_ATTENTION" | "UNKNOWN";

interface ExtensionRow {
  id: string;
  name: string;
  itemId: string;
  publisherId: string;
  repoFullName: string | null;
  state: ReviewState;
  stateDetail: string | null;
  publishedVersion: string | null;
  submittedVersion: string | null;
  stateSince: string | null;
  lastCheckedAt: string | null;
  lastError: string | null;
  connectedAs: string;
}

interface ContextRepo {
  id: string;
  fullName: string;
}

interface StoreConnection {
  id: string;
  googleEmail: string;
  lastError: string | null;
}

/**
 * What the store says, in the words a developer actually uses. "Draft" is the
 * one that matters: it reads as harmless and means nobody has your release.
 */
const STATE_LABEL: Record<ReviewState, string> = {
  PUBLISHED: "live",
  IN_REVIEW: "in review",
  DRAFT: "draft — not submitted",
  NEEDS_ATTENTION: "needs attention",
  UNKNOWN: "not read yet",
};

const STATE_STYLE: Record<ReviewState, string> = {
  PUBLISHED: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
  IN_REVIEW: "border-amber-500/40 text-amber-400 bg-amber-500/10",
  // Amber, not grey: a draft is the silent failure, and grey reads as "fine".
  DRAFT: "border-amber-500/40 text-amber-400 bg-amber-500/10",
  NEEDS_ATTENTION: "border-red-500/40 text-red-400 bg-red-500/10",
  UNKNOWN: "border-border text-muted-foreground",
};

const STATE_ICON: Record<ReviewState, typeof Check> = {
  PUBLISHED: Check,
  IN_REVIEW: Loader2,
  DRAFT: FileWarning,
  NEEDS_ATTENTION: AlertTriangle,
  UNKNOWN: Clock,
};

function relative(iso: string | null): string {
  if (!iso) return "never";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/**
 * Connect the Google account that can see the store listings.
 *
 * One connection covers every extension on that publisher account. The
 * alternative — a downloaded service-account key — also required a *group*
 * publisher account to add that key as a user, which a personal publisher
 * account cannot do at all. This asks for a click instead of a file.
 */
function ConnectAccount({ connections }: { connections: StoreConnection[] }) {
  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post("/api/v1/extensions/connect");
      return data.data as { url: string };
    },
    onSuccess: ({ url }) => {
      // Full navigation, not a popup: Google refuses consent inside an iframe,
      // and a popup is the thing browsers block.
      window.location.href = url;
    },
    onError: () => toast.error("Could not start the connection"),
  });

  const broken = connections.find((c) => c.lastError);

  return (
    <div className="border border-border rounded p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
              Chrome Web Store access
            </span>
          </div>
          <div className="font-mono text-[11px] text-muted-foreground/80 mt-1">
            {connections.length === 0
              ? "No Google account connected yet."
              : connections.map((c) => c.googleEmail).join(", ")}
          </div>
        </div>

        <button
          type="button"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
          className="inline-flex items-center gap-2 font-mono text-[11px] px-3 py-2 rounded border border-primary/50 text-primary hover:bg-primary/10 disabled:opacity-50 shrink-0"
        >
          {mutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Link2 className="w-3.5 h-3.5" />
          )}
          {connections.length === 0 ? "Connect Google account" : "Connect another"}
        </button>
      </div>

      {broken && (
        <div className="font-mono text-[10px] text-red-400/90">
          {broken.googleEmail} stopped working — reconnect it. {broken.lastError}
        </div>
      )}

      <p className="font-mono text-[10px] text-muted-foreground/60">
        Read-only access: Glitchgrab can see what the store says about your
        extensions and nothing else — it cannot publish.
      </p>
    </div>
  );
}

/** Register an extension to watch. Collapsed until asked for — most people add one, once. */
function AddExtension({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [itemId, setItemId] = useState("");
  const [publisherId, setPublisherId] = useState("");
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
      const { data } = await axios.post("/api/v1/extensions", {
        name: name.trim(),
        itemId: itemId.trim(),
        publisherId: publisherId.trim(),
        repoId: repoId || null,
      });
      return data.data;
    },
    onSuccess: () => {
      toast.success("Watching it — first reading within 30 minutes");
      setName("");
      setItemId("");
      setPublisherId("");
      setOpen(false);
      onDone();
    },
    onError: (err) => {
      toast.error(
        axios.isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : "Could not save it"
      );
    },
  });

  const ready = name.trim() && /^[a-p]{32}$/.test(itemId.trim()) && publisherId.trim();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 font-mono text-[11px] px-3 py-2 rounded border border-primary/50 text-primary hover:bg-primary/10"
      >
        <Plus className="w-3.5 h-3.5" />
        Watch an extension
      </button>
    );
  }

  return (
    <div className="border border-border rounded p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Blocks className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
          Watch an extension
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name — e.g. Glitchgrab Capture"
          className="font-mono text-xs px-2 py-2 rounded border border-border bg-background"
        />
        <select
          value={repoId}
          onChange={(e) => setRepoId(e.target.value)}
          className="font-mono text-xs px-2 py-2 rounded border border-border bg-background"
        >
          <option value="">No project</option>
          {repos.map((r) => (
            <option key={r.id} value={r.id}>
              {r.fullName}
            </option>
          ))}
        </select>
        <input
          value={itemId}
          onChange={(e) => setItemId(e.target.value)}
          placeholder="Extension id (32 letters)"
          className="font-mono text-xs px-2 py-2 rounded border border-border bg-background"
        />
        <input
          value={publisherId}
          onChange={(e) => setPublisherId(e.target.value)}
          placeholder="Publisher id"
          className="font-mono text-xs px-2 py-2 rounded border border-border bg-background"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!ready || mutation.isPending}
          onClick={() => mutation.mutate()}
          className="inline-flex items-center gap-2 font-mono text-[11px] px-3 py-2 rounded border border-primary/50 text-primary hover:bg-primary/10 disabled:opacity-50"
        >
          {mutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          {mutation.isPending ? "Saving…" : "Start watching"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="font-mono text-[11px] px-3 py-2 rounded border border-border text-muted-foreground hover:border-primary/30"
        >
          Cancel
        </button>
      </div>

      <p className="font-mono text-[10px] text-muted-foreground/60">
        Extension id is the 32 letters in the store URL. Publisher id is in the
        developer dashboard under Account. The store API cannot list them —
        there is no endpoint for it, so they have to be typed once.
      </p>
    </div>
  );
}

function DeleteExtension({ id, name }: { id: string; name: string }) {
  const queryClient = useQueryClient();
  const [armed, setArmed] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => axios.delete(`/api/v1/extensions/${id}`),
    onSuccess: () => {
      toast.success(`Stopped watching ${name}`);
      void queryClient.invalidateQueries({ queryKey: ["store-extensions"] });
    },
    onError: () => toast.error("Could not remove it"),
  });

  // Two-step rather than a confirm dialog: deleting forgets the key, so it
  // deserves a pause, but a modal for one row is heavier than the action.
  return (
    <button
      type="button"
      disabled={mutation.isPending}
      onClick={() => (armed ? mutation.mutate() : setArmed(true))}
      onBlur={() => setArmed(false)}
      className={cn(
        "font-mono text-[9px] tracking-widest uppercase px-2 min-h-8 rounded border shrink-0 inline-flex items-center gap-1 disabled:opacity-50",
        armed
          ? "border-red-500/40 text-red-400 bg-red-500/10"
          : "border-border text-muted-foreground hover:border-red-500/40 hover:text-red-400"
      )}
    >
      {mutation.isPending ? (
        <Loader2 className="w-2.5 h-2.5 animate-spin" />
      ) : (
        <Trash2 className="w-2.5 h-2.5" />
      )}
      {armed ? "confirm" : "remove"}
    </button>
  );
}

export function ExtensionsList() {
  const queryClient = useQueryClient();

  const { data: connections = [] } = useQuery<StoreConnection[]>({
    queryKey: ["store-connections"],
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/extensions/connections");
      return data.data ?? [];
    },
  });

  const { data: extensions = [], isLoading } = useQuery<ExtensionRow[]>({
    queryKey: ["store-extensions"],
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/extensions");
      return data.data ?? [];
    },
    // Review outcomes move on the scale of hours; the cron does the watching.
    refetchInterval: 5 * 60_000,
  });

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["store-extensions"] });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 font-mono text-[11px] text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        loading extensions…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ConnectAccount connections={connections} />

      {/* Adding an extension before there is an account to read it with would
          only ever end in a refusal, so the form waits. */}
      {connections.length > 0 && <AddExtension onDone={refresh} />}

      {extensions.length === 0 ? (
        <div className="border border-border rounded p-8 text-center space-y-3">
          <Blocks className="w-6 h-6 mx-auto text-muted-foreground/50" />
          <p className="font-mono text-[11px] text-muted-foreground">
            No extensions watched yet.
          </p>
          <p className="font-mono text-[11px] text-muted-foreground/70 max-w-md mx-auto">
            Add one and Glitchgrab watches the Chrome Web Store for you — a WhatsApp
            when it goes live, when Google rejects it, and when a version has been
            sitting in Draft since yesterday.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {extensions.map((e) => {
            const Icon = STATE_ICON[e.state];
            return (
              <div key={e.id} className="border border-border rounded p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-[1_1_14rem]">
                    <div className="text-sm text-foreground truncate">{e.name}</div>
                    <div className="flex flex-wrap items-center gap-3 mt-1 font-mono text-[10px] text-muted-foreground/70">
                      {e.repoFullName && <span>{e.repoFullName}</span>}
                      <span>live v{e.publishedVersion ?? "—"}</span>
                      {e.submittedVersion && e.submittedVersion !== e.publishedVersion && (
                        <span className="text-amber-400/80">waiting v{e.submittedVersion}</span>
                      )}
                      <span>checked {relative(e.lastCheckedAt)}</span>
                      <span>via {e.connectedAs}</span>
                    </div>
                    {(e.stateDetail || e.lastError) && (
                      <div
                        className={cn(
                          "font-mono text-[10px] mt-1",
                          e.lastError ? "text-red-400/90" : "text-muted-foreground/80"
                        )}
                      >
                        {e.lastError ?? e.stateDetail}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                    {/* The store listing is where every one of these states is
                        actually resolved. A page that names an extension and
                        offers no way to open it just makes you go find it. */}
                    <a
                      href={`https://chrome.google.com/webstore/devconsole/detail/${e.itemId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[9px] tracking-widest uppercase px-2 min-h-8 rounded border shrink-0 inline-flex items-center gap-1 border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
                    >
                      <ExternalLink className="w-2.5 h-2.5" />
                      console
                    </a>
                    <span
                      className={cn(
                        "font-mono text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded border shrink-0 inline-flex items-center gap-1",
                        STATE_STYLE[e.state]
                      )}
                    >
                      <Icon
                        className={cn("w-2.5 h-2.5", e.state === "IN_REVIEW" && "animate-spin")}
                      />
                      {STATE_LABEL[e.state]}
                    </span>
                    <DeleteExtension id={e.id} name={e.name} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
