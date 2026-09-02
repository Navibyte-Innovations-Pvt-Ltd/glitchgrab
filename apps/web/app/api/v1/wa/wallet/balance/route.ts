export const dynamic = "force-dynamic";

import { authenticatePlatform, requireTenant } from "@/lib/wa/auth";
import { getBalance } from "@/lib/wa/wallet";
import { waOk, waFail } from "@/lib/wa/response";

/**
 * `?ownerId=` returns that tenant's balance, otherwise the platform's own.
 * The tenant is resolved from the platform key plus the platform's own user id —
 * a client-supplied tenant id is never trusted, and cannot address another
 * platform's tenants.
 */
export async function GET(request: Request) {
  try {
    const platform = await authenticatePlatform(request);
    const ownerId = new URL(request.url).searchParams.get("ownerId");

    if (ownerId) {
      const tenant = await requireTenant(platform.id, ownerId);
      const balance = await getBalance("TENANT", tenant.id);
      return waOk({
        scope: "tenant",
        ownerId,
        name: tenant.name,
        status: tenant.status,
        ...balance,
      });
    }

    return waOk({ scope: "platform", ...(await getBalance("PLATFORM", platform.id)) });
  } catch (err) {
    return waFail(err);
  }
}
