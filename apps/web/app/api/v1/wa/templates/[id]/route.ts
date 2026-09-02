export const dynamic = "force-dynamic";

import { authenticatePlatform, requireTenant } from "@/lib/wa/auth";
import { removeTemplate } from "@/lib/wa/templates";
import { WaError } from "@/lib/wa/errors";
import { waOk, waFail } from "@/lib/wa/response";

/** Deletes on Meta and locally. Already gone on their side counts as success. */
export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const platform = await authenticatePlatform(request);
    const { id } = await ctx.params;
    const ownerId = new URL(request.url).searchParams.get("ownerId");

    if (!ownerId) throw new WaError("TENANT_NOT_FOUND", "ownerId is required", 400);
    const tenant = await requireTenant(platform.id, ownerId);

    await removeTemplate(tenant.id, id);
    return waOk({ ownerId, deleted: id });
  } catch (err) {
    return waFail(err);
  }
}
