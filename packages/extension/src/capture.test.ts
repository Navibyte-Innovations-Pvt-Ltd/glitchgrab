// Capture-orchestration tests — the "click → correct CaptureEvent" brain.
// jsdom for the DOM; tiny real debounce delays (injected) keep tests fast + reliable.
// Run: bun test capture.test.ts
import { beforeAll, describe, expect, it } from "bun:test";
import { JSDOM } from "jsdom";
import { Capture, type CaptureEvent } from "./capture";

let dom: JSDOM;

// Small delays so real timers fire quickly during the test.
const FAST = { inputDebounceMs: 20, selDebounceMs: 20, scrollDebounceMs: 20, idleThresholdMs: 30, idleCheckMs: 10, minHoldMs: 20 };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeAll(() => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost:3000/" });
  const w = dom.window as unknown as Record<string, unknown>;
  for (const k of ["document", "location", "window", "Element", "HTMLElement", "HTMLInputElement", "Node", "CustomEvent", "Event"]) {
    (globalThis as Record<string, unknown>)[k] = w[k];
  }
  Object.defineProperty(dom.window.HTMLElement.prototype, "innerText", {
    get(this: HTMLElement) { return this.textContent; },
    configurable: true,
  });
});

function setup() {
  const events: CaptureEvent[] = [];
  const cap = new Capture((e) => events.push(e), FAST);
  dom.window.document.body.innerHTML = "";
  return { events, cap };
}

function fire(el: Element | Document, type: string, init: Record<string, unknown> = {}) {
  el.dispatchEvent(new dom.window.Event(type, { bubbles: true, ...init }));
}

describe("Capture orchestration", () => {
  it("does NOT capture before start()", () => {
    const { events, cap } = setup();
    dom.window.document.body.innerHTML = `<button>Hi</button>`;
    fire(dom.window.document.querySelector("button")!, "click");
    expect(events).toHaveLength(0);
    expect(cap.active).toBe(false);
  });

  it("captures a click with label + meta after start()", () => {
    const { events, cap } = setup();
    cap.start();
    dom.window.document.body.innerHTML = `<button aria-label="Save">x</button>`;
    fire(dom.window.document.querySelector("button")!, "click");
    const clicks = events.filter((e) => e.type === "click");
    expect(clicks).toHaveLength(1);
    expect(clicks[0]).toMatchObject({ type: "click", label: "Save" });
    expect(clicks[0].meta?.role).toBe("button");
    cap.stop();
  });

  it("dedups identical rapid clicks within 80ms", () => {
    const { events, cap } = setup();
    cap.start();
    dom.window.document.body.innerHTML = `<button aria-label="Like">x</button>`;
    const btn = dom.window.document.querySelector("button")!;
    fire(btn, "click");
    fire(btn, "click");
    expect(events.filter((e) => e.type === "click")).toHaveLength(1);
    cap.stop();
  });

  it("debounces typing into ONE input event with the final value", async () => {
    const { events, cap } = setup();
    cap.start();
    dom.window.document.body.innerHTML = `<input type="text" placeholder="email" />`;
    const input = dom.window.document.querySelector("input")! as HTMLInputElement;
    input.value = "a"; fire(input, "input");
    input.value = "ab"; fire(input, "input");
    input.value = "abc"; fire(input, "input");
    expect(events.filter((e) => e.type === "input")).toHaveLength(0); // still debouncing
    await sleep(40);
    const inputs = events.filter((e) => e.type === "input");
    expect(inputs).toHaveLength(1);
    expect(inputs[0].preview).toBe("abc");
    cap.stop();
  });

  it("NEVER captures password field values", async () => {
    const { events, cap } = setup();
    cap.start();
    dom.window.document.body.innerHTML = `<input type="password" />`;
    const input = dom.window.document.querySelector("input")! as HTMLInputElement;
    input.value = "secret"; fire(input, "input");
    await sleep(40);
    expect(events.filter((e) => e.type === "input")).toHaveLength(0);
    cap.stop();
  });

  // BUG (My Abhyasika signup): the login OTP "1234" was captured in plaintext
  // because OTP fields are type=text, not password.
  it("NEVER captures an anonymous short numeric OTP box", async () => {
    const { events, cap } = setup();
    cap.start();
    dom.window.document.body.innerHTML = `<input type="text" maxlength="4" />`;
    const input = dom.window.document.querySelector("input")! as HTMLInputElement;
    input.value = "1234"; fire(input, "input");
    await sleep(40);
    expect(events.filter((e) => e.type === "input")).toHaveLength(0);
    cap.stop();
  });

  it("NEVER captures a labelled OTP / verification-code field", async () => {
    const { events, cap } = setup();
    cap.start();
    dom.window.document.body.innerHTML = `<input type="text" name="otp" placeholder="Enter verification code" />`;
    const input = dom.window.document.querySelector("input")! as HTMLInputElement;
    input.value = "987654"; fire(input, "input");
    await sleep(40);
    expect(events.filter((e) => e.type === "input")).toHaveLength(0);
    cap.stop();
  });

  it("STILL captures a normal labelled text field", async () => {
    const { events, cap } = setup();
    cap.start();
    dom.window.document.body.innerHTML = `<input type="text" name="first_name" placeholder="First name" />`;
    const input = dom.window.document.querySelector("input")! as HTMLInputElement;
    input.value = "Demo"; fire(input, "input");
    await sleep(40);
    const inputs = events.filter((e) => e.type === "input");
    expect(inputs).toHaveLength(1);
    expect(inputs[0].preview).toBe("Demo");
    cap.stop();
  });

  it("flushes a pending input on stop()", () => {
    const { events, cap } = setup();
    cap.start();
    dom.window.document.body.innerHTML = `<input type="text" />`;
    const input = dom.window.document.querySelector("input")! as HTMLInputElement;
    input.value = "draft"; fire(input, "input");
    cap.stop(); // stop before debounce fires → must flush synchronously
    const inputs = events.filter((e) => e.type === "input");
    expect(inputs).toHaveLength(1);
    expect(inputs[0].preview).toBe("draft");
  });

  it("flushes the previous field when typing moves to a new field", async () => {
    const { events, cap } = setup();
    cap.start();
    dom.window.document.body.innerHTML = `<input id="a" /><input id="b" />`;
    const a = dom.window.document.querySelector("#a")! as HTMLInputElement;
    const b = dom.window.document.querySelector("#b")! as HTMLInputElement;
    a.value = "first"; fire(a, "input");
    b.value = "second"; fire(b, "input"); // switching fields flushes 'a'
    await sleep(40);
    const previews = events.filter((e) => e.type === "input").map((e) => e.preview);
    expect(previews).toEqual(["first", "second"]);
    cap.stop();
  });

  it("captures Enter/Escape/Tab keydowns, ignores others", () => {
    const { events, cap } = setup();
    cap.start();
    const KE = dom.window.KeyboardEvent;
    dom.window.document.dispatchEvent(new KE("keydown", { key: "a", bubbles: true }));
    dom.window.document.dispatchEvent(new KE("keydown", { key: "Enter", bubbles: true }));
    const keys = events.filter((e) => e.type === "keydown");
    expect(keys).toHaveLength(1);
    expect(keys[0].label).toBe("Enter");
    cap.stop();
  });

  it("captures a known modifier shortcut with its action word + meta", () => {
    const { events, cap } = setup();
    cap.start();
    const KE = dom.window.KeyboardEvent;
    dom.window.document.dispatchEvent(new KE("keydown", { key: "z", metaKey: true, bubbles: true }));
    const k = events.filter((e) => e.type === "keydown");
    expect(k).toHaveLength(1);
    expect(k[0].label).toBe("Cmd+Z (undo)");
    expect(k[0].meta).toMatchObject({ shortcut: true, keys: "Cmd+Z", action: "undo" });
    cap.stop();
  });

  it("captures Cmd+Shift+Z as redo and an unknown combo as raw keys", () => {
    const { events, cap } = setup();
    cap.start();
    const KE = dom.window.KeyboardEvent;
    dom.window.document.dispatchEvent(new KE("keydown", { key: "z", metaKey: true, shiftKey: true, bubbles: true }));
    dom.window.document.dispatchEvent(new KE("keydown", { key: "d", metaKey: true, bubbles: true })); // unknown → raw
    const k = events.filter((e) => e.type === "keydown");
    expect(k.map((e) => e.label)).toEqual(["Cmd+Shift+Z (redo)", "Cmd+D"]);
    expect(k[1].meta).toMatchObject({ shortcut: true, keys: "Cmd+D" });
    expect((k[1].meta as Record<string, unknown>).action).toBeUndefined();
    cap.stop();
  });

  it("ignores clipboard combos (copy/paste events cover those) and lone modifiers", () => {
    const { events, cap } = setup();
    cap.start();
    const KE = dom.window.KeyboardEvent;
    dom.window.document.dispatchEvent(new KE("keydown", { key: "c", metaKey: true, bubbles: true }));
    dom.window.document.dispatchEvent(new KE("keydown", { key: "v", metaKey: true, bubbles: true }));
    dom.window.document.dispatchEvent(new KE("keydown", { key: "Meta", metaKey: true, bubbles: true }));
    expect(events.filter((e) => e.type === "keydown")).toHaveLength(0);
    cap.stop();
  });

  it("captures Delete/Arrow keys outside a text field but not while typing", () => {
    const { events, cap } = setup();
    cap.start();
    const KE = dom.window.KeyboardEvent;
    // Outside any field → editor-style intent → captured.
    dom.window.document.dispatchEvent(new KE("keydown", { key: "Delete", bubbles: true }));
    dom.window.document.dispatchEvent(new KE("keydown", { key: "ArrowRight", bubbles: true }));
    // Inside a text input → just typing/editing → ignored.
    dom.window.document.body.innerHTML = `<input id="t" type="text" />`;
    const t = dom.window.document.querySelector("#t")! as HTMLInputElement;
    t.focus();
    dom.window.document.dispatchEvent(new KE("keydown", { key: "Backspace", bubbles: true }));
    const labels = events.filter((e) => e.type === "keydown").map((e) => e.label);
    expect(labels).toEqual(["Delete", "ArrowRight"]);
    cap.stop();
  });

  it("debounces scroll into a single event", async () => {
    const { events, cap } = setup();
    cap.start();
    fire(dom.window.document, "scroll");
    fire(dom.window.document, "scroll");
    await sleep(40);
    expect(events.filter((e) => e.type === "scroll")).toHaveLength(1);
    cap.stop();
  });

  it("emits an idle event when activity resumes after an idle gap", async () => {
    const { events, cap } = setup();
    cap.start();
    dom.window.document.body.innerHTML = `<button aria-label="Go">x</button>`;
    await sleep(60); // > idleThreshold (30) + a checkIdle tick (10) → enters idle
    fire(dom.window.document.querySelector("button")!, "click"); // resume → emit idle span
    expect(events.some((e) => e.type === "idle")).toBe(true);
    cap.stop();
  });

  it("stop() removes listeners — no capture after stop", () => {
    const { events, cap } = setup();
    cap.start();
    cap.stop();
    dom.window.document.body.innerHTML = `<button>x</button>`;
    fire(dom.window.document.querySelector("button")!, "click");
    expect(events.some((e) => e.type === "click")).toBe(false); // start() emits one navigate; no click after stop
  });

  it("captures a navigate event on SPA navigation", () => {
    const { events, cap } = setup();
    cap.start();
    cap.onNavigate("Dashboard");
    const nav = events.filter((e) => e.type === "navigate").at(-1); // last = the SPA nav (start emits one too)
    expect(nav?.label).toBe("Dashboard");
    cap.stop();
  });

  it("captures the app/site name (og:site_name) on the start navigate event", () => {
    const { events, cap } = setup();
    const meta = dom.window.document.createElement("meta");
    meta.setAttribute("property", "og:site_name");
    meta.setAttribute("content", "My Abhyasika");
    dom.window.document.head.appendChild(meta);
    cap.start();
    const nav = events.find((e) => e.type === "navigate");
    expect(nav?.meta?.site).toBe("My Abhyasika");
    meta.remove();
    cap.stop();
  });

  it("holding Shift (then releasing) emits a 'note' for the hovered element", async () => {
    const { events, cap } = setup();
    cap.start();
    dom.window.document.body.innerHTML = `<button aria-label="Claim">Claim</button>`;
    const btn = dom.window.document.querySelector("button")!;
    (dom.window.document as unknown as { elementFromPoint: () => Element | null }).elementFromPoint = () => btn;
    const KE = dom.window.KeyboardEvent;
    dom.window.document.dispatchEvent(new KE("keydown", { key: "Shift", bubbles: true }));
    await sleep(60); // hold past minHoldMs (20 in FAST)
    dom.window.document.dispatchEvent(new KE("keyup", { key: "Shift", bubbles: true }));
    const note = events.find((e) => e.type === "note");
    expect(note?.note).toBe("explain");
    expect(note?.label).toBe("Claim");
    expect(note?.durationMs).toBeGreaterThan(0);
    cap.stop();
  });

  it("a quick Shift tap over a NON-interactive spot does NOT annotate", () => {
    const { events, cap } = setup();
    cap.start();
    dom.window.document.body.innerHTML = `<div id="plain">just some text</div>`;
    const div = dom.window.document.querySelector("#plain")!;
    (dom.window.document as unknown as { elementFromPoint: () => Element | null }).elementFromPoint = () => div;
    const KE = dom.window.KeyboardEvent;
    dom.window.document.dispatchEvent(new KE("keydown", { key: "Shift", bubbles: true }));
    dom.window.document.dispatchEvent(new KE("keyup", { key: "Shift", bubbles: true })); // instant release, no hold
    expect(events.some((e) => e.type === "note")).toBe(false);
    cap.stop();
  });

  it("a quick Shift TAP over an INTERACTIVE control DOES annotate (tap = mark)", () => {
    const { events, cap } = setup();
    cap.start();
    dom.window.document.body.innerHTML = `<button aria-label="Phone">Phone</button>`;
    const btn = dom.window.document.querySelector("button")!;
    (dom.window.document as unknown as { elementFromPoint: () => Element | null }).elementFromPoint = () => btn;
    const KE = dom.window.KeyboardEvent;
    dom.window.document.dispatchEvent(new KE("keydown", { key: "Shift", bubbles: true }));
    dom.window.document.dispatchEvent(new KE("keyup", { key: "Shift", bubbles: true })); // instant tap, NO hold
    const note = events.find((e) => e.type === "note");
    expect(note?.note).toBe("explain");
    expect(note?.label).toBe("Phone");
    cap.stop();
  });

  it("Shift+CLICK (a click during the Shift hold) does NOT annotate", async () => {
    const { events, cap } = setup();
    cap.start();
    dom.window.document.body.innerHTML = `<button aria-label="Row">Row</button>`;
    const btn = dom.window.document.querySelector("button")!;
    (dom.window.document as unknown as { elementFromPoint: () => Element | null }).elementFromPoint = () => btn;
    const KE = dom.window.KeyboardEvent;
    dom.window.document.dispatchEvent(new KE("keydown", { key: "Shift", bubbles: true }));
    fire(btn, "click");                 // Shift+click (multi-select) — not an explain mark
    await sleep(60);                    // even held past minHoldMs (20)
    dom.window.document.dispatchEvent(new KE("keyup", { key: "Shift", bubbles: true }));
    expect(events.some((e) => e.type === "note")).toBe(false);
    cap.stop();
  });

  it("holding Shift WHILE typing a capital does NOT annotate", async () => {
    const { events, cap } = setup();
    cap.start();
    const KE = dom.window.KeyboardEvent;
    dom.window.document.dispatchEvent(new KE("keydown", { key: "Shift", bubbles: true }));
    dom.window.document.dispatchEvent(new KE("keydown", { key: "H", bubbles: true })); // typing → cancels
    await sleep(60);
    dom.window.document.dispatchEvent(new KE("keyup", { key: "Shift", bubbles: true }));
    expect(events.some((e) => e.type === "note")).toBe(false);
    cap.stop();
  });
});
