import { describe, it, expect } from "vitest";
import { describeRejection, isUnactionableRejection } from "../rejection";

describe("describeRejection", () => {
  it("uses message and stack from an Error", () => {
    const err = new Error("boom");
    const result = describeRejection(err);
    expect(result.message).toBe("boom");
    expect(result.stack).toContain("boom");
  });

  it("falls back to the Error name when the message is empty", () => {
    const err = new TypeError("");
    expect(describeRejection(err).message).toBe("TypeError");
  });

  it("extracts stable fields from a plain object instead of [object Object]", () => {
    const result = describeRejection({ code: "TIMEOUT", endpoint: "/token" });
    expect(result.message).toBe("TIMEOUT");
    expect(result.message).not.toBe("[object Object]");
    expect(result.details).toContain("/token");
  });

  it("prefers .message over .code", () => {
    expect(describeRejection({ message: "request failed", code: 500 }).message).toBe(
      "request failed"
    );
  });

  it("reads a nested .error.message", () => {
    expect(describeRejection({ error: { message: "inner failure" } }).message).toBe(
      "inner failure"
    );
  });

  it("reads a string .error", () => {
    expect(describeRejection({ error: "denied" }).message).toBe("denied");
  });

  it("does not re-create [object Object] from a non-string .message", () => {
    const result = describeRejection({ message: { nested: 1 }, code: "E_NESTED" });
    expect(result.message).toBe("E_NESTED");
  });

  it("stringifies numeric .code and .status", () => {
    expect(describeRejection({ code: 429 }).message).toBe("429");
    expect(describeRejection({ status: 503 }).message).toBe("503");
  });

  it("falls back to the key shape, not the values, when no stable rung exists", () => {
    const result = describeRejection({ endpoint: "/token", retries: 3 });
    expect(result.message).toBe("Rejected object: endpoint, retries");
    expect(result.details).toContain("/token");
  });

  it("keeps the shape message stable across occurrences so dedup still fires", () => {
    // Volatile values would otherwise produce a unique signature per occurrence.
    const first = describeRejection({ endpoint: "/token", reqId: "a7f3" });
    const second = describeRejection({ endpoint: "/token", reqId: "b91c" });
    expect(first.message).toBe(second.message);
  });

  it("caps the listed keys", () => {
    const wide = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7 };
    expect(describeRejection(wide).message).toBe("Rejected object: a, b, c, d, e, …");
  });

  it("keeps a stack from a cross-realm error that fails instanceof Error", () => {
    const fake = {
      name: "Error",
      message: "extension blew up",
      stack: "Error: extension blew up\n  at chrome-extension://abc/inject.js:1:1",
    };
    const result = describeRejection(fake);
    expect(result.stack).toContain("chrome-extension://");
  });

  it("survives circular references", () => {
    const circular: Record<string, unknown> = { code: "LOOP" };
    circular.self = circular;
    expect(() => describeRejection(circular)).not.toThrow();
    expect(describeRejection(circular).message).toBe("LOOP");
  });

  it("survives throwing getters", () => {
    const hostile = {
      get message(): string {
        throw new Error("nope");
      },
    };
    expect(() => describeRejection(hostile)).not.toThrow();
  });

  it("survives a Symbol reason", () => {
    expect(() => describeRejection(Symbol("nope"))).not.toThrow();
  });

  it("survives BigInt values", () => {
    expect(() => describeRejection({ size: BigInt(9) })).not.toThrow();
  });

  it("names the event type instead of listing isTrusted", () => {
    // Chrome exposes `isTrusted` as an own key, so the shape fallback used to
    // produce "Rejected object: isTrusted" — a report naming nothing (#1458).
    const result = describeRejection(new Event("error"));
    expect(result.message).toBe('Event ("error")');
    expect(result.message).not.toContain("isTrusted");
  });

  it("names the failing element and URL from an event target", () => {
    const img = document.createElement("img");
    img.src = "https://cdn.example.com/logo.png";
    document.body.appendChild(img);
    const event = new ErrorEvent("error");
    Object.defineProperty(event, "target", { value: img });

    const result = describeRejection(event);
    expect(result.message).toContain('ErrorEvent ("error")');
    expect(result.message).toContain("from <img>");
    expect(result.message).toContain("https://cdn.example.com/logo.png");

    img.remove();
  });

  it("strips the query and hash so repeats share a dedup signature", () => {
    const img = document.createElement("img");
    img.src = "https://cdn.example.com/logo.png?v=1";
    const first = new Event("error");
    Object.defineProperty(first, "target", { value: img });

    const other = document.createElement("img");
    other.src = "https://cdn.example.com/logo.png?v=2";
    const second = new Event("error");
    Object.defineProperty(second, "target", { value: other });

    expect(describeRejection(first).message).toBe(describeRejection(second).message);
    expect(describeRejection(first).message).not.toContain("?v=");
  });

  it("prefers a real ErrorEvent message over the event description", () => {
    const event = new ErrorEvent("error", { message: "script parse failed" });
    expect(describeRejection(event).message).toBe("script parse failed");
  });

  it("describes a cross-realm event that fails instanceof Event", () => {
    // Events from an iframe or extension realm fail `instanceof` but still
    // carry `type` and `isTrusted`.
    const foreign = { type: "abort", isTrusted: true };
    expect(describeRejection(foreign).message).toContain('("abort")');
    expect(describeRejection(foreign).message).not.toContain("Rejected object");
  });

  it("handles primitives", () => {
    expect(describeRejection("plain string").message).toBe("plain string");
    expect(describeRejection(42).message).toBe("42");
    expect(describeRejection(null).message).toBe("");
    expect(describeRejection(undefined).message).toBe("");
  });
});

describe("isUnactionableRejection", () => {
  it("flags an empty description", () => {
    expect(isUnactionableRejection({ message: "" })).toBe(true);
  });

  it("flags a literal [object Object] message with no stack", () => {
    expect(isUnactionableRejection({ message: "[object Object]" })).toBe(true);
  });

  it("keeps anything with a stack", () => {
    expect(isUnactionableRejection({ message: "", stack: "Error\n  at x" })).toBe(false);
  });

  it("keeps anything with a real message", () => {
    expect(isUnactionableRejection({ message: "TIMEOUT" })).toBe(false);
  });

  it("drops an empty object rejection end to end", () => {
    expect(isUnactionableRejection(describeRejection({}))).toBe(true);
    expect(isUnactionableRejection(describeRejection(undefined))).toBe(true);
    expect(isUnactionableRejection(describeRejection(null))).toBe(true);
  });

  it("keeps an event rejection — it names the failing resource", () => {
    // It used to arrive as the stack-less, nothing-naming "Rejected object:
    // isTrusted"; now it carries a real message and stays reportable.
    const description = describeRejection(new Event("error"));
    expect(description.message).toBe('Event ("error")');
    expect(isUnactionableRejection(description)).toBe(false);
  });

  it("still reports a key-list rejection", () => {
    expect(isUnactionableRejection(describeRejection({ endpoint: "/t", retries: 3 }))).toBe(
      false
    );
  });

  it("keeps an Error rejection unchanged", () => {
    const description = describeRejection(new Error("boom"));
    expect(description.message).toBe("boom");
    expect(isUnactionableRejection(description)).toBe(false);
  });
});
