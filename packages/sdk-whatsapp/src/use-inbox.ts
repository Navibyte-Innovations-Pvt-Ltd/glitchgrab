"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WaAgent, WaConversation, WaMessage } from "./types";

/**
 * The inbox's data layer.
 *
 * Talks to *your* proxy route (see `createInboxHandler`), never to us directly —
 * except the SSE stream, which needs a long-lived connection and so goes to us
 * with a short-lived ticket your route mints.
 */

export interface UseInboxOptions {
  /** Where you mounted `createInboxHandler`. */
  api: string;
  /** Open this thread on mount. */
  initialConversationId?: string;
  /** Set false to load once and skip the live stream. */
  live?: boolean;
}

export interface UseInboxResult {
  conversations: WaConversation[];
  selected: (WaConversation & { messages: WaMessage[] }) | null;
  agents: WaAgent[];
  loading: boolean;
  sending: boolean;
  error: string | null;
  connected: boolean;
  select: (conversationId: string) => void;
  send: (text: string) => Promise<void>;
  assign: (agentId: string | null) => Promise<void>;
  setStatus: (status: "OPEN" | "SNOOZED" | "CLOSED") => Promise<void>;
  refresh: () => Promise<void>;
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body as T;
}

export function useInbox(options: UseInboxOptions): UseInboxResult {
  const { api, live = true } = options;
  const base = api.replace(/\/$/, "");

  const [conversations, setConversations] = useState<WaConversation[]>([]);
  const [selected, setSelected] = useState<(WaConversation & { messages: WaMessage[] }) | null>(null);
  const [agents, setAgents] = useState<WaAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const selectedIdRef = useRef<string | null>(options.initialConversationId ?? null);

  const refresh = useCallback(async () => {
    try {
      const data = await call<{ conversations: WaConversation[] }>(`${base}/conversations`);
      setConversations(data.conversations);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load conversations");
    } finally {
      setLoading(false);
    }
  }, [base]);

  const openThread = useCallback(
    async (conversationId: string) => {
      selectedIdRef.current = conversationId;
      try {
        const data = await call<{ conversation: WaConversation & { messages: WaMessage[] } }>(
          `${base}/conversations/${conversationId}`
        );
        setSelected(data.conversation);
        // Reading clears the badge server-side; mirror it so the list does not
        // keep showing an unread count until the next stream tick.
        setConversations((prev) =>
          prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not open conversation");
      }
    },
    [base]
  );

  useEffect(() => {
    void refresh();
    void call<{ agents: WaAgent[] }>(`${base}/agents`)
      .then((d) => setAgents(d.agents))
      .catch(() => undefined); // seats are optional; the inbox works without them
    if (options.initialConversationId) void openThread(options.initialConversationId);
  }, [base, refresh, openThread, options.initialConversationId]);

  /**
   * The live stream.
   *
   * `EventSource` reconnects on its own and replays `Last-Event-ID`, so a
   * dropped connection resumes rather than losing messages. The server closes
   * the stream deliberately before the platform's function timeout; that arrives
   * as a `reconnect` event and is a normal part of the lifecycle, not an error.
   */
  useEffect(() => {
    if (!live) return;

    let source: EventSource | null = null;
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | null = null;

    const connect = async () => {
      if (cancelled) return;
      try {
        const session = await call<{ ticket: string; baseUrl: string }>(`${base}/ticket`, {
          method: "POST",
        });
        if (cancelled) return;

        source = new EventSource(
          `${session.baseUrl}/api/v1/wa/inbox/stream?ticket=${encodeURIComponent(session.ticket)}`
        );

        source.addEventListener("ready", () => setConnected(true));

        source.addEventListener("conversation", (event) => {
          const updated = JSON.parse((event as MessageEvent).data) as WaConversation;
          setConversations((prev) => {
            const rest = prev.filter((c) => c.id !== updated.id);
            return [updated, ...rest];
          });
          // Refresh the open thread so a new message appears in it, not just in
          // the list beside it.
          if (selectedIdRef.current === updated.id) void openThread(updated.id);
        });

        source.addEventListener("reconnect", () => {
          source?.close();
          setConnected(false);
          // Immediate: the server closed on purpose and a new ticket is needed.
          retry = setTimeout(connect, 100);
        });

        source.onerror = () => {
          setConnected(false);
          source?.close();
          // The ticket may simply have expired, so reconnect rather than
          // surfacing an error the user cannot act on.
          retry = setTimeout(connect, 3000);
        };
      } catch {
        if (!cancelled) retry = setTimeout(connect, 5000);
      }
    };

    void connect();

    return () => {
      cancelled = true;
      if (retry) clearTimeout(retry);
      source?.close();
    };
  }, [base, live, openThread]);

  const send = useCallback(
    async (text: string) => {
      if (!selected || !text.trim()) return;
      setSending(true);
      try {
        await call(`${base}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: selected.contactPhone, body: text }),
        });
        await openThread(selected.id);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not send");
      } finally {
        setSending(false);
      }
    },
    [base, selected, openThread]
  );

  const patch = useCallback(
    async (body: Record<string, unknown>) => {
      if (!selected) return;
      try {
        await call(`${base}/conversations/${selected.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        await openThread(selected.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update conversation");
      }
    },
    [base, selected, openThread]
  );

  return {
    conversations,
    selected,
    agents,
    loading,
    sending,
    error,
    connected,
    select: (id) => void openThread(id),
    send,
    assign: (agentId) => patch({ assignedAgentId: agentId }),
    setStatus: (status) => patch({ status }),
    refresh,
  };
}
