import { createHmac, timingSafeEqual } from "crypto";
import { WaError } from "./errors";

/**
 * Short-lived tickets for the inbox SSE stream.
 *
 * `EventSource` cannot set an `Authorization` header — that is a browser
 * limitation, not an oversight — so a stream URL has to carry its own
 * credential. Putting the platform's long-lived API key in a query string would
 * leak it into browser history, referrers, and every proxy log between here and
 * the client.
 *
 * Instead the platform exchanges its key for a ticket that is signed, scoped to
 * one tenant, and valid for sixty seconds. Stateless by design: no table to
 * clean up, and the short lifetime makes revocation unnecessary.
 */

const TICKET_TTL_MS = 60_000;

/**
 * Domain-separated so a ticket can never be confused with any other HMAC this
 * app produces over the same key.
 */
const DOMAIN = "wa-stream-ticket-v1";

function signingKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new WaError("UNAUTHORIZED", "ENCRYPTION_KEY is not set", 500);
  return key;
}

function sign(payload: string): string {
  return createHmac("sha256", signingKey()).update(`${DOMAIN}:${payload}`).digest("base64url");
}

interface TicketClaims {
  platformId: string;
  tenantId: string;
}

export function issueStreamTicket(claims: TicketClaims): { ticket: string; expiresIn: number } {
  const payload = `${claims.platformId}.${claims.tenantId}.${Date.now() + TICKET_TTL_MS}`;
  return {
    ticket: `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`,
    expiresIn: Math.floor(TICKET_TTL_MS / 1000),
  };
}

/**
 * Verifies a ticket and returns what it grants.
 *
 * The signature is compared in constant time, and expiry is checked only after
 * the signature passes — checking it first would let an attacker distinguish
 * "expired" from "forged" and learn something about the key.
 */
export function verifyStreamTicket(ticket: string | null): TicketClaims {
  if (!ticket) throw new WaError("UNAUTHORIZED", "Missing stream ticket", 401);

  const [encoded, signature] = ticket.split(".");
  if (!encoded || !signature) throw new WaError("UNAUTHORIZED", "Malformed stream ticket", 401);

  let payload: string;
  try {
    payload = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    throw new WaError("UNAUTHORIZED", "Malformed stream ticket", 401);
  }

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new WaError("UNAUTHORIZED", "Invalid stream ticket", 401);
  }

  const [platformId, tenantId, expiresAt] = payload.split(".");
  if (!platformId || !tenantId || !expiresAt) {
    throw new WaError("UNAUTHORIZED", "Malformed stream ticket", 401);
  }

  if (Number(expiresAt) < Date.now()) {
    throw new WaError("UNAUTHORIZED", "Stream ticket expired", 401);
  }

  return { platformId, tenantId };
}
