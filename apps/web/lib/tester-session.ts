import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

/**
 * Lightweight session for QA testers, who are NOT NextAuth users.
 * A tester proves phone ownership via WhatsApp OTP, then gets a signed,
 * httpOnly cookie carrying their testerId. Stateless HMAC — no DB session row.
 */

const COOKIE_NAME = "gg_tester";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function secret(): string {
  return process.env.NEXTAUTH_SECRET ?? process.env.ENCRYPTION_KEY ?? "gg-tester-fallback-secret";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** Build a signed cookie value for a tester session. */
export function signTesterSession(testerId: string): string {
  const exp = Date.now() + TTL_MS;
  const payload = `${testerId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

/** Verify a cookie value; returns the testerId if valid + unexpired, else null. */
export function verifyTesterSession(value: string | undefined | null): string | null {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [testerId, expStr, sig] = parts;
  const payload = `${testerId}.${expStr}`;
  const expected = sign(payload);

  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const exp = parseInt(expStr, 10);
  if (Number.isNaN(exp) || exp < Date.now()) return null;

  return testerId;
}

export const TESTER_COOKIE_NAME = COOKIE_NAME;
export const TESTER_COOKIE_MAX_AGE = Math.floor(TTL_MS / 1000);

/** Read the current tester session (server components / route handlers). */
export async function getTesterSession(): Promise<string | null> {
  const store = await cookies();
  return verifyTesterSession(store.get(COOKIE_NAME)?.value);
}
