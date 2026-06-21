// events-context tests — run with: bun test events-context.test.ts
//
// BUG (recording My Abhyasika): the generated script said "localhost:3333" and
// didn't name the product, because raw event URLs went straight to the model.
import { describe, expect, it } from "bun:test";
import {
  buildOrderedStepsFromEvents,
  buildScriptContext,
  checkScriptOrder,
  deriveAppName,
  stripOrigin,
} from "./events-context";

describe("stripOrigin", () => {
  it("drops the host, query and hash — keeps the path", () => {
    expect(stripOrigin("http://localhost:3333/dashboard/abc?branch_id=all#x")).toBe("/dashboard/abc");
    expect(stripOrigin("https://my.app/signup?page=login")).toBe("/signup");
  });
  it("handles relative + bad input", () => {
    expect(stripOrigin("/foo?x=1")).toBe("/foo");
    expect(stripOrigin(undefined)).toBeUndefined();
    expect(stripOrigin(123 as unknown)).toBeUndefined();
  });
});

describe("deriveAppName", () => {
  it("takes the product name from a navigate page title", () => {
    const events = [
      { type: "click", label: "x" },
      { type: "navigate", label: "My Abhyasika | Best Library Management Software India | Free Trial" },
    ];
    expect(deriveAppName(events)).toBe("My Abhyasika");
  });
  it("does not split a brand that contains a hyphen", () => {
    expect(deriveAppName([{ type: "navigate", label: "Acme-Tools — Home" }])).toBe("Acme-Tools");
  });
  it("returns empty when no title is captured", () => {
    expect(deriveAppName([{ type: "click", label: "Login" }])).toBe("");
  });
});

describe("buildScriptContext", () => {
  const events = [
    { type: "navigate", label: "My Abhyasika | Best Library Management Software", url: "http://localhost:3333/" },
    { type: "click", label: "Phone", url: "http://localhost:3333/signup", meta: { href: "http://localhost:3333/signup?page=login" } },
  ];

  it("produces an events JSON with NO host/localhost", () => {
    const { eventsJson } = buildScriptContext(events);
    expect(eventsJson).not.toContain("localhost");
    expect(eventsJson).not.toContain("http://");
    expect(eventsJson).toContain("/signup"); // path preserved
  });

  it("names the product and forbids hostnames in the appLine", () => {
    const { appLine, appName } = buildScriptContext(events);
    expect(appName).toBe("My Abhyasika");
    expect(appLine).toContain("My Abhyasika");
    expect(appLine.toLowerCase()).toContain("never say a hostname");
  });

  it("still forbids hostnames when no app name is found", () => {
    const { appLine, appName } = buildScriptContext([{ type: "click", url: "http://localhost:3333/x" }]);
    expect(appName).toBe("");
    expect(appLine.toLowerCase()).toContain("never say a hostname");
  });
});

// ── checkScriptOrder ─────────────────────────────────────────────────────────
//
// Real regression: the My Abhyasika onboarding recording had:
//   t=150s → UPI QR code upload
//   t=164s → one-time fees (locker fee, security deposit)
// The model reordered them (fees before QR) because it applied "logical flow"
// over event timestamps. The prompt fix + this validator guard against that.

describe("checkScriptOrder", () => {
  const QR_STEP = { name: "QR upload", keywords: ["qr", "upi qr", "payment qr", "upi code"] };
  const FEES_STEP = { name: "one-time fees", keywords: ["one time", "locker", "security deposit"] };
  const PLAN_STEP = { name: "membership plan", keywords: ["monthly plan", "membership", "plan"] };

  it("returns ok when steps appear in correct order", () => {
    const script = "पहले membership plan set करते हैं। फिर UPI QR code upload करते हैं। इसके बाद one time fees add करते हैं।";
    const result = checkScriptOrder(script, [PLAN_STEP, QR_STEP, FEES_STEP]);
    expect(result.ok).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("catches QR after fees — the exact regression from My Abhyasika recording", () => {
    // Reproduces the bug: script said fees first, then QR — opposite of event order
    const script = "Membership के अलावा one time fees भी add कर सकते हैं, जैसे locker fee। इसके बाद UPI QR code upload करना होता है।";
    const result = checkScriptOrder(script, [QR_STEP, FEES_STEP]);
    expect(result.ok).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toEqual({ earlier: "QR upload", later: "one-time fees" });
  });

  it("no violation when a step is absent from the script", () => {
    // QR not mentioned at all — model skipped it; not a violation
    const script = "one time fees add कर सकते हैं।";
    const result = checkScriptOrder(script, [QR_STEP, FEES_STEP]);
    expect(result.ok).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("no violation when both steps are absent", () => {
    const result = checkScriptOrder("library setup complete!", [QR_STEP, FEES_STEP]);
    expect(result.ok).toBe(true);
  });

  it("keyword match is case-insensitive", () => {
    const script = "Security Deposit collect होती है। UPI QR बाद में upload होता है।";
    const result = checkScriptOrder(script, [QR_STEP, FEES_STEP]);
    expect(result.ok).toBe(false);
    expect(result.violations[0].earlier).toBe("QR upload");
  });

  it("uses the earliest keyword hit per step", () => {
    // script mentions "upi code" before "locker", then "qr" after "security deposit"
    // earliest QR hit = "upi code" position → should be before "locker"
    const script = "पहले upi code scan करते हैं। फिर locker fee pay करते हैं। qr details confirm होते हैं। security deposit भी है।";
    const result = checkScriptOrder(script, [QR_STEP, FEES_STEP]);
    expect(result.ok).toBe(true);
  });
});

// ── buildOrderedStepsFromEvents ──────────────────────────────────────────────

describe("buildOrderedStepsFromEvents", () => {
  it("extracts note events in order as steps", () => {
    const events = [
      { type: "click", label: "Sign Up" },
      { type: "note", label: "Google" },
      { type: "note", label: "Phone" },
      { type: "note", label: "Library Owner" },
      { type: "click", label: "Continue" },
      { type: "note", label: "Monthly Plan" },
    ];
    const steps = buildOrderedStepsFromEvents(events);
    expect(steps.map((s) => s.name)).toEqual(["Google", "Phone", "Library Owner", "Monthly Plan"]);
  });

  it("skips note events with labels shorter than 4 chars", () => {
    const events = [
      { type: "note", label: "Add" },   // 3 chars → skipped
      { type: "note", label: "UPI QR" }, // 6 chars → kept
    ];
    const steps = buildOrderedStepsFromEvents(events);
    expect(steps).toHaveLength(1);
    expect(steps[0].name).toBe("UPI QR");
  });

  it("includes first-two-word keyword alongside full label", () => {
    const events = [
      { type: "note", label: "Library Owner Manage students, payments, seats" },
    ];
    const steps = buildOrderedStepsFromEvents(events);
    expect(steps[0].keywords).toContain("Library Owner");
  });

  it("returns empty array when no note events exist", () => {
    const events = [{ type: "click", label: "Login" }, { type: "navigate", label: "Home" }];
    expect(buildOrderedStepsFromEvents(events)).toHaveLength(0);
  });
});
