"use client";

import { useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Webhook,
  Plus,
  Trash2,
  Copy,
  Check,
  Link2,
  Save,
  AlertTriangle,
  Key,
} from "lucide-react";
import { toast } from "sonner";
import { createWebhook, deleteWebhook, listWebhooks } from "./webhook-actions";
import { copyToClipboard } from "@/lib/clipboard";

const AVAILABLE_EVENTS = [
  { value: "issue.created", label: "Issue Created" },
  { value: "issue.updated", label: "Issue Updated" },
  { value: "issue.closed", label: "Issue Closed" },
  { value: "issue.commented", label: "Developer Commented on GitHub" },
];

interface WebhookInfo {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: Date;
}

export function WebhookForm() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    "issue.created",
  ]);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creating, startCreate] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: webhooks = [], isLoading: loading } = useQuery<WebhookInfo[]>({
    queryKey: ["webhooks"],
    queryFn: () => listWebhooks(),
    staleTime: 30_000,
  });

  function toggleEvent(event: string) {
    setSelectedEvents((prev) =>
      prev.includes(event)
        ? prev.filter((e) => e !== event)
        : [...prev, event]
    );
  }

  function handleCreate() {
    if (!url.trim()) {
      toast.error("Please enter a webhook URL");
      return;
    }
    if (selectedEvents.length === 0) {
      toast.error("Select at least one event");
      return;
    }

    startCreate(async () => {
      try {
        const result = await createWebhook(url.trim(), selectedEvents);
        setNewSecret(result.secret);
        setUrl("");
        setSelectedEvents(["issue.created"]);
        queryClient.invalidateQueries({ queryKey: ["webhooks"] });
        toast.success("Webhook created");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to create webhook"
        );
      }
    });
  }

  async function handleDelete(webhookId: string) {
    setDeletingId(webhookId);
    try {
      await deleteWebhook(webhookId);
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook deleted");
    } catch {
      toast.error("Failed to delete webhook");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCopySecret() {
    if (!newSecret) return;
    await copyToClipboard(newSecret);
    setCopied(true);
    toast.success("Secret copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <section className="rounded border border-border bg-card">
        <header className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <Webhook className="h-3 w-3" />
            WEBHOOKS
          </h2>
        </header>
        <div className="p-5">
          <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            loading...
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="rounded border border-border bg-card">
        <header className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <Webhook className="h-3 w-3" />
            WEBHOOKS
          </h2>
          {!showForm && !newSecret && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="font-mono text-[10px] uppercase tracking-widest text-primary border border-primary/40 bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded inline-flex items-center gap-1.5 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add Webhook
            </button>
          )}
        </header>

        <div className="p-5 space-y-5">
          {/* Show secret after creation (one-time display) */}
          {newSecret && (
            <div className="rounded border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Key className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <p className="font-mono text-[10px] uppercase tracking-widest text-amber-500">
                  Webhook Secret — copy now, won&apos;t be shown again
                </p>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded border border-border bg-background/60 px-3 py-2 text-xs font-mono text-foreground break-all">
                  {newSecret}
                </code>
                <button
                  type="button"
                  onClick={handleCopySecret}
                  className="shrink-0 h-9 w-9 rounded border border-border bg-background/60 hover:border-primary/50 hover:text-primary text-muted-foreground inline-flex items-center justify-center transition-colors"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNewSecret(null);
                  setShowForm(false);
                }}
                className="font-mono text-[10px] uppercase tracking-widest text-primary border border-primary/40 bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded transition-colors"
              >
                Done
              </button>
            </div>
          )}

          {/* Create form */}
          {showForm && !newSecret && (
            <div className="rounded border border-border bg-background/40 p-5 space-y-5">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="webhook-url"
                  className="text-sm font-medium text-foreground"
                >
                  Webhook URL
                </label>
                <p className="font-mono text-[10px] text-muted-foreground">
                  HTTPS endpoint that receives event payloads.
                </p>
                <div className="border border-border rounded bg-background/60 focus-within:border-primary/50 transition-colors">
                  <input
                    id="webhook-url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/webhooks/glitchgrab"
                    className="w-full bg-transparent px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">
                  Events
                </label>
                <p className="font-mono text-[10px] text-muted-foreground">
                  Pick which events trigger a POST to your URL.
                </p>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_EVENTS.map((event) => {
                    const active = selectedEvents.includes(event.value);
                    return (
                      <label
                        key={event.value}
                        className={`flex items-center gap-2 rounded border px-3 py-1.5 text-xs cursor-pointer transition-colors font-mono ${
                          active
                            ? "border-primary/50 bg-primary/10 text-primary"
                            : "border-border bg-background/60 text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleEvent(event.value)}
                          className="accent-primary h-3 w-3"
                        />
                        {event.label}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating}
                  className="font-mono text-[10px] uppercase tracking-widest text-primary border border-primary/40 bg-primary/5 hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded inline-flex items-center gap-1.5 transition-colors"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <kbd className="border border-primary/40 bg-primary/10 px-1 rounded text-[9px]">
                        <Save className="h-2.5 w-2.5 inline" />S
                      </kbd>
                      Save
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setUrl("");
                    setSelectedEvents(["issue.created"]);
                  }}
                  className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground border border-border bg-background/60 hover:border-border px-3 py-1.5 rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Existing webhooks list */}
          {webhooks.length === 0 && !showForm && !newSecret ? (
            <div className="rounded border border-dashed border-border p-8 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center mb-3">
                <Webhook className="h-4 w-4 text-muted-foreground" />
              </div>
              <h3 className="font-mono text-xs text-foreground mb-1">
                No webhooks configured
              </h3>
              <p className="font-mono text-[10px] text-muted-foreground max-w-sm">
                Add one to get notified when issues are created, updated, or
                closed.
              </p>
            </div>
          ) : (
            webhooks.length > 0 && (
              <div className="space-y-2">
                {webhooks.map((webhook) => (
                  <div
                    key={webhook.id}
                    className="flex items-start justify-between gap-3 rounded border border-border bg-background/40 p-3"
                  >
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-xs font-mono text-foreground truncate">
                          {webhook.url}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {webhook.events.map((event) => (
                          <span
                            key={event}
                            className="inline-flex items-center px-1.5 py-px rounded border border-border bg-muted text-[10px] font-mono text-muted-foreground"
                          >
                            {event}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                      onClick={() => handleDelete(webhook.id)}
                      disabled={deletingId === webhook.id}
                    >
                      {deletingId === webhook.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </section>

      {/* DANGER ZONE */}
      <section
        className="rounded border border-red-900/40 bg-red-950/10 p-5 relative overflow-hidden"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(239,68,68,0.03) 10px, rgba(239,68,68,0.03) 11px)",
        }}
      >
        <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-red-500 mb-2 flex items-center gap-2">
          <AlertTriangle className="h-3 w-3" />
          DANGER ZONE
        </h3>
        <p className="font-mono text-[11px] text-muted-foreground mb-4 max-w-lg">
          Deleting all webhooks permanently removes delivery configuration.
          Individual webhooks can be removed above. Account deletion is handled
          via support.
        </p>
        <button
          type="button"
          disabled
          className="bg-red-950/40 border border-red-900/50 text-red-500 px-4 py-2 font-mono text-[10px] uppercase tracking-widest rounded disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Delete Account (contact support)
        </button>
      </section>
    </>
  );
}
