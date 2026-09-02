export const dynamic = "force-dynamic";

import { authenticatePlatform, requireTenant } from "@/lib/wa/auth";
import { deactivateAgent } from "@/lib/wa/agents";
import { WaError } from "@/lib/wa/errors";
import { waOk, waFail } from "@/lib/wa/response";

/**
 * Removes a seat.
 *
 * Deactivates rather than deletes — conversations record who handled them, and
 * that history should survive someone leaving. Their open threads are unassigned
 * so nothing is stranded.
 */
export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const platform = await authenticatePlatform(request);
    const { id } = await ctx.params;
    const ownerId = new URL(request.url).searchParams.get("ownerId");
    if (!ownerId) throw new WaError("TENANT_NOT_FOUND", "ownerId is required", 400);

    const tenant = await requireTenant(platform.id, ownerId);
    await deactivateAgent(tenant.id, id);

    return waOk({ ownerId, deactivated: id });
  } catch (err) {
    return waFail(err);
  }
}
