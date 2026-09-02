export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { authenticatePlatform, requireTenant } from "@/lib/wa/auth";
import { WaError } from "@/lib/wa/errors";
import { waOk, waFail } from "@/lib/wa/response";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * The inbox list: one row per contact, most recently active first.
 *
 * `windowOpen` is computed here rather than left to the client, because the
 * whole point of showing it is to tell an agent whether they can type a free
 * reply or must pick a template.
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
    const status = params.get("status");
    const unreadOnly = params.get("unread") === "true";

    const conversations = await prisma.waConversation.findMany({
      where: {
        tenantId: tenant.id,
        ...(status ? { status: status as never } : {}),
        ...(unreadOnly ? { unreadCount: { gt: 0 } } : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        contactPhone: true,
        contactName: true,
        windowExpiresAt: true,
        lastInboundAt: true,
        lastOutboundAt: true,
        optedOut: true,
        status: true,
        assignedAgentId: true,
        unreadCount: true,
        updatedAt: true,
      },
    });

    const hasMore = conversations.length > limit;
    const page = hasMore ? conversations.slice(0, limit) : conversations;
    const now = Date.now();

    return waOk({
      ownerId,
      conversations: page.map((c) => ({
        ...c,
        windowOpen: !!c.windowExpiresAt && c.windowExpiresAt.getTime() > now,
      })),
      nextCursor: hasMore ? page[page.length - 1]?.id : null,
    });
  } catch (err) {
    return waFail(err);
  }
}
