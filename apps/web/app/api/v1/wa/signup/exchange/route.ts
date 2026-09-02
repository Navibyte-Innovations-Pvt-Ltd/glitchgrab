export const dynamic = "force-dynamic";

import { authenticatePlatform, requireTenant } from "@/lib/wa/auth";
import { completeSignup } from "@/lib/wa/onboarding";
import { WaError } from "@/lib/wa/errors";
import { waOk, waFail } from "@/lib/wa/response";

/**
 * Finishes Embedded Signup: code in, connected tenant out.
 *
 * `wabaId` in the body is a *hint* only. The authoritative list comes from
 * Meta's debug_token, because Embedded Signup reports the WABA to the browser
 * and a browser can claim anything — see completeSignup().
 */
export async function POST(request: Request) {
  try {
    const platform = await authenticatePlatform(request);
    const body = (await request.json()) as {
      ownerId?: string;
      code?: string;
      state?: string;
      wabaId?: string;
    };

    if (!body.ownerId?.trim()) throw new WaError("TENANT_NOT_FOUND", "ownerId is required", 400);
    if (!body.code?.trim()) throw new WaError("UNAUTHORIZED", "code is required", 400);

    const tenant = await requireTenant(platform.id, body.ownerId);

    // The state we issued is prefixed with the tenant id; a mismatch means the
    // code came from a different owner's popup.
    if (body.state && !body.state.startsWith(`${tenant.id}.`)) {
      throw new WaError("UNAUTHORIZED", "state does not match this owner", 400);
    }

    const result = await completeSignup({
      platformId: platform.id,
      tenantId: tenant.id,
      code: body.code,
      preferredWabaId: body.wabaId,
    });

    return waOk({ ownerId: body.ownerId, ...result });
  } catch (err) {
    return waFail(err);
  }
}
