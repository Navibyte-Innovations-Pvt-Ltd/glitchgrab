import { prisma } from "@/lib/db";

/**
 * Conversations and the 24-hour service window.
 *
 * The window is the single most consequential rule in the WhatsApp API and the
 * easiest to get wrong: free-form text is legal only within 24 hours of the
 * contact's last INBOUND message, and Meta answers 200 either way. Outside the
 * window a send is accepted, billed, and never delivered.
 *
 * So the window is stored, not inferred at send time from a scan of the message
 * log, and it is refreshed in the same write that records the inbound message.
 */

const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

/** E.164 digits, no plus — the shape Meta uses and the shape we key on. */
function normalizeContact(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Stop intent.
 *
 * Deliberately narrow. This flag suppresses every future marketing message, so a
 * false positive costs the tenant a customer they are allowed to contact. A bare
 * "no" is left alone — it is far more often an answer to a question than a
 * request to be left alone. Matching is anchored on phrasings that can mean
 * nothing else.
 *
 * Same shape as the digest mute intent in `lib/whatsapp.ts`, and narrow for the
 * same reason.
 */
const STOP_INTENT =
  /^(stop|unsubscribe|optout|opt-out|remove me|cancel subscription)\b|\b(stop messaging|don'?t message|do not message|do not contact|dont contact|unsubscribe me|remove my number|opt me out)\b/i;

const START_INTENT = /^(start|resume|subscribe|unstop)\b/i;

function detectOptOut(text: string): "out" | "in" | null {
  const t = text.trim();
  if (!t) return null;
  if (STOP_INTENT.test(t)) return "out";
  if (START_INTENT.test(t)) return "in";
  return null;
}

interface InboundResult {
  conversationId: string;
  optedOut: boolean;
  /** True when this message just re-opened the window (it always does). */
  windowExpiresAt: Date;
}

/**
 * Records an inbound message against its conversation.
 *
 * Every inbound refreshes the window and increments the unread count. Opt-out is
 * evaluated here rather than in the broadcast code, because Meta requires it to
 * be honoured across every marketing send — a tenant who has only phases 1–4
 * deployed must still stop messaging someone who asked them to.
 */
export async function recordInbound(params: {
  tenantId: string;
  contactPhone: string;
  contactName?: string;
  text?: string;
  at?: Date;
}): Promise<InboundResult> {
  const contactPhone = normalizeContact(params.contactPhone);
  const at = params.at ?? new Date();
  const windowExpiresAt = new Date(at.getTime() + SERVICE_WINDOW_MS);

  const intent = params.text ? detectOptOut(params.text) : null;

  const conversation = await prisma.waConversation.upsert({
    where: { tenantId_contactPhone: { tenantId: params.tenantId, contactPhone } },
    create: {
      tenantId: params.tenantId,
      contactPhone,
      contactName: params.contactName,
      lastInboundAt: at,
      windowExpiresAt,
      unreadCount: 1,
      optedOut: intent === "out",
      optedOutAt: intent === "out" ? at : null,
    },
    update: {
      contactName: params.contactName || undefined,
      lastInboundAt: at,
      windowExpiresAt,
      unreadCount: { increment: 1 },
      // Reopening a closed thread: a reply means the conversation is live again.
      status: "OPEN",
      ...(intent === "out" ? { optedOut: true, optedOutAt: at } : {}),
      ...(intent === "in" ? { optedOut: false, optedOutAt: null } : {}),
    },
    select: { id: true, optedOut: true },
  });

  return { conversationId: conversation.id, optedOut: conversation.optedOut, windowExpiresAt };
}

/** Records that we sent something, for inbox ordering. Never touches the window. */
export async function recordOutbound(params: {
  tenantId: string;
  contactPhone: string;
  at?: Date;
}): Promise<string> {
  const contactPhone = normalizeContact(params.contactPhone);
  const at = params.at ?? new Date();

  const conversation = await prisma.waConversation.upsert({
    where: { tenantId_contactPhone: { tenantId: params.tenantId, contactPhone } },
    create: { tenantId: params.tenantId, contactPhone, lastOutboundAt: at },
    update: { lastOutboundAt: at },
    select: { id: true },
  });

  return conversation.id;
}

interface WindowState {
  open: boolean;
  expiresAt: Date | null;
  optedOut: boolean;
  conversationId: string | null;
}

/**
 * Is free-form text legal for this contact right now?
 *
 * A conversation that has never had an inbound message has no window at all —
 * the correct answer there is "closed", not "unknown".
 */
export async function getWindowState(
  tenantId: string,
  contactPhone: string
): Promise<WindowState> {
  const conversation = await prisma.waConversation.findUnique({
    where: { tenantId_contactPhone: { tenantId, contactPhone: normalizeContact(contactPhone) } },
    select: { id: true, windowExpiresAt: true, optedOut: true },
  });

  if (!conversation) {
    return { open: false, expiresAt: null, optedOut: false, conversationId: null };
  }

  return {
    open: !!conversation.windowExpiresAt && conversation.windowExpiresAt.getTime() > Date.now(),
    expiresAt: conversation.windowExpiresAt,
    optedOut: conversation.optedOut,
    conversationId: conversation.id,
  };
}

/** Clears the unread badge. Does not touch WhatsApp read receipts. */
export async function markConversationRead(tenantId: string, conversationId: string) {
  await prisma.waConversation.updateMany({
    where: { id: conversationId, tenantId },
    data: { unreadCount: 0 },
  });
}
