export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { authenticatePlatform, requireTenant } from "@/lib/wa/auth";
import { markConversationRead } from "@/lib/wa/conversations";
import { requireAgent } from "@/lib/wa/agents";
import { WaError } from "@/lib/wa/errors";
import { waOk, waFail } from "@/lib/wa/response";

const MESSAGE_LIMIT = 100;

/** One thread with its recent messages. Reading it clears the unread badge. */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const platform = await authenticatePlatform(request);
    const { id } = await ctx.params;
    const ownerId = new URL(request.url).searchParams.get("ownerId");
    if (!ownerId) throw new WaError("TENANT_NOT_FOUND", "ownerId is required", 400);

    const tenant = await requireTenant(platform.id, ownerId);

    const conversation = await prisma.waConversation.findFirst({
      where: { id, tenantId: tenant.id },
      select: {
        id: true,
        contactPhone: true,
        contactName: true,
        windowExpiresAt: true,
        optedOut: true,
        status: true,
        assignedAgentId: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: MESSAGE_LIMIT,
          select: {
            id: true,
            direction: true,
            status: true,
            payload: true,
            category: true,
            error: true,
            sentAt: true,
            deliveredAt: true,
            readAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!conversation) throw new WaError("TENANT_NOT_FOUND", "No such conversation", 404);

    await markConversationRead(tenant.id, conversation.id);

    return waOk({
      ownerId,
      conversation: {
        ...conversation,
        windowOpen:
          !!conversation.windowExpiresAt && conversation.windowExpiresAt.getTime() > Date.now(),
        messages: conversation.messages.reverse(),
      },
    });
  } catch (err) {
    return waFail(err);
  }
}

/** Assign an agent, change status, or set opt-out by hand. */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const platform = await authenticatePlatform(request);
    const { id } = await ctx.params;
    const body = (await request.json()) as {
      ownerId?: string;
      status?: "OPEN" | "SNOOZED" | "CLOSED";
      assignedAgentId?: string | null;
      optedOut?: boolean;
    };

    if (!body.ownerId) throw new WaError("TENANT_NOT_FOUND", "ownerId is required", 400);
    const tenant = await requireTenant(platform.id, body.ownerId);

    // Without this a platform could assign one tenant's conversation to another
    // tenant's agent by passing a foreign id — the agent id comes from the
    // request, so it has to be proven to belong here.
    if (body.assignedAgentId) {
      await requireAgent(tenant.id, body.assignedAgentId);
    }

    const { count } = await prisma.waConversation.updateMany({
      where: { id, tenantId: tenant.id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.assignedAgentId !== undefined ? { assignedAgentId: body.assignedAgentId } : {}),
        ...(body.optedOut !== undefined
          ? { optedOut: body.optedOut, optedOutAt: body.optedOut ? new Date() : null }
          : {}),
      },
    });

    if (count === 0) throw new WaError("TENANT_NOT_FOUND", "No such conversation", 404);
    return waOk({ ownerId: body.ownerId, id, updated: true });
  } catch (err) {
    return waFail(err);
  }
}
