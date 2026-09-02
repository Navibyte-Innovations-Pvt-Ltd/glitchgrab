export const dynamic = "force-dynamic";

import type { WaMatchType } from "@prisma/client";
import { authenticatePlatform, requireTenant } from "@/lib/wa/auth";
import { createRule, listRules } from "@/lib/wa/autoreply";
import { WaError } from "@/lib/wa/errors";
import { waOk, waFail } from "@/lib/wa/response";

/** Rules in evaluation order — lowest priority number runs first. */
export async function GET(request: Request) {
  try {
    const platform = await authenticatePlatform(request);
    const ownerId = new URL(request.url).searchParams.get("ownerId");
    if (!ownerId) throw new WaError("TENANT_NOT_FOUND", "ownerId is required", 400);

    const tenant = await requireTenant(platform.id, ownerId);
    return waOk({ ownerId, rules: await listRules(tenant.id) });
  } catch (err) {
    return waFail(err);
  }
}

/**
 * Creates a rule. A catch-all (`matchType: "ANY"`) is refused below priority
 * 900, because it would shadow every other rule the tenant writes afterwards.
 */
export async function POST(request: Request) {
  try {
    const platform = await authenticatePlatform(request);
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

    const rule = await createRule(tenant.id, {
      name: body.name ?? "",
      matchType: body.matchType ?? "CONTAINS",
      pattern: body.pattern,
      replyText: body.replyText ?? "",
      priority: body.priority,
      enabled: body.enabled,
    });

    return waOk({ ownerId: body.ownerId, rule }, 201);
  } catch (err) {
    return waFail(err);
  }
}
