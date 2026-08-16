import { describe, expect, it } from "bun:test";
import { applySpeakerNames, remoteParticipants } from "./speakers";
import type { TranscriptEntry } from "./batch";

const line = (speaker: string, startSec: number, text = "hi"): TranscriptEntry => ({
  speaker,
  text,
  startSec,
  endSec: startSec + 2,
});

describe("remoteParticipants", () => {
  it("drops the operator and Meet's UI strings", () => {
    const out = remoteParticipants(
      ["Naresh Bhosale", "Asha Rao", "You", "Presenting", ""],
      ["Naresh Bhosale"]
    );
    expect(out).toEqual(["Asha Rao"]);
  });

  it("strips the state Meet appends to tile labels", () => {
    expect(remoteParticipants(["Asha Rao, presenting"], [])).toEqual(["Asha Rao"]);
  });

  it("dedupes case-insensitively", () => {
    expect(remoteParticipants(["Asha Rao", "asha rao"], [])).toEqual(["Asha Rao"]);
  });
});

describe("applySpeakerNames", () => {
  it("names every remote line when only one other person is in the call", () => {
    const out = applySpeakerNames([line("Client", 0), line("You", 3), line("Client", 6)], {
      participants: ["Naresh Bhosale", "Asha Rao"],
      selfNames: ["Naresh Bhosale"],
    });

    expect(out.map((e) => e.speaker)).toEqual(["Asha Rao", "You", "Asha Rao"]);
  });

  it("never renames the operator's own track", () => {
    const out = applySpeakerNames([line("You", 0)], {
      participants: ["Asha Rao"],
      selfNames: ["Naresh Bhosale"],
    });
    expect(out[0].speaker).toBe("You");
  });

  it("uses captions to name individual speakers on a group call", () => {
    const out = applySpeakerNames([line("Client (0)", 10), line("Client (1)", 30)], {
      participants: ["Asha Rao", "Vikram Shah", "Naresh Bhosale"],
      selfNames: ["Naresh Bhosale"],
      captions: [
        { speaker: "Asha Rao", text: "…", t: 10_500 },
        { speaker: "Vikram Shah", text: "…", t: 29_000 },
      ],
    });

    expect(out.map((e) => e.speaker)).toEqual(["Asha Rao", "Vikram Shah"]);
  });

  it("keeps the generic label when no caption is close enough", () => {
    // A wrong name is worse than a generic one — someone quotes it back to a
    // client months later.
    const out = applySpeakerNames([line("Client (0)", 100)], {
      participants: ["Asha Rao", "Vikram Shah", "Naresh Bhosale"],
      selfNames: ["Naresh Bhosale"],
      captions: [{ speaker: "Asha Rao", text: "…", t: 1000 }],
    });

    expect(out[0].speaker).toBe("Client (0)");
  });

  it("ignores captions attributed to the operator", () => {
    const out = applySpeakerNames([line("Client (0)", 5)], {
      participants: ["Asha Rao", "Vikram Shah", "Naresh Bhosale"],
      selfNames: ["Naresh Bhosale"],
      captions: [{ speaker: "Naresh Bhosale", text: "…", t: 5000 }],
    });

    expect(out[0].speaker).toBe("Client (0)");
  });

  it("leaves everything alone when the page gave us nothing", () => {
    const out = applySpeakerNames([line("Client", 0)], {});
    expect(out[0].speaker).toBe("Client");
  });
});
