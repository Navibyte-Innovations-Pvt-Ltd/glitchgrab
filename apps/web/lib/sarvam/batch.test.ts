import { describe, expect, it } from "bun:test";
import { formatTranscript, mergeTranscripts, toTranscriptEntries } from "./batch";

const diarized = (entries: { t: string; s: number; e: number; id?: string }[]) => ({
  diarized_transcript: {
    entries: entries.map((x) => ({
      transcript: x.t,
      start_time_seconds: x.s,
      end_time_seconds: x.e,
      speaker_id: x.id ?? "0",
    })),
  },
});

describe("toTranscriptEntries", () => {
  it("labels every line with the track's speaker", () => {
    const entries = toTranscriptEntries(diarized([{ t: "Hello", s: 1, e: 2 }]), "Client");
    expect(entries).toHaveLength(1);
    expect(entries[0].speaker).toBe("Client");
    expect(entries[0].text).toBe("Hello");
  });

  it("numbers speakers only when diarization found more than one voice", () => {
    const single = toTranscriptEntries(diarized([{ t: "a", s: 0, e: 1 }]), "Client");
    expect(single[0].speaker).toBe("Client");

    const multi = toTranscriptEntries(
      diarized([
        { t: "a", s: 0, e: 1, id: "0" },
        { t: "b", s: 1, e: 2, id: "1" },
      ]),
      "Client"
    );
    expect(multi[0].speaker).toBe("Client (0)");
    expect(multi[1].speaker).toBe("Client (1)");
  });

  it("never splits the operator's own mic track", () => {
    // with_diarization is job-scoped, so it runs on the mic file too — but that
    // track is one person by construction. "You (0)" / "You (1)" is the model
    // inventing a second voice.
    const entries = toTranscriptEntries(
      diarized([
        { t: "a", s: 0, e: 1, id: "0" },
        { t: "b", s: 1, e: 2, id: "1" },
      ]),
      "You"
    );
    expect(entries.map((e) => e.speaker)).toEqual(["You", "You"]);
  });

  it("shifts timestamps by the track's start offset", () => {
    const entries = toTranscriptEntries(diarized([{ t: "a", s: 10, e: 12 }]), "You", 2.5);
    expect(entries[0].startSec).toBe(12.5);
    expect(entries[0].endSec).toBe(14.5);
  });

  it("falls back to chunk timestamps when diarization is absent", () => {
    const entries = toTranscriptEntries(
      {
        timestamps: {
          chunks: ["one", "two"],
          start_time_seconds: [0, 5],
          end_time_seconds: [4, 9],
        },
      },
      "Client"
    );
    expect(entries).toHaveLength(2);
    expect(entries[1].startSec).toBe(5);
  });

  it("keeps a flat transcript rather than losing it entirely", () => {
    const entries = toTranscriptEntries({ transcript: "whole thing" }, "Client");
    expect(entries).toHaveLength(1);
    expect(entries[0].text).toBe("whole thing");
  });

  it("returns [] for a missing result", () => {
    expect(toTranscriptEntries(undefined, "Client")).toEqual([]);
  });
});

describe("mergeTranscripts", () => {
  it("interleaves both tracks into one conversation by time", () => {
    const client = toTranscriptEntries(
      diarized([
        { t: "Can you add CSV export?", s: 0, e: 3 },
        { t: "By March?", s: 8, e: 9 },
      ]),
      "Client"
    );
    const you = toTranscriptEntries(diarized([{ t: "Yes, we can", s: 4, e: 6 }]), "You");

    const merged = mergeTranscripts([client, you]);
    expect(merged.map((e) => e.speaker)).toEqual(["Client", "You", "Client"]);
  });

  it("respects the start offset so a late-starting mic doesn't jump ahead", () => {
    // The mic recorder started 5s after the tab recorder. Its own timeline says
    // 1s, which is really 6s — without the offset this line would merge first.
    const client = toTranscriptEntries(diarized([{ t: "first", s: 2, e: 3 }]), "Client");
    const you = toTranscriptEntries(diarized([{ t: "second", s: 1, e: 2 }]), "You", 5);

    expect(mergeTranscripts([client, you]).map((e) => e.text)).toEqual(["first", "second"]);
  });
});

describe("formatTranscript", () => {
  it("stamps each line with mm:ss and the speaker", () => {
    const out = formatTranscript([
      { speaker: "Client", text: "Hello", startSec: 65, endSec: 67 },
    ]);
    expect(out).toBe("[01:05] Client: Hello");
  });
});
