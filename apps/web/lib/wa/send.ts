import type { Prisma, WaTemplateCategory } from "@prisma/client";
import { prisma } from "@/lib/db";
import { WaError } from "./errors";
import { getTenantToken } from "./onboarding";
import { resolvePrice } from "./pricing";
import { chargeMessage, refund } from "./wallet";
import { sendTemplateMessage, sendTextMessage, WaGraphError } from "./graph";
import { getWindowState, recordOutbound } from "./conversations";

/**
 * Sending.
 *
 * Order matters and is not negotiable:
 *
 *   1. charge  →  2. call Meta  →  3. refund if Meta refused
 *
 * Charging first means a wallet that has run dry cannot send, which is the
 * entire point of a prepaid model. Sending first and charging after would let a
 * tenant at zero keep sending for as long as Meta keeps accepting.
 *
 * The cost of that order is that a Meta failure leaves money debited, which is
 * why every failure path refunds and why `WaWalletTxn` is append-only.
 */

/** E.164 digits, no plus, no separators — what Meta expects in `to`. */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) {
    throw new WaError("INVALID_AMOUNT", `Not a sendable phone number: ${phone}`, 400);
  }
  return digits;
}

async function resolveSendingNumber(tenantId: string, phoneNumberId?: string) {
  const number = phoneNumberId
    ? await prisma.waNumber.findFirst({
        where: { phoneNumberId, tenantId },
        select: { phoneNumberId: true },
      })
    : await prisma.waNumber.findFirst({
        where: { tenantId, status: { in: ["VERIFIED", "REGISTERED"] } },
        orderBy: { createdAt: "asc" },
        select: { phoneNumberId: true },
      });

  if (!number) {
    throw new WaError(
      "TENANT_NOT_FOUND",
      phoneNumberId
        ? "That number does not belong to this account"
        : "This account has no verified WhatsApp number yet",
      409
    );
  }
  return number.phoneNumberId;
}

interface SendTemplateInput {
  platformId: string;
  tenantId: string;
  to: string;
  templateName: string;
  language?: string;
  /** Meta's component array — body params, header media, button payloads. */
  components?: unknown[];
  phoneNumberId?: string;
  /** Caller's idempotency key, scoped to this tenant's wallet. */
  refKey?: string;
}

interface SendResult {
  messageId: string;
  metaMessageId: string;
  status: "SENT";
  category: WaTemplateCategory;
  tenantPricePaise: number;
  platformPricePaise: number;
  tenantBalancePaise: number;
}

/**
 * Sends an approved template, billing both wallet levels.
 *
 * The category comes from the stored template rather than the caller: pricing
 * differs by multiples between marketing and utility, and letting a caller
 * declare its own category would let a platform bill marketing at utility rates.
 */
export async function sendTemplate(input: SendTemplateInput): Promise<SendResult> {
  const { platformId, tenantId, templateName, components, refKey } = input;
  const to = normalizePhone(input.to);

  const template = await prisma.waTemplate.findFirst({
    where: {
      tenantId,
      name: templateName,
      ...(input.language ? { language: input.language } : {}),
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, language: true, category: true, status: true },
  });

  if (!template) {
    throw new WaError("TENANT_NOT_FOUND", `No template named "${templateName}"`, 404);
  }
  if (template.status !== "APPROVED") {
    // Meta rejects the send anyway; failing here saves a charge and a refund.
    throw new WaError(
      "INVALID_AMOUNT",
      `Template "${templateName}" is ${template.status.toLowerCase()}, not approved`,
      409,
      { status: template.status }
    );
  }

  // Meta requires opt-out to be honoured on every marketing send, and a
  // violation is charged to the WABA's quality rating, not ours. Utility and
  // authentication are transactional and deliberately still allowed — a fee
  // reminder is not marketing.
  if (template.category === "MARKETING") {
    const window = await getWindowState(tenantId, to);
    if (window.optedOut) {
      throw new WaError(
        "INVALID_AMOUNT",
        "This contact has opted out of marketing messages",
        409,
        { contactPhone: to }
      );
    }
  }

  const price = await resolvePrice(platformId, template.category);
  const phoneNumberId = await resolveSendingNumber(tenantId, input.phoneNumberId);
  const { token } = await getTenantToken(tenantId);

  const message = await prisma.waMessage.create({
    data: {
      tenantId,
      direction: "OUTBOUND",
      status: "QUEUED",
      contactPhone: to,
      phoneNumberId,
      conversationId: await recordOutbound({ tenantId, contactPhone: to }),
      templateId: template.id,
      category: template.category,
      tenantPricePaise: price.tenantPricePaise,
      platformPricePaise: price.platformPricePaise,
      payload: {
        type: "template",
        name: template.name,
        language: template.language,
        components: components ?? [],
      } as unknown as Prisma.InputJsonValue,
    },
    select: { id: true },
  });

  // Falls back to the message id so a caller that supplies no key still cannot
  // be double-charged by a retry of the same row.
  const chargeKey = refKey ? `${tenantId}:${refKey}` : `msg:${message.id}`;

  const charge = await chargeMessage({
    platformId,
    tenantId,
    tenantPricePaise: price.tenantPricePaise,
    platformPricePaise: price.platformPricePaise,
    refKey: chargeKey,
    messageId: message.id,
  });

  try {
    const { messageId: metaMessageId } = await sendTemplateMessage(token, {
      phoneNumberId,
      to,
      templateName: template.name,
      language: template.language,
      components,
    });

    await prisma.waMessage.update({
      where: { id: message.id },
      data: { status: "SENT", metaMessageId, sentAt: new Date() },
    });

    return {
      messageId: message.id,
      metaMessageId,
      status: "SENT",
      category: template.category,
      tenantPricePaise: price.tenantPricePaise,
      platformPricePaise: price.platformPricePaise,
      tenantBalancePaise: charge.tenantBalancePaise,
    };
  } catch (err) {
    await failAndRefund({
      messageId: message.id,
      platformId,
      tenantId,
      chargeKey,
      tenantPricePaise: price.tenantPricePaise,
      platformPricePaise: price.platformPricePaise,
      err,
    });
    throw err instanceof WaGraphError
      ? new WaError("INVALID_AMOUNT", err.message, err.status >= 500 ? 502 : 400, { code: err.code })
      : err;
  }
}

interface SendTextInput {
  platformId: string;
  tenantId: string;
  to: string;
  body: string;
  phoneNumberId?: string;
  refKey?: string;
}

/**
 * Free-form text, legal only inside the 24-hour service window.
 *
 * The window is opened by the contact's last INBOUND message. Meta answers 200
 * either way — outside the window the message is simply never delivered — so the
 * check has to happen here. Guessing wrong costs a charge for a message nobody
 * receives.
 *
 * Conversations become a first-class model in phase 4; until then the window is
 * derived from the message log, which is the same fact from a different angle.
 */
export async function sendText(input: SendTextInput): Promise<SendResult> {
  const { platformId, tenantId, body, refKey } = input;
  const to = normalizePhone(input.to);

  if (!body?.trim()) throw new WaError("INVALID_AMOUNT", "body is required", 400);

  const window = await getWindowState(tenantId, to);

  if (!window.open) {
    throw new WaError(
      "INVALID_AMOUNT",
      "The 24-hour window for this contact is closed. Send an approved template instead.",
      409,
      { windowExpiresAt: window.expiresAt }
    );
  }

  const price = await resolvePrice(platformId, "SERVICE");
  const phoneNumberId = await resolveSendingNumber(tenantId, input.phoneNumberId);
  const { token } = await getTenantToken(tenantId);

  const message = await prisma.waMessage.create({
    data: {
      tenantId,
      direction: "OUTBOUND",
      status: "QUEUED",
      contactPhone: to,
      phoneNumberId,
      conversationId: window.conversationId,
      category: "SERVICE",
      tenantPricePaise: price.tenantPricePaise,
      platformPricePaise: price.platformPricePaise,
      payload: { type: "text", body } as unknown as Prisma.InputJsonValue,
    },
    select: { id: true },
  });

  const chargeKey = refKey ? `${tenantId}:${refKey}` : `msg:${message.id}`;

  // Service messages are usually free at Meta, but the platform may still
  // charge for them, so this goes through the same meter rather than skipping it.
  const charge = await chargeMessage({
    platformId,
    tenantId,
    tenantPricePaise: price.tenantPricePaise,
    platformPricePaise: price.platformPricePaise,
    refKey: chargeKey,
    messageId: message.id,
  });

  try {
    const { messageId: metaMessageId } = await sendTextMessage(token, { phoneNumberId, to, body });

    await prisma.waMessage.update({
      where: { id: message.id },
      data: { status: "SENT", metaMessageId, sentAt: new Date() },
    });

    return {
      messageId: message.id,
      metaMessageId,
      status: "SENT",
      category: "SERVICE",
      tenantPricePaise: price.tenantPricePaise,
      platformPricePaise: price.platformPricePaise,
      tenantBalancePaise: charge.tenantBalancePaise,
    };
  } catch (err) {
    await failAndRefund({
      messageId: message.id,
      platformId,
      tenantId,
      chargeKey,
      tenantPricePaise: price.tenantPricePaise,
      platformPricePaise: price.platformPricePaise,
      err,
    });
    throw err instanceof WaGraphError
      ? new WaError("INVALID_AMOUNT", err.message, err.status >= 500 ? 502 : 400, { code: err.code })
      : err;
  }
}

/**
 * Marks a send failed and gives the money back, at both levels.
 *
 * Never throws: a refund failure must not replace the original Meta error, which
 * is the one the caller needs to see. A refund that does not land is recoverable
 * from the ledger; a swallowed send error is not.
 */
async function failAndRefund(params: {
  messageId: string;
  platformId: string;
  tenantId: string;
  chargeKey: string;
  tenantPricePaise: number;
  platformPricePaise: number;
  err: unknown;
}): Promise<void> {
  const message = params.err instanceof Error ? params.err.message : "Send failed";

  await prisma.waMessage
    .update({
      where: { id: params.messageId },
      data: { status: "FAILED", error: message },
    })
    .catch(() => undefined);

  await Promise.all([
    refund({
      ownerType: "TENANT",
      ownerId: params.tenantId,
      amountPaise: params.tenantPricePaise,
      refKey: `${params.chargeKey}:tenant:refund`,
      messageId: params.messageId,
      note: `Refund: ${message}`,
    }).catch((e) => console.error("[wa] tenant refund failed", params.messageId, e)),

    refund({
      ownerType: "PLATFORM",
      ownerId: params.platformId,
      amountPaise: params.platformPricePaise,
      refKey: `${params.chargeKey}:platform:refund`,
      messageId: params.messageId,
      note: `Refund: ${message}`,
    }).catch((e) => console.error("[wa] platform refund failed", params.messageId, e)),
  ]);
}
