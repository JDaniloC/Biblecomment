import { describe, it, expect } from "vitest";
import { durationFromMp3Bytes, buildChapterTimings } from "./contract.js";

describe("durationFromMp3Bytes", () => {
  it("estimates ms from CBR byte length (48 kbps => bytes/6)", () => {
    // 48 kbps = 48 bits/ms => ms = bytes*8/48 = bytes/6
    expect(durationFromMp3Bytes(6000, 48)).toBe(1000);
    expect(durationFromMp3Bytes(0, 48)).toBe(0);
  });
});

describe("buildChapterTimings", () => {
  const meta = { voiceId: "v", abbrev: "gn", chapter: 1, version: "v1.x", gapMs: 200 };

  it("lays out verses sequentially with the inter-verse gap", () => {
    const t = buildChapterTimings(
      [
        { n: 1, durationMs: 1000 },
        { n: 2, durationMs: 500 },
      ],
      meta,
    );
    expect(t.verses["1"]).toEqual({ startMs: 0, endMs: 1000 });
    // verse 2 starts after verse 1 + gap
    expect(t.verses["2"]).toEqual({ startMs: 1200, endMs: 1700 });
    // total duration is the last verse's end (no trailing gap)
    expect(t.durationMs).toBe(1700);
    expect(t).toMatchObject({ voiceId: "v", abbrev: "gn", chapter: 1, version: "v1.x" });
  });

  it("with gapMs 0, matches audio made by plain concatenation of the verse files", () => {
    // The verse MP3s are concatenated with nothing in between, so the timings must not
    // add any gap: verse n starts exactly where verse n-1's bytes end.
    const bytes = [6000, 3000, 4500]; // 1000, 500, 750 ms at 48 kbps
    const t = buildChapterTimings(
      bytes.map((b, i) => ({ n: i + 1, durationMs: durationFromMp3Bytes(b, 48) })),
      { ...meta, gapMs: 0 },
    );
    expect(t.verses["2"]).toEqual({ startMs: 1000, endMs: 1500 });
    expect(t.verses["3"]).toEqual({ startMs: 1500, endMs: 2250 });
    expect(t.durationMs).toBe(durationFromMp3Bytes(bytes.reduce((a, b) => a + b, 0), 48));
  });

  it("handles a single verse with no gap applied", () => {
    const t = buildChapterTimings([{ n: 1, durationMs: 800 }], meta);
    expect(t.verses["1"]).toEqual({ startMs: 0, endMs: 800 });
    expect(t.durationMs).toBe(800);
  });
});
