"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Webhook,
  Plus,
  Trash2,
  Copy,
  Check,
  Globe,
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
  const [webhooks, setWebhooks] = useState<WebhookInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    "issue.created",
  ]);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creating, startCreate] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadWebhooks();
  }, []);

  function loadWebhooks() {
    listWebhooks()
      .then(setWebhooks)
      .catch(() => toast.error("Failed to load webhooks"))
      .finally(() => setLoading(false));
  }

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
        loadWebhooks();
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
      setWebhooks((prev) => prev.filter((w) => w.id !== webhookId));
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Webhooks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            Webhooks
          </CardTitle>
          {!showForm && !newSecret && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Webhook
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Show secret after creation (one-time display) */}
        {newSecret && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
            <p className="text-sm font-medium">
              Webhook Secret — copy it now, it won&apos;t be shown again
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-muted px-3 py-2 text-xs font-mono break-all">
                {newSecret}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopySecret}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setNewSecret(null);
                setShowForm(false);
              }}
            >
              Done
            </Button>
          </div>
        )}

        {/* Create form */}
        {showForm && !newSecret && (
          <div className="rounded-lg border p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <Input
                id="webhook-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/webhooks/glitchgrab"
              />
            </div>

            <div className="space-y-2">
              <Label>Events</Label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_EVENTS.map((event) => (
                  <label
                    key={event.value}
                    className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm cursor-pointer transition-colors ${
                      selectedEvents.includes(event.value)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(event.value)}
                      onChange={() => toggleEvent(event.value)}
                      className="accent-primary"
                    />
                    {event.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCreate}
                disabled={creating}
                size="sm"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    Creating...
                  </>
                ) : (
                  "Create Webhook"
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  setUrl("");
                  setSelectedEvents(["issue.created"]);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Existing webhooks list */}
        {webhooks.length === 0 && !showForm && !newSecret ? (
          <p className="text-sm text-muted-foreground">
            No webhooks configured. Add one to get notified when issues are
            created, updated, or closed.
          </p>
        ) : (
          <div className="space-y-3">
            {webhooks.map((webhook) => (
              <div
                key={webhook.id}
                className="flex items-start justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm font-mono truncate">
                      {webhook.url}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {webhook.events.map((event) => (
                      <Badge
                        key={event}
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {event}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-destructive hover:text-destructive h-8 w-8"
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
        )}
      </CardContent>
    </Card>
  );
}
