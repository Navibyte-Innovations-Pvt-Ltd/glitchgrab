export const dynamic = "force-dynamic";

import { authenticatePlatform, requireTenant } from "@/lib/wa/auth";
import { issueStreamTicket } from "@/lib/wa/stream-ticket";
import { WaError } from "@/lib/wa/errors";
import { waOk, waFail } from "@/lib/wa/response";

/**
 * Exchanges the platform key for a 60-second stream ticket.
 *
 * The browser cannot send an Authorization header on an `EventSource`, and the
 * long-lived key must never reach a URL. This is the swap that makes the SSE
 * endpoint safe to open from a page.
 */
export async function POST(request: Request) {
  try {
    const platform = await authenticatePlatform(request);
    const body = (await request.json()) as { ownerId?: string };

    if (!body.ownerId) throw new WaError("TENANT_NOT_FOUND", "ownerId is required", 400);
    const tenant = await requireTenant(platform.id, body.ownerId);

    return waOk({
      ownerId: body.ownerId,
      ...issueStreamTicket({ platformId: platform.id, tenantId: tenant.id }),
    });
  } catch (err) {
    return waFail(err);
  }
}
