export const dynamic = "force-dynamic";

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

  if (mode === "subscribe" && token && token === process.env.META_WA_PLATFORM_VERIFY_TOKEN) {
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
 * Phase 2 scope: keep the numbers and their status current.
 *
 * Inbound messages, conversation windows and autoreplies land in phase 4;
 * template status in phase 3. Until then every other event is recorded by
 * ingestWebhook() and marked processed, so nothing is lost and nothing is
 * retried forever.
 */
async function handleEvent(event: RoutedEvent): Promise<void> {
  try {
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
