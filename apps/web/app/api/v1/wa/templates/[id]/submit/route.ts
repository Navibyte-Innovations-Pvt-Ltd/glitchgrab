export const dynamic = "force-dynamic";

import { authenticatePlatform, requireTenant } from "@/lib/wa/auth";
import { submitTemplate } from "@/lib/wa/templates";
import { WaError } from "@/lib/wa/errors";
import { waOk, waFail } from "@/lib/wa/response";

/**
 * Sends a draft to Meta for approval.
 *
 * The verdict arrives asynchronously and Meta gives no schedule, so the caller
 * polls GET /templates or waits for cron/wa-template-sync.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const platform = await authenticatePlatform(request);
    const { id } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as { ownerId?: string };

    if (!body.ownerId) throw new WaError("TENANT_NOT_FOUND", "ownerId is required", 400);
    const tenant = await requireTenant(platform.id, body.ownerId);

    return waOk({ ownerId: body.ownerId, template: await submitTemplate(tenant.id, id) });
  } catch (err) {
    return waFail(err);
  }
}
