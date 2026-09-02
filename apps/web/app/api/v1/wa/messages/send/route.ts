export const dynamic = "force-dynamic";

import { authenticatePlatform, requireTenant } from "@/lib/wa/auth";
import { sendTemplate, sendText } from "@/lib/wa/send";
import { WaError } from "@/lib/wa/errors";
import { waOk, waFail } from "@/lib/wa/response";

/**
 * Sends a message from the tenant's own number.
 *
 * `template` is the normal path. `body` sends free-form text and is legal only
 * inside the 24-hour window opened by the contact's last inbound message —
 * outside it the send is refused here rather than by Meta, which would answer
 * 200 and deliver nothing.
 *
 * Charges both wallets before calling Meta, and refunds if Meta refuses. A
 * caller out of balance gets 402 with the shortfall in `detail`.
 */
export async function POST(request: Request) {
  try {
    const platform = await authenticatePlatform(request);
    const body = (await request.json()) as {
      ownerId?: string;
      to?: string;
      template?: string;
      language?: string;
      components?: unknown[];
      body?: string;
      phoneNumberId?: string;
      refKey?: string;
    };

    if (!body.ownerId) throw new WaError("TENANT_NOT_FOUND", "ownerId is required", 400);
    if (!body.to) throw new WaError("INVALID_AMOUNT", "to is required", 400);
    if (!body.template && !body.body) {
      throw new WaError("INVALID_AMOUNT", "Either template or body is required", 400);
    }

    const tenant = await requireTenant(platform.id, body.ownerId);

    // Narrowed into locals so the free-text branch is provably non-empty
    // without an assertion the compiler cannot check.
    const { template, body: text } = body;

    const result = template
      ? await sendTemplate({
          platformId: platform.id,
          tenantId: tenant.id,
          to: body.to,
          templateName: template,
          language: body.language,
          components: body.components,
          phoneNumberId: body.phoneNumberId,
          refKey: body.refKey,
        })
      : await sendText({
          platformId: platform.id,
          tenantId: tenant.id,
          to: body.to,
          body: text ?? "",
          phoneNumberId: body.phoneNumberId,
          refKey: body.refKey,
        });

    return waOk({ ownerId: body.ownerId, ...result });
  } catch (err) {
    return waFail(err);
  }
}
