import { describe, expect, it } from "bun:test";
import { parseDistillation } from "./parse";

describe("parseDistillation", () => {
  it("parses a clean array", () => {
    const items = parseDistillation(
      JSON.stringify([
        { kind: "DECISION", text: "Billing moves to monthly-only.", confidence: 1 },
        { kind: "COMPLAINT", text: "Client says the dashboard is slow.", confidence: 0.8 },
      ])
    );

    expect(items).toHaveLength(2);
    expect(items[0].kind).toBe("DECISION");
    expect(items[1].confidence).toBe(0.8);
  });

  it("unwraps ```json fences and lead-in prose", () => {
    const raw = 'Here is the array:\n```json\n[{"kind":"FACT","text":"Team of four uses it daily.","confidence":1}]\n```';
    expect(parseDistillation(raw)).toHaveLength(1);
  });

  it("returns [] for an empty array, prose, or broken JSON", () => {
    expect(parseDistillation("[]")).toEqual([]);
    expect(parseDistillation("Nothing durable here.")).toEqual([]);
    expect(parseDistillation("[{kind: DECISION}]")).toEqual([]);
  });

  it("drops items below the confidence floor rather than storing a guess", () => {
    const items = parseDistillation(
      JSON.stringify([
        { kind: "REQUEST", text: "Maybe they want exports.", confidence: 0.3 },
        { kind: "REQUEST", text: "Client asked for CSV export.", confidence: 0.9 },
      ])
    );

    expect(items).toHaveLength(1);
    expect(items[0].text).toBe("Client asked for CSV export.");
  });

  it("treats a missing confidence as the floor, not as certainty", () => {
    const items = parseDistillation(JSON.stringify([{ kind: "FACT", text: "They bill quarterly." }]));
    expect(items).toHaveLength(1);
    expect(items[0].confidence).toBe(0.5);
  });

  it("rejects unknown kinds and empty text", () => {
    const items = parseDistillation(
      JSON.stringify([
        { kind: "RANDOM", text: "Something.", confidence: 1 },
        { kind: "FACT", text: "   ", confidence: 1 },
        { kind: "FACT", text: "Kept.", confidence: 1 },
      ])
    );

    expect(items).toHaveLength(1);
    expect(items[0].text).toBe("Kept.");
  });

  it("dedupes the same sentence repeated in one response", () => {
    const items = parseDistillation(
      JSON.stringify([
        { kind: "DECISION", text: "Ship in March.", confidence: 1 },
        { kind: "DECISION", text: "ship in march.", confidence: 1 },
      ])
    );

    expect(items).toHaveLength(1);
  });

  it("caps at 8 items even when the model ignores the limit", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      kind: "FACT",
      text: `Fact number ${i}.`,
      confidence: 1,
    }));

    expect(parseDistillation(JSON.stringify(many))).toHaveLength(8);
  });

  it("drops a summary-length text", () => {
    const items = parseDistillation(
      JSON.stringify([{ kind: "FACT", text: "x".repeat(401), confidence: 1 }])
    );
    expect(items).toEqual([]);
  });

  it("clamps confidence above 1", () => {
    const items = parseDistillation(
      JSON.stringify([{ kind: "FACT", text: "Clamped.", confidence: 4 }])
    );
    expect(items[0].confidence).toBe(1);
  });
});
