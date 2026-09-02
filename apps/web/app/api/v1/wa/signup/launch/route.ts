export const dynamic = "force-dynamic";

import { randomBytes } from "crypto";
import { authenticatePlatform, resolveTenant } from "@/lib/wa/auth";
import { buildSignupLaunch } from "@/lib/wa/onboarding";
import { WaError } from "@/lib/wa/errors";
import { waOk, waFail } from "@/lib/wa/response";

/**
 * Starts Embedded Signup for one of a platform's business owners.
 *
 * Returns config, not a redirect URL: Embedded Signup runs through Meta's JS SDK
 * (`FB.login` with `config_id`). A plain OAuth redirect yields a token but skips
 * WABA creation, which is the part the owner actually needs.
 *
 * The tenant row is created here so the caller has an id to pass back to
 * /signup/exchange. Nothing is connected until the exchange succeeds.
 */
export async function POST(request: Request) {
  try {
    const platform = await authenticatePlatform(request);
    const body = (await request.json()) as { ownerId?: string; ownerName?: string };

    if (!body.ownerId?.trim()) {
      throw new WaError("TENANT_NOT_FOUND", "ownerId is required", 400);
    }

    const tenant = await resolveTenant(platform.id, body.ownerId, body.ownerName);

    // Round-tripped through Meta's popup and checked on exchange, so a code
    // captured from one owner's flow cannot be replayed against another.
    const state = `${tenant.id}.${randomBytes(16).toString("base64url")}`;

    return waOk({
      ownerId: body.ownerId,
      status: tenant.status,
      ...buildSignupLaunch(state),
    });
  } catch (err) {
    return waFail(err);
  }
}
