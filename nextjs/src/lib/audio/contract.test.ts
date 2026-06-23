import { describe, it, expect } from "vitest";
import {
  chapterAudioKey,
  chapterTimingsKey,
  manifestKey,
  emptyManifest,
  mergeManifestChapter,
  hasChapter,
} from "./contract.js";

describe("audio contract keys", () => {
  it("builds the R2 keys with the agreed layout", () => {
    expect(chapterAudioKey("pt-BR-AntonioNeural", "gn", 1)).toBe(
      "audio/pt-BR-AntonioNeural/gn/1.mp3",
    );
    expect(chapterTimingsKey("pt-BR-AntonioNeural", "gn", 1)).toBe(
      "audio/pt-BR-AntonioNeural/gn/1.json",
    );
    expect(manifestKey("pt-BR-AntonioNeural")).toBe(
      "audio/pt-BR-AntonioNeural/manifest.json",
    );
  });
});

describe("manifest helpers", () => {
  it("starts empty and records chapters idempotently", () => {
    let m = emptyManifest("pt-BR-AntonioNeural", "Antonio", "v1.abc");
    expect(hasChapter(m, "gn", 1)).toBe(false);
    m = mergeManifestChapter(m, "gn", 1, { durationMs: 1000, sizeBytes: 6000 });
    expect(hasChapter(m, "gn", 1)).toBe(true);
    expect(m.chapters.gn["1"]).toEqual({ durationMs: 1000, sizeBytes: 6000 });
    // overwrite same chapter (regeneration) keeps a single entry
    m = mergeManifestChapter(m, "gn", 1, { durationMs: 2000, sizeBytes: 7000 });
    expect(m.chapters.gn["1"]).toEqual({ durationMs: 2000, sizeBytes: 7000 });
    expect(Object.keys(m.chapters.gn)).toHaveLength(1);
  });

  it("does not mutate the input manifest", () => {
    const m0 = emptyManifest("v", "V", "v1.abc");
    const m1 = mergeManifestChapter(m0, "gn", 1, { durationMs: 1, sizeBytes: 1 });
    expect(m0.chapters.gn).toBeUndefined();
    expect(m1).not.toBe(m0);
  });
});
