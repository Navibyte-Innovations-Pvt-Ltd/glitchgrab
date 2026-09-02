import { createHmac, timingSafeEqual } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { waAppSecret } from "./graph";

/**
 * Webhook fan-out.
 *
 * Meta posts every tenant's events to ONE url. Routing is by `phone_number_id`
 * inside the payload — that is the only field that ties an event back to a
 * tenant, which is why `WaNumber.phoneNumberId` is globally unique.
 *
 * Two rules that are easy to get wrong and expensive to debug:
 *
 *  1. **Return 200 fast.** Meta throttles the whole app when a handler is slow,
 *     every tenant at once, not just the slow one.
 *  2. **Dedupe.** Meta retries. Without the unique index on `metaEventId` an
 *     autoreply fires twice for one inbound message.
 */

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;

  let secret: string;
  try {
    secret = waAppSecret();
  } catch {
    console.error("[wa-webhook] no platform app secret configured, rejecting");
    return false;
  }

  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

interface WebhookValue {
  messaging_product?: string;
  metadata?: { phone_number_id?: string; display_phone_number?: string };
  messages?: { id?: string; from?: string; timestamp?: string; type?: string }[];
  statuses?: { id?: string; status?: string; recipient_id?: string }[];
  event?: string;
  message_template_id?: string | number;
  message_template_name?: string;
  message_template_language?: string;
  reason?: string;
}

interface WebhookChange {
  field?: string;
  value?: WebhookValue;
}

export interface WebhookEntry {
  id?: string;
  time?: number;
  changes?: WebhookChange[];
}

export interface WebhookPayload {
  object?: string;
  entry?: WebhookEntry[];
}

/**
 * A stable id for one change.
 *
 * Meta gives a message or status its own id, which is the ideal dedupe key.
 * Template and account events carry none, so we synthesise one from the fields
 * that identify the event — a template's status change for a given template is
 * the same event however many times it is redelivered.
 */
function eventId(entry: WebhookEntry, change: WebhookChange): string {
  const v = change.value ?? {};

  const messageId = v.messages?.[0]?.id;
  if (messageId) return `msg:${messageId}`;

  const status = v.statuses?.[0];
  if (status?.id) return `status:${status.id}:${status.status ?? "unknown"}`;

  if (v.message_template_id) {
    return `tpl:${v.message_template_id}:${v.event ?? "update"}`;
  }

  return `entry:${entry.id ?? "unknown"}:${change.field ?? "unknown"}:${entry.time ?? 0}`;
}

export interface RoutedEvent {
  metaEventId: string;
  field: string;
  phoneNumberId?: string;
  tenantId?: string;
  value: WebhookValue;
}

/**
 * Splits a payload into per-tenant events and records each one exactly once.
 *
 * Returns only the events that are new. A redelivery hits the unique index on
 * `metaEventId`, is skipped, and never reaches a handler.
 */
export async function ingestWebhook(payload: WebhookPayload): Promise<RoutedEvent[]> {
  const fresh: RoutedEvent[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      const phoneNumberId = value.metadata?.phone_number_id;

      let tenantId: string | undefined;
      if (phoneNumberId) {
        const number = await prisma.waNumber.findUnique({
          where: { phoneNumberId },
          select: { tenantId: true },
        });
        tenantId = number?.tenantId;

        if (!tenantId) {
          // A real signal, not noise: Meta is delivering for a number we do not
          // know, which usually means onboarding half-finished or a WABA was
          // moved away. Recorded below so it is visible rather than dropped.
          console.warn("[wa-webhook] no tenant for phone_number_id", phoneNumberId);
        }
      }

      const metaEventId = eventId(entry, change);

      try {
        await prisma.waWebhookEvent.create({
          data: {
            metaEventId,
            phoneNumberId,
            tenantId,
            field: change.field ?? "unknown",
            payload: value as unknown as Prisma.InputJsonValue,
          },
        });
      } catch {
        // Unique violation = Meta retried. Correct outcome: skip it.
        continue;
      }

      fresh.push({ metaEventId, field: change.field ?? "unknown", phoneNumberId, tenantId, value });
    }
  }

  return fresh;
}

/** Marks an event handled, or records why it was not. Never throws. */
export async function markEventProcessed(metaEventId: string, error?: string): Promise<void> {
  await prisma.waWebhookEvent
    .update({
      where: { metaEventId },
      data: { processedAt: new Date(), error },
    })
    .catch(() => undefined);
}
