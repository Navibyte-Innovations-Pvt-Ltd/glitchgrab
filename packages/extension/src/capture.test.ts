// Capture-orchestration tests — the "click → correct CaptureEvent" brain.
// jsdom for the DOM; tiny real debounce delays (injected) keep tests fast + reliable.
// Run: bun test capture.test.ts
import { beforeAll, describe, expect, it } from "bun:test";
import { JSDOM } from "jsdom";
import { Capture, type CaptureEvent } from "./capture";

let dom: JSDOM;

// Small delays so real timers fire quickly during the test.
const FAST = { inputDebounceMs: 20, selDebounceMs: 20, scrollDebounceMs: 20, idleThresholdMs: 30, idleCheckMs: 10 };
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
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "click", label: "Save" });
    expect(events[0].meta?.role).toBe("button");
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
    expect(events).toHaveLength(0);
  });

  it("captures a navigate event on SPA navigation", () => {
    const { events, cap } = setup();
    cap.start();
    cap.onNavigate("Dashboard");
    const nav = events.find((e) => e.type === "navigate");
    expect(nav?.label).toBe("Dashboard");
    cap.stop();
  });
});
