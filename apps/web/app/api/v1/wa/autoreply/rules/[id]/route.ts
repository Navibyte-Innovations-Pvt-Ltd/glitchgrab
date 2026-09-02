export const dynamic = "force-dynamic";

import type { WaMatchType } from "@prisma/client";
import { authenticatePlatform, requireTenant } from "@/lib/wa/auth";
import { deleteRule, updateRule } from "@/lib/wa/autoreply";
import { WaError } from "@/lib/wa/errors";
import { waOk, waFail } from "@/lib/wa/response";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const platform = await authenticatePlatform(request);
    const { id } = await ctx.params;
    const body = (await request.json()) as {
      ownerId?: string;
      name?: string;
      matchType?: WaMatchType;
      pattern?: string;
      replyText?: string;
      priority?: number;
      enabled?: boolean;
    };

    if (!body.ownerId) throw new WaError("TENANT_NOT_FOUND", "ownerId is required", 400);
    const tenant = await requireTenant(platform.id, body.ownerId);

    const rule = await updateRule(tenant.id, id, {
      name: body.name ?? "",
      matchType: body.matchType ?? "CONTAINS",
      pattern: body.pattern,
      replyText: body.replyText ?? "",
      priority: body.priority,
      enabled: body.enabled,
    });

    return waOk({ ownerId: body.ownerId, rule });
  } catch (err) {
    return waFail(err);
  }
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const platform = await authenticatePlatform(request);
    const { id } = await ctx.params;
    const ownerId = new URL(request.url).searchParams.get("ownerId");
    if (!ownerId) throw new WaError("TENANT_NOT_FOUND", "ownerId is required", 400);

    const tenant = await requireTenant(platform.id, ownerId);
    await deleteRule(tenant.id, id);
    return waOk({ ownerId, deleted: id });
  } catch (err) {
    return waFail(err);
  }
}
