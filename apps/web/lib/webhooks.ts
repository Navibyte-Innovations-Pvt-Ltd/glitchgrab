import { createHmac } from "crypto";
import { prisma } from "@/lib/db";

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Dispatches webhooks for a given user and event.
 * Non-blocking — fires and forgets. Retries once on failure.
 */
export function dispatchWebhook(
  userId: string,
  event: string,
  payload: Record<string, unknown>
): void {
  // Fire and forget — don't await
  dispatchAsync(userId, event, payload).catch((err) => {
    console.error("Webhook dispatch error:", err);
  });
}

async function dispatchAsync(
  userId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const webhooks = await prisma.webhook.findMany({
    where: {
      userId,
      active: true,
      events: { has: event },
    },
  });

  if (webhooks.length === 0) return;

  const body: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data: payload,
  };

  const bodyString = JSON.stringify(body);

  const deliveries = webhooks.map((webhook: typeof webhooks[number]) =>
    sendWithRetry(webhook.url, webhook.secret, bodyString)
  );

  await Promise.allSettled(deliveries);
}

async function sendWithRetry(
  url: string,
  secret: string,
  body: string,
  attempt: number = 1
): Promise<void> {
  const signature = createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Glitchgrab-Signature": `sha256=${signature}`,
        "User-Agent": "Glitchgrab-Webhook/1.0",
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok && attempt < 2) {
      // Retry once
      await sendWithRetry(url, secret, body, attempt + 1);
    }
  } catch (err) {
    if (attempt < 2) {
      // Retry once on network error
      await sendWithRetry(url, secret, body, attempt + 1);
    } else {
      console.error(`Webhook delivery failed to ${url}:`, err);
    }
  }
}
