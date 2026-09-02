export const dynamic = "force-dynamic";

import { authenticatePlatform, requireTenant } from "@/lib/wa/auth";
import { syncTemplates } from "@/lib/wa/templates";
import { WaError } from "@/lib/wa/errors";
import { waOk, waFail } from "@/lib/wa/response";

/**
 * Reconciles a tenant's templates against Meta on demand.
 *
 * Meta never announces a verdict on a schedule we control, and a template can be
 * paused or recategorised weeks after approval. cron/wa-template-sync does this
 * on a timer; this route is the "check now" button behind it.
 */
export async function POST(request: Request) {
  try {
    const platform = await authenticatePlatform(request);
    const body = (await request.json().catch(() => ({}))) as { ownerId?: string };

    if (!body.ownerId) throw new WaError("TENANT_NOT_FOUND", "ownerId is required", 400);
    const tenant = await requireTenant(platform.id, body.ownerId);

    return waOk({ ownerId: body.ownerId, ...(await syncTemplates(tenant.id)) });
  } catch (err) {
    return waFail(err);
  }
}
