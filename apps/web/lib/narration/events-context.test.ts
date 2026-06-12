// events-context tests — run with: bun test events-context.test.ts
//
// BUG (recording My Abhyasika): the generated script said "localhost:3333" and
// didn't name the product, because raw event URLs went straight to the model.
import { describe, expect, it } from "bun:test";
import { buildScriptContext, deriveAppName, stripOrigin } from "./events-context";

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
