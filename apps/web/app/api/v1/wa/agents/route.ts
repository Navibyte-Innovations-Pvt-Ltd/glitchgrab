export const dynamic = "force-dynamic";

import type { WaAgentRole } from "@prisma/client";
import { authenticatePlatform, requireTenant } from "@/lib/wa/auth";
import { listAgents, upsertAgent } from "@/lib/wa/agents";
import { WaError } from "@/lib/wa/errors";
import { waOk, waFail } from "@/lib/wa/response";

/** Inbox seats for this tenant. `?includeInactive=true` shows departed staff. */
export async function GET(request: Request) {
  try {
    const platform = await authenticatePlatform(request);
    const params = new URL(request.url).searchParams;
    const ownerId = params.get("ownerId");
    if (!ownerId) throw new WaError("TENANT_NOT_FOUND", "ownerId is required", 400);

    const tenant = await requireTenant(platform.id, ownerId);
    const agents = await listAgents(tenant.id, params.get("includeInactive") === "true");

    return waOk({ ownerId, agents });
  } catch (err) {
    return waFail(err);
  }
}

/** Creates or updates a seat, keyed by the platform's own user id. */
export async function POST(request: Request) {
  try {
    const platform = await authenticatePlatform(request);
    const body = (await request.json()) as {
      ownerId?: string;
      agentId?: string;
      name?: string;
      email?: string;
      role?: WaAgentRole;
      active?: boolean;
    };

    if (!body.ownerId) throw new WaError("TENANT_NOT_FOUND", "ownerId is required", 400);
    const tenant = await requireTenant(platform.id, body.ownerId);

    const agent = await upsertAgent(tenant.id, {
      externalAgentId: body.agentId ?? "",
      name: body.name ?? "",
      email: body.email,
      role: body.role,
      active: body.active,
    });

    return waOk({ ownerId: body.ownerId, agent }, 201);
  } catch (err) {
    return waFail(err);
  }
}
