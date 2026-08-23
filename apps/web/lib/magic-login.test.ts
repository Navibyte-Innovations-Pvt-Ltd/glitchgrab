// magic-login tests — run with: bun test lib/magic-login.test.ts
//
// Covers the pure half of lib/magic-login.ts: packing a login token and its
// destination into ONE WhatsApp URL-button variable, and refusing to redirect
// anywhere but this site. Both are places a mistake fails silently — a broken
// suffix produces a 404 the sender never sees, and a permissive redirect turns
// an auto-login link into an open redirect.
import { describe, expect, it } from "bun:test";
import {
  decodeMagicSuffix,
  encodeMagicSuffix,
  magicButtonSuffix,
  magicLinkUrl,
  safeTargetPath,
} from "./magic-login";

describe("encode/decode round trip", () => {
  it("survives a plain path", () => {
    const suffix = encodeMagicSuffix("tok-1", "/org/Navibyte");
    expect(decodeMagicSuffix(suffix)).toEqual({ token: "tok-1", targetPath: "/org/Navibyte" });
  });

  it("survives a path with a query string", () => {
    // The whole point: a `?` cannot ride in the URL variable raw, so the
    // destination is base64url'd. It must come back byte-identical.
    const path = "/org/Navibyte-Innovations-Pvt-Ltd?triageAssign=assigned";
    const round = decodeMagicSuffix(encodeMagicSuffix("tok-2", path));
    expect(round.targetPath).toBe(path);
  });

  it("emits only characters Meta leaves alone", () => {
    const suffix = encodeMagicSuffix(
      crypto.randomUUID(),
      "/org/Some-Org?triageAssign=assigned&x=1"
    );
    // A-Z a-z 0-9 - _ . — anything else risks percent-encoding in transit.
    expect(suffix).toMatch(/^[A-Za-z0-9._-]+$/);
  });

  it("reads a tokenless suffix as empty, not as the sentinel word", () => {
    const suffix = encodeMagicSuffix(null, "/dashboard");
    expect(suffix.startsWith("notoken.")).toBe(true);
    expect(decodeMagicSuffix(suffix)).toEqual({ token: "", targetPath: "/dashboard" });
  });

  it("splits on the FIRST dot, so a dotted destination still decodes", () => {
    const round = decodeMagicSuffix(encodeMagicSuffix("tok-3", "/org/a.b.c"));
    expect(round).toEqual({ token: "tok-3", targetPath: "/org/a.b.c" });
  });

  it("treats a bare segment as a token with no destination", () => {
    expect(decodeMagicSuffix("just-a-token")).toEqual({ token: "just-a-token", targetPath: null });
  });

  it("returns null rather than throwing on a corrupt destination", () => {
    expect(decodeMagicSuffix("tok.!!!not-base64!!!").token).toBe("tok");
  });
});

describe("safeTargetPath", () => {
  it("keeps same-site paths", () => {
    expect(safeTargetPath("/org/Navibyte")).toBe("/org/Navibyte");
    expect(safeTargetPath("/dashboard?tab=open")).toBe("/dashboard?tab=open");
  });

  it("refuses anything that leaves this site", () => {
    // `//evil.com` is the one that gets missed: no scheme, but a browser treats
    // it as absolute. An auto-login link that bounces off-site is an open
    // redirect that arrives already authenticated.
    for (const hostile of [
      "//evil.com",
      "https://evil.com",
      "http://evil.com",
      "javascript:alert(1)",
      "/\\evil.com",
      "",
      null,
      undefined,
    ]) {
      expect(safeTargetPath(hostile)).toBe("/dashboard");
    }
  });

  it("honours a caller-supplied fallback", () => {
    expect(safeTargetPath(null, "/org/x")).toBe("/org/x");
  });
});

describe("magicButtonSuffix", () => {
  it("points at the magic-link route when a token exists", () => {
    expect(magicButtonSuffix("tok-4", "/org/x")).toBe(
      `magic-link/${encodeMagicSuffix("tok-4", "/org/x")}`
    );
  });

  it("degrades to a plain path when no token could be minted", () => {
    // Never an empty string: a template approved WITH a dynamic URL button is
    // rejected outright when its parameter is missing (#131008), losing the
    // whole message rather than just the button.
    expect(magicButtonSuffix(null, "/org/x")).toBe("org/x");
    expect(magicButtonSuffix(null, "/org/x").length).toBeGreaterThan(0);
  });

  it("never starts with a slash — the button prefix already ends in one", () => {
    for (const suffix of [magicButtonSuffix("t", "/org/x"), magicButtonSuffix(null, "/org/x")]) {
      expect(suffix.startsWith("/")).toBe(false);
    }
  });
});

describe("magicLinkUrl", () => {
  it("builds an absolute auto-login URL", () => {
    // Absolute, not scheme-asserted: NEXT_PUBLIC_APP_URL is http://localhost
    // in dev and https://glitchgrab.dev in production.
    const url = magicLinkUrl("tok-5", "/org/x");
    expect(url).toMatch(/^https?:\/\//);
    expect(url).toContain("/magic-link/tok-5.");
  });

  it("falls back to the plain destination without a token", () => {
    expect(magicLinkUrl(null, "/org/x").endsWith("/org/x")).toBe(true);
  });
});
