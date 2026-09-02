export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { authenticatePlatform, requireTenant } from "@/lib/wa/auth";
import { WaError } from "@/lib/wa/errors";
import { waOk, waFail } from "@/lib/wa/response";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * Message history, newest first. `?contact=` narrows to one conversation.
 *
 * Doubles as the billing audit trail: every row carries the price it was charged
 * at and the category it was charged as, so a disputed invoice is answerable
 * without reconstructing prices from a rate card that has since changed.
 */
export async function GET(request: Request) {
  try {
    const platform = await authenticatePlatform(request);
    const params = new URL(request.url).searchParams;
    const ownerId = params.get("ownerId");
    if (!ownerId) throw new WaError("TENANT_NOT_FOUND", "ownerId is required", 400);

    const tenant = await requireTenant(platform.id, ownerId);
    const limit = Math.min(Number(params.get("limit")) || DEFAULT_LIMIT, MAX_LIMIT);
    const cursor = params.get("cursor");
    const contact = params.get("contact")?.replace(/\D/g, "");

    const messages = await prisma.waMessage.findMany({
      where: { tenantId: tenant.id, ...(contact ? { contactPhone: contact } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        direction: true,
        status: true,
        contactPhone: true,
        category: true,
        metaMessageId: true,
        payload: true,
        error: true,
        tenantPricePaise: true,
        sentAt: true,
        deliveredAt: true,
        readAt: true,
        createdAt: true,
      },
    });

    const hasMore = messages.length > limit;
    const page = hasMore ? messages.slice(0, limit) : messages;

    return waOk({
      ownerId,
      messages: page,
      nextCursor: hasMore ? page[page.length - 1]?.id : null,
    });
  } catch (err) {
    return waFail(err);
  }
}
