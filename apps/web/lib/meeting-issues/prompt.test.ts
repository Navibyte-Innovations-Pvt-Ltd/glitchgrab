// Meeting issue assistant tests — run with: bun test lib/meeting-issues
//
// Two things here cost something real when they go wrong. The quote guard is
// the only thing standing between "the call asked for this" and a model filing
// work nobody mentioned — drop it and the panel invents a backlog. And frame
// picking decides WHAT the model sees: take the first sixteen frames of an hour
// long call and you have shown it sixteen pictures of everyone saying hello.
import { describe, expect, it } from "bun:test";
import { normaliseDraft, parseJsonReply } from "./prompt";
import { pickFrames } from "./extract";

describe("parseJsonReply", () => {
  it("reads a bare object", () => {
    expect(parseJsonReply<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("reads through a code fence the model was told not to use", () => {
    expect(parseJsonReply<{ a: number }>('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("reads through a prefixed sentence", () => {
    expect(parseJsonReply<{ a: number }>('Here you go:\n{"a":1}')).toEqual({ a: 1 });
  });

  it("returns null rather than throwing on junk", () => {
    expect(parseJsonReply("no json here")).toBeNull();
  });
});

describe("normaliseDraft", () => {
  const valid = {
    title: "Add WhatsApp check-in for attendance",
    body: "## What was asked\nAttendance via WhatsApp.",
    labels: ["feature"],
    quotes: [{ speaker: "Client", text: "attendance WhatsApp se hona chahiye", tMs: 1000 }],
  };

  it("keeps a draft that cites the call", () => {
    expect(normaliseDraft(valid)?.title).toBe(valid.title);
  });

  it("drops a draft with no quote — that is an invented issue", () => {
    expect(normaliseDraft({ ...valid, quotes: [] })).toBeNull();
  });

  it("drops a draft whose quotes are empty strings", () => {
    expect(normaliseDraft({ ...valid, quotes: [{ text: "   " }] })).toBeNull();
  });

  it("drops a titleless or bodyless draft", () => {
    expect(normaliseDraft({ ...valid, title: "" })).toBeNull();
    expect(normaliseDraft({ ...valid, body: "" })).toBeNull();
  });

  it("survives a model that returns the wrong shape", () => {
    expect(normaliseDraft(null)).toBeNull();
    expect(normaliseDraft("nope")).toBeNull();
    expect(normaliseDraft({ ...valid, labels: "feature" })?.labels).toEqual([]);
  });
});

describe("pickFrames", () => {
  const frames = Array.from({ length: 100 }, (_, i) => ({
    id: `f${i}`,
    tMs: i * 12_000,
    key: `k${i}`,
  }));

  it("returns everything when there is little enough", () => {
    expect(pickFrames(frames.slice(0, 5), 16)).toHaveLength(5);
  });

  it("spans the whole call rather than its opening", () => {
    const picked = pickFrames(frames, 16);
    expect(picked).toHaveLength(16);
    expect(picked[0].id).toBe("f0");
    expect(picked[picked.length - 1].id).toBe("f99");
  });

  it("never repeats a frame", () => {
    const picked = pickFrames(frames, 16);
    expect(new Set(picked.map((f) => f.id)).size).toBe(16);
  });
});
