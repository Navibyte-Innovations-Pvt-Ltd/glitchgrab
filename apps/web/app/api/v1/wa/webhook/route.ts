export const dynamic = "force-dynamic";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  ingestWebhook,
  markEventProcessed,
  verifyWebhookSignature,
  type RoutedEvent,
  type WebhookPayload,
} from "@/lib/wa/webhook";

/**
 * The single webhook endpoint for every tenant.
 *
 * Distinct from /api/v1/whatsapp/webhook, which serves Glitchgrab's own number
 * and its own Meta app. Different app secret, different verify token, different
 * routing model — do not merge them.
 *
 * Meta throttles the whole app when a handler is slow, so this returns 200
 * immediately and does the work after. A 500 here would make Meta retry every
 * tenant's traffic.
 */

/** Meta's subscription handshake. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // Same token as /api/v1/whatsapp/webhook — one Meta app, one verify token.
  const expected = process.env.META_WA_VERIFY_TOKEN;

  if (mode === "subscribe" && token && expected && token === expected) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  // Read raw: the HMAC is over the exact bytes Meta sent, so re-serialising
  // parsed JSON would change the body and fail every signature.
  const raw = await request.text();

  if (!verifyWebhookSignature(raw, request.headers.get("x-hub-signature-256"))) {
    console.error("[wa-webhook] signature verification failed");
    return new Response("Forbidden", { status: 403 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(raw) as WebhookPayload;
  } catch {
    // Malformed, but signed by us — 200 so Meta stops retrying something that
    // can never succeed.
    return new Response("OK", { status: 200 });
  }

  try {
    const events = await ingestWebhook(payload);
    for (const event of events) {
      await handleEvent(event);
    }
  } catch (err) {
    // Swallow: a 500 makes Meta back off the whole app, every tenant at once.
    // The event rows are already persisted, so nothing is lost.
    console.error("[wa-webhook] processing error:", err);
  }

  return new Response("OK", { status: 200 });
}

/**
 * Handles one event.
 *
 * Inbound message *content*, conversation windows and autoreplies land in phase
 * 4. Everything not handled here is still recorded by ingestWebhook() and marked
 * processed, so nothing is lost and nothing is retried forever.
 */
async function handleEvent(event: RoutedEvent): Promise<void> {
  try {
    if (event.field === "messages") {
      await handleMessagesEvent(event);
    }

    if (event.field === "message_template_status_update" && event.tenantId) {
      await handleTemplateStatusEvent(event);
    }

    if (event.field === "phone_number_quality_update" && event.phoneNumberId) {
      const rating = (event.value as { current_limit?: string; event?: string }).current_limit;
      await prisma.waNumber.updateMany({
        where: { phoneNumberId: event.phoneNumberId },
        data: { messagingLimitTier: rating },
      });
    }

    if (event.field === "account_update" && event.tenantId) {
      const kind = (event.value as { event?: string }).event;
      // Meta disabling a WABA is the one account event that must change what we
      // do: sends will fail from that moment, so the tenant is marked suspended
      // rather than left looking healthy.
      if (kind === "DISABLED_UPDATE" || kind === "ACCOUNT_VIOLATION") {
        await prisma.waTenant.update({
          where: { id: event.tenantId },
          data: { status: "SUSPENDED" },
        });
      }
    }

    await markEventProcessed(event.metaEventId);
  } catch (err) {
    await markEventProcessed(event.metaEventId, err instanceof Error ? err.message : "handler failed");
  }
}

/**
 * Delivery receipts and inbound messages.
 *
 * Statuses matter for two reasons: a message that never leaves SENT is
 * indistinguishable from one that failed, and a `failed` status is the only
 * signal that a charged message was never delivered — Meta accepts the send with
 * a 200 and reports the failure minutes later, here.
 *
 * Inbound messages are recorded rather than acted on. That row is what opens the
 * 24-hour service window `sendText()` checks, so it has to exist now even though
 * conversations and autoreplies are phase 4.
 */
async function handleMessagesEvent(event: RoutedEvent): Promise<void> {
  const value = event.value as {
    statuses?: { id?: string; status?: string; timestamp?: string; errors?: { title?: string }[] }[];
    messages?: { id?: string; from?: string; type?: string; timestamp?: string }[];
  };

  for (const s of value.statuses ?? []) {
    if (!s.id) continue;

    const when = s.timestamp ? new Date(Number(s.timestamp) * 1000) : new Date();

    if (s.status === "delivered") {
      await prisma.waMessage.updateMany({
        where: { metaMessageId: s.id },
        data: { status: "DELIVERED", deliveredAt: when },
      });
    } else if (s.status === "read") {
      // Read implies delivered; a read receipt can arrive without one.
      await prisma.waMessage.updateMany({
        where: { metaMessageId: s.id },
        data: { status: "READ", readAt: when },
      });
    } else if (s.status === "failed") {
      // Charged, never delivered. Phase 6 refunds off this; recorded now so the
      // ledger can be reconciled against it later.
      await prisma.waMessage.updateMany({
        where: { metaMessageId: s.id },
        data: { status: "FAILED", error: s.errors?.[0]?.title ?? "Delivery failed" },
      });
    }
  }

  if (!event.tenantId) return;

  for (const m of value.messages ?? []) {
    if (!m.id || !m.from) continue;

    await prisma.waMessage
      .create({
        data: {
          tenantId: event.tenantId,
          direction: "INBOUND",
          status: "DELIVERED",
          contactPhone: m.from.replace(/\D/g, ""),
          phoneNumberId: event.phoneNumberId,
          metaMessageId: m.id,
          payload: event.value as unknown as Prisma.InputJsonValue,
          createdAt: m.timestamp ? new Date(Number(m.timestamp) * 1000) : undefined,
        },
      })
      .catch(() => undefined); // already ingested
  }
}

/**
 * Meta's verdict on a template, pushed rather than polled.
 *
 * The cron still exists: this webhook is not guaranteed delivered, and a
 * template can be paused long after approval. Matching is by name+language
 * because the event does not always carry the template id.
 */
async function handleTemplateStatusEvent(event: RoutedEvent): Promise<void> {
  const value = event.value as {
    event?: string;
    message_template_name?: string;
    message_template_language?: string;
    reason?: string;
  };

  if (!value.message_template_name) return;

  const status =
    value.event === "APPROVED"
      ? "APPROVED"
      : value.event === "REJECTED"
        ? "REJECTED"
        : value.event === "PAUSED"
          ? "PAUSED"
          : value.event === "DISABLED"
            ? "DISABLED"
            : null;

  if (!status) return;

  await prisma.waTemplate.updateMany({
    where: {
      tenantId: event.tenantId!,
      name: value.message_template_name,
      ...(value.message_template_language ? { language: value.message_template_language } : {}),
    },
    data: {
      status,
      rejectionReason: value.reason ?? null,
      lastSyncedAt: new Date(),
    },
  });
}
