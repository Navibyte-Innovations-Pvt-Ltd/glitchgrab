// Stream-ticket tests — run with: bun test lib/wa/stream-ticket.test.ts
//
// These tickets are the only credential on the inbox SSE URL, because
// EventSource cannot send an Authorization header. A forged or over-long-lived
// ticket would hand one platform a live feed of another tenant's WhatsApp, so
// every rejection path below is a security boundary rather than a nicety.
import { beforeAll, describe, expect, it } from "bun:test";
import { issueStreamTicket, verifyStreamTicket } from "./stream-ticket";

beforeAll(() => {
  // 32 chars — the length lib/encrypt.ts requires.
  process.env.ENCRYPTION_KEY ??= "0123456789abcdef0123456789abcdef";
});

describe("round trip", () => {
  it("returns the claims it was issued with", () => {
    const { ticket } = issueStreamTicket({ platformId: "plat_1", tenantId: "ten_1" });
    expect(verifyStreamTicket(ticket)).toEqual({ platformId: "plat_1", tenantId: "ten_1" });
  });

  it("expires within a minute", () => {
    expect(issueStreamTicket({ platformId: "p", tenantId: "t" }).expiresIn).toBe(60);
  });
});

describe("rejection", () => {
  it("refuses a missing ticket", () => {
    expect(() => verifyStreamTicket(null)).toThrow(/Missing/);
  });

  it("refuses a ticket with no signature", () => {
    expect(() => verifyStreamTicket("abc")).toThrow(/Malformed/);
  });

  it("refuses a tampered payload", () => {
    // The attack this exists to stop: swap in another tenant's id and keep the
    // signature. The HMAC covers the payload, so it must not verify.
    const { ticket } = issueStreamTicket({ platformId: "plat_1", tenantId: "ten_1" });
    const [, signature] = ticket.split(".");
    const forged = Buffer.from(`plat_1.ten_VICTIM.${Date.now() + 60_000}`).toString("base64url");
    expect(() => verifyStreamTicket(`${forged}.${signature}`)).toThrow(/Invalid/);
  });

  it("refuses a signature from a different key", () => {
    const { ticket } = issueStreamTicket({ platformId: "p", tenantId: "t" });
    const [payload] = ticket.split(".");
    expect(() => verifyStreamTicket(`${payload}.notarealsignature`)).toThrow(/Invalid/);
  });

  it("refuses an expired ticket even though it is correctly signed", () => {
    // Expiry is checked after the signature, so this needs a genuinely signed
    // past-dated payload rather than a hand-built one.
    const original = Date.now;
    Date.now = () => original() - 120_000;
    const { ticket } = issueStreamTicket({ platformId: "p", tenantId: "t" });
    Date.now = original;
    expect(() => verifyStreamTicket(ticket)).toThrow(/expired/i);
  });
});
