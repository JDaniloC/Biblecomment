import { describe, it, expect } from "vitest";
import {
  chapterAudioUrl,
  chapterTimingsUrl,
  manifestUrl,
  isChapterAvailable,
  verseAtTime,
  nextChapterWithin,
  prevChapterWithin,
  adjacentVerse,
  firstVerse,
} from "./player";
import type { VoiceManifest, VerseTimings } from "./types";

const manifest: VoiceManifest = {
  voiceId: "v",
  label: "V",
  lang: "pt-BR",
  version: "v1.x",
  chapters: { gn: { "1": { durationMs: 1000, sizeBytes: 1 }, "2": { durationMs: 1, sizeBytes: 1 } } },
};

const timings: VerseTimings = {
  voiceId: "v",
  abbrev: "gn",
  chapter: 1,
  version: "v1.x",
  durationMs: 1700,
  verses: {
    "1": { startMs: 0, endMs: 1000 },
    "2": { startMs: 1200, endMs: 1700 }, // 1000..1200 is the inter-verse gap
  },
};

describe("url builders", () => {
  it("joins the public base with the contract keys", () => {
    expect(chapterAudioUrl("https://cdn", "v", "gn", 1)).toBe("https://cdn/audio/v/gn/1.mp3");
    expect(chapterTimingsUrl("https://cdn", "v", "gn", 1)).toBe("https://cdn/audio/v/gn/1.json");
    expect(manifestUrl("https://cdn", "v")).toBe("https://cdn/audio/v/manifest.json");
  });
});

describe("isChapterAvailable", () => {
  it("is false when manifest is null and reflects the manifest otherwise", () => {
    expect(isChapterAvailable(null, "gn", 1)).toBe(false);
    expect(isChapterAvailable(manifest, "gn", 1)).toBe(true);
    expect(isChapterAvailable(manifest, "gn", 99)).toBe(false);
    expect(isChapterAvailable(manifest, "ex", 1)).toBe(false);
  });
});

describe("verseAtTime", () => {
  it("returns the verse whose [start,end) contains ms", () => {
    expect(verseAtTime(timings, 0)).toBe(1);
    expect(verseAtTime(timings, 999)).toBe(1);
    expect(verseAtTime(timings, 1200)).toBe(2);
    expect(verseAtTime(timings, 1699)).toBe(2);
  });
  it("keeps the just-finished verse highlighted during the inter-verse gap", () => {
    expect(verseAtTime(timings, 1100)).toBe(1); // in the gap after verse 1
  });
  it("clamps to the last verse at/after the end", () => {
    expect(verseAtTime(timings, 1700)).toBe(2);
    expect(verseAtTime(timings, 999999)).toBe(2);
  });
  it("returns null for empty timings", () => {
    expect(verseAtTime({ ...timings, verses: {} }, 10)).toBe(null);
  });
});

describe("nextChapterWithin", () => {
  it("returns the next chapter number if present in the manifest, else null", () => {
    expect(nextChapterWithin(manifest, "gn", 1)).toBe(2);
    expect(nextChapterWithin(manifest, "gn", 2)).toBe(null);
    expect(nextChapterWithin(null, "gn", 1)).toBe(null);
  });
});

describe("prevChapterWithin", () => {
  it("returns the previous chapter number if present, else null (and never below 1)", () => {
    expect(prevChapterWithin(manifest, "gn", 2)).toBe(1);
    expect(prevChapterWithin(manifest, "gn", 1)).toBe(null);
    expect(prevChapterWithin(null, "gn", 2)).toBe(null);
  });
});

describe("adjacentVerse", () => {
  it("steps to the next/previous verse in chapter order", () => {
    expect(adjacentVerse(timings, 1, 1)).toBe(2);
    expect(adjacentVerse(timings, 2, -1)).toBe(1);
  });
  it("returns null at the edges and for an unknown current verse", () => {
    expect(adjacentVerse(timings, 2, 1)).toBe(null); // last verse, no next
    expect(adjacentVerse(timings, 1, -1)).toBe(null); // first verse, no prev
    expect(adjacentVerse(timings, 99, 1)).toBe(null); // not in timings
  });
});

describe("firstVerse", () => {
  it("returns the smallest verse number, or null when empty", () => {
    expect(firstVerse(timings)).toBe(1);
    expect(firstVerse({ ...timings, verses: {} })).toBe(null);
  });
});
