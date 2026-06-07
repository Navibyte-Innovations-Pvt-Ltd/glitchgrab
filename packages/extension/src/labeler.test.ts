// Label/metadata extraction tests — run with: bun test labeler.test.ts
// Uses jsdom so we exercise the real DOM logic that decides what a click "is".
import { beforeAll, describe, expect, it } from "bun:test";
import { JSDOM } from "jsdom";
import { getClickLabel, describeElement } from "./labeler";

let dom: JSDOM;

beforeAll(() => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost:3000/" });
  const w = dom.window as unknown as Record<string, unknown>;
  // Expose the DOM globals the labeler uses.
  for (const k of ["document", "location", "Element", "HTMLElement", "HTMLInputElement", "Node", "SVGElement"]) {
    (globalThis as Record<string, unknown>)[k] = w[k];
  }
  // jsdom doesn't implement innerText — alias it to textContent so text-based paths work.
  Object.defineProperty(dom.window.HTMLElement.prototype, "innerText", {
    get(this: HTMLElement) { return this.textContent; },
    configurable: true,
  });
});

// Render an HTML fragment and return the element matching `sel`.
function el(html: string, sel: string): Element {
  dom.window.document.body.innerHTML = html;
  const node = dom.window.document.querySelector(sel);
  if (!node) throw new Error(`no element for ${sel}`);
  return node;
}

describe("getClickLabel", () => {
  it("uses aria-label on an icon-only button (no more 'icon-button')", () => {
    const target = el(`<button aria-label="Share post"><svg></svg></button>`, "button");
    expect(getClickLabel(target).label).toBe("Share post");
  });

  it("reads visible text when no aria-label", () => {
    const target = el(`<button>Get Early Access</button>`, "button");
    expect(getClickLabel(target).label).toBe("Get Early Access");
  });

  it("climbs from an inner span to the interactive button's label", () => {
    const target = el(`<button aria-label="Save"><span class="x">icon</span></button>`, "span.x");
    const { label, tag } = getClickLabel(target);
    expect(label).toBe("Save");
    expect(tag).toBe("button");
  });

  it("falls back to an svg <title> for icon buttons", () => {
    const target = el(`<button><svg><title>Delete</title></svg></button>`, "button");
    expect(getClickLabel(target).label).toBe("Delete");
  });

  it("uses a link's href path as a last-resort hint", () => {
    const target = el(`<a href="/dashboard/settings"><svg></svg></a>`, "a");
    expect(getClickLabel(target).label).toContain("/dashboard/settings");
  });

  it("uses data-testid when nothing else exists", () => {
    const target = el(`<button data-testid="submit-form"></button>`, "button");
    expect(getClickLabel(target).label).toBe("submit form");
  });

  it("returns a non-empty placeholder (never crashes) for an empty element", () => {
    const target = el(`<div></div>`, "div");
    expect(getClickLabel(target).label).toContain("no label");
  });

  it("does NOT scrape a descendant card's img alt for a big container click", () => {
    // Regression: clicking blank hero area used to grab an unrelated card logo alt.
    const target = el(
      `<div class="hero"><span>STUDY ROOM MANAGEMENT SOFTWARE</span><h2>Find & Book Study Rooms Near You</h2><div class="card"><img alt="Dnyandeep Abhyasika" src="/x.png"/></div></div>`,
      "div.hero"
    );
    const { label, interactive, weak } = getClickLabel(target);
    expect(label).not.toBe("Dnyandeep Abhyasika");
    expect(interactive).toBe(false); // non-interactive container → droppable by capture
    void weak;
  });

  it("flags a real button click as interactive (kept by capture)", () => {
    const target = el(`<button>Sign Up Free</button>`, "button");
    const r = getClickLabel(target);
    expect(r.interactive).toBe(true);
    expect(r.weak).toBe(false);
  });
});

describe("describeElement", () => {
  it("captures role, icon, and section for a button", () => {
    const target = el(
      `<form aria-label="signup"><button aria-label="Share"><svg><title>share</title></svg></button></form>`,
      "button",
    );
    const m = describeElement(target);
    expect(m.tag).toBe("button");
    expect(m.role).toBe("button");
    expect(m.icon).toBe("svg:share");
    expect(m.section).toBe("signup");
  });

  it("captures input type + placeholder for a text field", () => {
    const target = el(`<input type="email" placeholder="you@example.com" />`, "input");
    const m = describeElement(target);
    expect(m.role).toBe("textbox");
    expect(m.inputType).toBe("email");
    expect(m.placeholder).toBe("you@example.com");
  });

  it("resolves an anchor href to an absolute URL", () => {
    const target = el(`<a href="/seo">SEO</a>`, "a");
    const m = describeElement(target);
    expect(m.role).toBe("link");
    expect(m.href).toBe("http://localhost:3000/seo");
  });

  it("reports checked state for a checkbox", () => {
    const target = el(`<input type="checkbox" checked />`, "input");
    expect(describeElement(target).checked).toBe("true");
  });

  it("detects an img-based icon by alt", () => {
    const target = el(`<button><img alt="logo" src="/x/logo.png" /></button>`, "button");
    expect(describeElement(target).icon).toBe("img:logo");
  });
});
