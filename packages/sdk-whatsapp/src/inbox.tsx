"use client";

import { useMemo, useState } from "react";
import { useInbox, type UseInboxOptions } from "./use-inbox";
import type { WaConversation, WaMessage } from "./types";

/**
 * A drop-in shared inbox.
 *
 * Styled with inline styles rather than a CSS file or a framework: this ships
 * into other people's apps, and a stylesheet that has to be imported (or a
 * Tailwind class that only works if they use Tailwind) is the fastest way to
 * make a "drop-in" component not drop in. Colours come from CSS custom
 * properties so a host can restyle without forking.
 */

export interface WhatsappInboxProps extends UseInboxOptions {
  height?: number | string;
  emptyLabel?: string;
}

const c = {
  border: "var(--gg-wa-border, #e4e6eb)",
  bg: "var(--gg-wa-bg, #ffffff)",
  panel: "var(--gg-wa-panel, #f7f8fa)",
  text: "var(--gg-wa-text, #111827)",
  muted: "var(--gg-wa-muted, #6b7280)",
  accent: "var(--gg-wa-accent, #128c7e)",
  bubbleIn: "var(--gg-wa-bubble-in, #ffffff)",
  bubbleOut: "var(--gg-wa-bubble-out, #d9fdd3)",
  danger: "var(--gg-wa-danger, #b42318)",
};

function messageText(message: WaMessage): string {
  const payload = message.payload as
    | { type?: string; body?: string; name?: string }
    | { messages?: { text?: { body?: string } }[] }
    | undefined;

  if (payload && "body" in payload && payload.body) return payload.body;
  if (payload && "name" in payload && payload.name) return `📄 ${payload.name}`;

  // Inbound rows store Meta's raw webhook value, which nests the text.
  const inbound = (payload as { messages?: { text?: { body?: string } }[] } | undefined)?.messages?.[0];
  return inbound?.text?.body ?? "(no text)";
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function ConversationRow(props: {
  conversation: WaConversation;
  active: boolean;
  onSelect: () => void;
}) {
  const { conversation: conv, active, onSelect } = props;
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "10px 12px",
        border: "none",
        borderBottom: `1px solid ${c.border}`,
        background: active ? c.panel : "transparent",
        cursor: "pointer",
        font: "inherit",
        color: c.text,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontWeight: conv.unreadCount > 0 ? 600 : 500, fontSize: 14 }}>
          {conv.contactName || conv.contactPhone}
        </span>
        <span style={{ fontSize: 11, color: c.muted, whiteSpace: "nowrap" }}>
          {timeLabel(conv.updatedAt)}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
        <span
          style={{
            fontSize: 12,
            color: c.muted,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {conv.lastMessage ? messageText(conv.lastMessage) : "—"}
        </span>
        {conv.unreadCount > 0 && (
          <span
            style={{
              background: c.accent,
              color: "#fff",
              borderRadius: 999,
              fontSize: 11,
              padding: "1px 6px",
            }}
          >
            {conv.unreadCount}
          </span>
        )}
        {/* Opted out is worth a permanent marker: it silently changes what an
            agent is allowed to send, and there is no error until they try. */}
        {conv.optedOut && (
          <span style={{ fontSize: 10, color: c.danger, border: `1px solid ${c.danger}`, borderRadius: 4, padding: "0 4px" }}>
            opted out
          </span>
        )}
      </div>
    </button>
  );
}

export function WhatsappInbox(props: WhatsappInboxProps) {
  const { height = 600, emptyLabel = "No conversations yet", ...options } = props;
  const inbox = useInbox(options);
  const [draft, setDraft] = useState("");

  const selected = inbox.selected;
  const windowOpen = selected?.windowOpen ?? false;

  const orderedMessages = useMemo(() => selected?.messages ?? [], [selected]);

  return (
    <div
      style={{
        display: "flex",
        height: typeof height === "number" ? `${height}px` : height,
        border: `1px solid ${c.border}`,
        borderRadius: 8,
        overflow: "hidden",
        background: c.bg,
        color: c.text,
        fontFamily:
          "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      <aside style={{ width: 280, borderRight: `1px solid ${c.border}`, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            padding: "10px 12px",
            borderBottom: `1px solid ${c.border}`,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <strong style={{ fontSize: 14, flex: 1 }}>Inbox</strong>
          {/* A dot rather than a label: agents need to know the feed is live,
              not read a status sentence on every render. */}
          <span
            title={inbox.connected ? "Live" : "Reconnecting…"}
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: inbox.connected ? c.accent : c.muted,
            }}
          />
        </header>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {inbox.loading && <p style={{ padding: 12, fontSize: 13, color: c.muted }}>Loading…</p>}
          {!inbox.loading && inbox.conversations.length === 0 && (
            <p style={{ padding: 12, fontSize: 13, color: c.muted }}>{emptyLabel}</p>
          )}
          {inbox.conversations.map((conv) => (
            <ConversationRow
              key={conv.id}
              conversation={conv}
              active={selected?.id === conv.id}
              onSelect={() => inbox.select(conv.id)}
            />
          ))}
        </div>
      </aside>

      <section style={{ flex: 1, display: "flex", flexDirection: "column", background: c.panel }}>
        {!selected && (
          <div style={{ margin: "auto", color: c.muted, fontSize: 14 }}>
            Select a conversation
          </div>
        )}

        {selected && (
          <>
            <header
              style={{
                padding: "10px 14px",
                borderBottom: `1px solid ${c.border}`,
                background: c.bg,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {selected.contactName || selected.contactPhone}
                </div>
                <div style={{ fontSize: 11, color: c.muted }}>{selected.contactPhone}</div>
              </div>

              {inbox.agents.length > 0 && (
                <select
                  value={selected.assignedAgentId ?? ""}
                  onChange={(e) => void inbox.assign(e.target.value || null)}
                  style={{ fontSize: 12, padding: "4px 6px", borderRadius: 6, border: `1px solid ${c.border}` }}
                >
                  <option value="">Unassigned</option>
                  {inbox.agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={selected.status}
                onChange={(e) => void inbox.setStatus(e.target.value as "OPEN" | "SNOOZED" | "CLOSED")}
                style={{ fontSize: 12, padding: "4px 6px", borderRadius: 6, border: `1px solid ${c.border}` }}
              >
                <option value="OPEN">Open</option>
                <option value="SNOOZED">Snoozed</option>
                <option value="CLOSED">Closed</option>
              </select>
            </header>

            <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              {orderedMessages.map((m) => {
                const outbound = m.direction === "OUTBOUND";
                return (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: outbound ? "flex-end" : "flex-start",
                      maxWidth: "72%",
                      background: outbound ? c.bubbleOut : c.bubbleIn,
                      border: `1px solid ${c.border}`,
                      borderRadius: 10,
                      padding: "7px 10px",
                    }}
                  >
                    <div style={{ fontSize: 13, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {messageText(m)}
                    </div>
                    <div style={{ fontSize: 10, color: m.status === "FAILED" ? c.danger : c.muted, marginTop: 3, textAlign: "right" }}>
                      {timeLabel(m.createdAt)}
                      {outbound && ` · ${m.status.toLowerCase()}`}
                    </div>
                  </div>
                );
              })}
            </div>

            <footer style={{ borderTop: `1px solid ${c.border}`, background: c.bg, padding: 10 }}>
              {inbox.error && (
                <p style={{ margin: "0 0 8px", fontSize: 12, color: c.danger }}>{inbox.error}</p>
              )}

              {/* The single most confusing thing about WhatsApp for an agent:
                  outside the 24-hour window free text is accepted by Meta and
                  never delivered. Saying so up front beats a silent failure. */}
              {!windowOpen ? (
                <p style={{ margin: 0, fontSize: 12, color: c.muted }}>
                  This contact hasn&apos;t messaged in the last 24 hours, so a free reply
                  can&apos;t be delivered. Send an approved template instead.
                </p>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const text = draft;
                    setDraft("");
                    void inbox.send(text);
                  }}
                  style={{ display: "flex", gap: 8 }}
                >
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Type a reply…"
                    disabled={inbox.sending}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: `1px solid ${c.border}`,
                      font: "inherit",
                      fontSize: 13,
                    }}
                  />
                  <button
                    type="submit"
                    disabled={inbox.sending || !draft.trim()}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 8,
                      border: "none",
                      background: c.accent,
                      color: "#fff",
                      fontSize: 13,
                      cursor: inbox.sending || !draft.trim() ? "not-allowed" : "pointer",
                      opacity: inbox.sending || !draft.trim() ? 0.6 : 1,
                    }}
                  >
                    {inbox.sending ? "Sending…" : "Send"}
                  </button>
                </form>
              )}
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
