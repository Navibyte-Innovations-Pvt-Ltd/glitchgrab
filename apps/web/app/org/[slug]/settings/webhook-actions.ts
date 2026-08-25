"use server";

import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const VALID_EVENTS = ["issue.created", "issue.updated", "issue.closed"];

interface WebhookInfo {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: Date;
}

interface CreateWebhookResult {
  id: string;
  secret: string;
}

export async function createWebhook(
  url: string,
  events: string[]
): Promise<CreateWebhookResult> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Validate URL
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Invalid URL protocol");
    }
  } catch {
    throw new Error("Invalid webhook URL");
  }

  // Validate events
  const validEvents = events.filter((e) => VALID_EVENTS.includes(e));
  if (validEvents.length === 0) {
    throw new Error("At least one valid event is required");
  }

  // Generate webhook secret
  const secret = `whsec_${randomBytes(24).toString("hex")}`;

  const webhook = await prisma.webhook.create({
    data: {
      userId: session.user.id,
      url,
      secret,
      events: validEvents,
      active: true,
    },
  });

  return { id: webhook.id, secret };
}

export async function deleteWebhook(webhookId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify ownership
  const webhook = await prisma.webhook.findUnique({
    where: { id: webhookId },
  });

  if (!webhook || webhook.userId !== session.user.id) {
    throw new Error("Webhook not found");
  }

  await prisma.webhook.delete({
    where: { id: webhookId },
  });
}

export async function listWebhooks(): Promise<WebhookInfo[]> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const webhooks = await prisma.webhook.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      url: true,
      events: true,
      active: true,
      createdAt: true,
    },
  });

  return webhooks;
}
