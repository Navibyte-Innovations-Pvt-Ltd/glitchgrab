/**
 * Typed failures for the WhatsApp platform. Kept local to lib/wa rather than in
 * packages/shared/src/errors.ts because nothing outside apps/web throws them —
 * the SDK sees the `code` string on the JSON response, not the class.
 */

type WaErrorCode =
  | "UNAUTHORIZED"
  | "PLATFORM_INACTIVE"
  | "TENANT_NOT_FOUND"
  | "INSUFFICIENT_FUNDS"
  | "NO_PRICE_RULE"
  | "INVALID_AMOUNT"
  | "DUPLICATE_REQUEST";

export class WaError extends Error {
  constructor(
    readonly code: WaErrorCode,
    message: string,
    readonly status = 400,
    /** Present on INSUFFICIENT_FUNDS so the caller can tell the user how short they are. */
    readonly detail?: Record<string, unknown>
  ) {
    super(message);
    this.name = "WaError";
  }
}

/**
 * The wallet that ran dry, and by how much. The SDK surfaces this so a platform
 * can prompt its tenant to recharge instead of showing a generic failure.
 */
export function insufficientFunds(
  scope: "tenant" | "platform",
  requiredPaise: number,
  spendablePaise: number
): WaError {
  return new WaError(
    "INSUFFICIENT_FUNDS",
    scope === "tenant"
      ? "Tenant balance too low. Recharge to continue sending."
      : "Platform balance too low. Recharge to continue sending.",
    402,
    { scope, requiredPaise, spendablePaise, shortfallPaise: requiredPaise - spendablePaise }
  );
}
