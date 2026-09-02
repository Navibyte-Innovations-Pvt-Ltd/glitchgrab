import { prisma } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encrypt";
import { WaError } from "./errors";
import {
  debugToken,
  exchangeCodeForToken,
  getWaba,
  listWabaPhoneNumbers,
  shareCreditLine,
  subscribeAppToWaba,
  waAppId,
  WaGraphError,
} from "./graph";

/**
 * Embedded Signup onboarding.
 *
 * The tenant brings their own number and owns the WABA — messages carry *their*
 * verified name, which is the entire point of the product. What we attach is our
 * credit line, so Meta invoices us instead of them.
 *
 * See agent_docs/whatsapp-platform.md.
 */

/** Exactly the two permissions on Meta's Tech Provider checklist. Nothing more. */
const EMBEDDED_SIGNUP_SCOPES = [
  "whatsapp_business_management",
  "whatsapp_business_messaging",
] as const;

interface SignupLaunchConfig {
  appId: string;
  configId: string;
  scopes: string[];
  /** Opaque round-trip value; the exchange call rejects a mismatch. */
  state: string;
}

/**
 * Everything the platform's browser needs to open Meta's popup.
 *
 * We hand back config rather than a URL because Embedded Signup runs through
 * Meta's JS SDK (`FB.login` with `config_id`), not a redirect — a plain OAuth
 * URL gets a token but skips the WABA-creation flow entirely.
 */
export function buildSignupLaunch(state: string): SignupLaunchConfig {
  const configId = process.env.META_WA_SIGNUP_CONFIG_ID;
  if (!configId) {
    throw new WaError("UNAUTHORIZED", "META_WA_SIGNUP_CONFIG_ID is not set", 500);
  }
  return {
    appId: waAppId(),
    configId,
    scopes: [...EMBEDDED_SIGNUP_SCOPES],
    state,
  };
}

interface CompleteSignupResult {
  tenantId: string;
  wabaId: string;
  numbers: { phoneNumberId: string; displayNumber: string; verifiedName: string }[];
  creditLineShared: boolean;
  creditLineNote?: string;
  warnings: string[];
}

/**
 * Turns the code Embedded Signup returns into a connected tenant.
 *
 * The WABA id is taken from Meta's `debug_token` response, never from the
 * request body. Embedded Signup reports the id to the *browser*, and a browser
 * can claim any id it likes — trusting it would let one platform bind another
 * business's WABA to its own tenant. `debug_token` is Meta's own answer to
 * which WABAs a token actually covers, so it is the only acceptable source.
 */
export async function completeSignup(params: {
  platformId: string;
  tenantId: string;
  code: string;
  /** Optional: which WABA to pick when the token grants several. */
  preferredWabaId?: string;
}): Promise<CompleteSignupResult> {
  const { platformId, tenantId, code, preferredWabaId } = params;
  const warnings: string[] = [];

  const accessToken = await exchangeCodeForToken(code);
  const { wabaIds, expiresAt } = await debugToken(accessToken);

  if (wabaIds.length === 0) {
    throw new WaError(
      "UNAUTHORIZED",
      "That sign-up granted no WhatsApp Business Account. The owner must complete Meta's flow, including adding a number.",
      400
    );
  }

  // With several, honour the caller's preference only if the token really
  // covers it — otherwise fall back to the first Meta listed.
  const fallbackWabaId = wabaIds[0];
  if (!fallbackWabaId) {
    throw new WaError("UNAUTHORIZED", "That sign-up granted no WhatsApp Business Account.", 400);
  }
  const wabaId =
    preferredWabaId && wabaIds.includes(preferredWabaId) ? preferredWabaId : fallbackWabaId;

  if (preferredWabaId && preferredWabaId !== wabaId) {
    warnings.push(`Requested WABA ${preferredWabaId} is not covered by this token; used ${wabaId}.`);
  }

  // One WABA cannot belong to two tenants: inbound webhooks route by number,
  // and a duplicate would make delivery ambiguous.
  const clash = await prisma.waTenant.findFirst({
    where: { wabaId, id: { not: tenantId } },
    select: { id: true, platformId: true },
  });
  if (clash) {
    throw new WaError(
      "TENANT_NOT_FOUND",
      "That WhatsApp Business Account is already connected to another account.",
      409,
      { wabaId }
    );
  }

  let wabaName: string | undefined;
  try {
    wabaName = (await getWaba(wabaId, accessToken)).name;
  } catch {
    // Cosmetic only — never fail onboarding because a display name did not load.
  }

  // Without this Meta delivers this tenant's events nowhere, silently.
  try {
    await subscribeAppToWaba(wabaId, accessToken);
  } catch (err) {
    const message = err instanceof WaGraphError ? err.message : "Webhook subscription failed";
    warnings.push(`Webhook subscription failed: ${message}. Inbound messages will not arrive.`);
  }

  // Best-effort by design: with no credit line the tenant's own card pays Meta
  // and our charge becomes a software fee. Not a failure.
  const credit = await shareCreditLine(wabaId, accessToken);
  if (!credit.shared) {
    warnings.push(`Credit line not attached: ${credit.reason ?? "unknown"}. Meta will bill the account owner directly.`);
  }

  const numbers = await listWabaPhoneNumbers(wabaId, accessToken).catch(() => []);
  if (numbers.length === 0) {
    warnings.push("No phone number on this WhatsApp Business Account yet — the owner must add and verify one before sending.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.waTenant.update({
      where: { id: tenantId },
      data: {
        wabaId,
        name: wabaName || undefined,
        status: "CONNECTED",
        accessTokenEnc: encrypt(accessToken),
        tokenExpiresAt: expiresAt,
        creditLineShared: credit.shared,
        creditLineNote: credit.reason,
        connectedAt: new Date(),
      },
    });

    for (const n of numbers) {
      await tx.waNumber.upsert({
        where: { phoneNumberId: n.id },
        create: {
          tenantId,
          phoneNumberId: n.id,
          displayNumber: n.display_phone_number,
          verifiedName: n.verified_name,
          qualityRating: n.quality_rating,
          status: n.code_verification_status === "VERIFIED" ? "VERIFIED" : "PENDING",
        },
        update: {
          tenantId,
          displayNumber: n.display_phone_number,
          verifiedName: n.verified_name,
          qualityRating: n.quality_rating,
        },
      });
    }
  });

  void platformId; // scoping already enforced by the caller resolving the tenant

  return {
    tenantId,
    wabaId,
    numbers: numbers.map((n) => ({
      phoneNumberId: n.id,
      displayNumber: n.display_phone_number,
      verifiedName: n.verified_name,
    })),
    creditLineShared: credit.shared,
    creditLineNote: credit.reason,
    warnings,
  };
}

/**
 * The decrypted token for a tenant's WABA.
 *
 * Every outbound Graph call goes through here rather than reading the column, so
 * there is exactly one place that decrypts and exactly one place that decides a
 * tenant is not usable yet.
 */
export async function getTenantToken(tenantId: string): Promise<{ token: string; wabaId: string }> {
  const tenant = await prisma.waTenant.findUnique({
    where: { id: tenantId },
    select: { accessTokenEnc: true, wabaId: true, status: true },
  });

  if (!tenant?.accessTokenEnc || !tenant.wabaId) {
    throw new WaError("TENANT_NOT_FOUND", "This account has not connected WhatsApp yet", 409);
  }
  if (tenant.status === "SUSPENDED" || tenant.status === "DISCONNECTED") {
    throw new WaError("TENANT_NOT_FOUND", `This account is ${tenant.status.toLowerCase()}`, 409);
  }

  return { token: decrypt(tenant.accessTokenEnc), wabaId: tenant.wabaId };
}

/** Re-reads numbers from Meta. Quality rating and limit tier drift on their own. */
export async function refreshTenantNumbers(tenantId: string) {
  const { token, wabaId } = await getTenantToken(tenantId);
  const numbers = await listWabaPhoneNumbers(wabaId, token);

  for (const n of numbers) {
    await prisma.waNumber.upsert({
      where: { phoneNumberId: n.id },
      create: {
        tenantId,
        phoneNumberId: n.id,
        displayNumber: n.display_phone_number,
        verifiedName: n.verified_name,
        qualityRating: n.quality_rating,
        status: n.code_verification_status === "VERIFIED" ? "VERIFIED" : "PENDING",
      },
      update: {
        displayNumber: n.display_phone_number,
        verifiedName: n.verified_name,
        qualityRating: n.quality_rating,
      },
    });
  }

  return numbers;
}
