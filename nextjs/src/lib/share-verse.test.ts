import { describe, it, expect } from "vitest";
import { formatVerseReference, formatVerseShareUrl, formatVerseShare } from "./share-verse";
import type { ShareableVerse } from "./share-verse";

const verse: ShareableVerse = {
  reference: "Gênesis 1:1",
  abbrev: "gn",
  chapter: 1,
  verseNumber: 1,
  text: "No princípio, Deus criou o céu e a terra.",
};

describe("formatVerseReference", () => {
  it("uses provided reference when present", () => {
    expect(formatVerseReference(verse)).toBe("Gênesis 1:1");
  });

  it("falls back to ABBREV chapter:verse when reference is missing", () => {
    const r = formatVerseReference({ ...verse, reference: undefined });
    expect(r).toBe("GN 1:1");
  });

  it("uppercases the abbrev in the fallback", () => {
    const r = formatVerseReference({ ...verse, reference: undefined, abbrev: "1co", chapter: 13, verseNumber: 4 });
    expect(r).toBe("1CO 13:4");
  });
});

describe("formatVerseShareUrl", () => {
  it("composes the URL from origin and verse coordinates", () => {
    expect(formatVerseShareUrl(verse, "https://app.example.com")).toBe(
      "https://app.example.com/verses/gn/1#1",
    );
  });

  it("strips trailing slashes from origin", () => {
    expect(formatVerseShareUrl(verse, "https://app.example.com///")).toBe(
      "https://app.example.com/verses/gn/1#1",
    );
  });
});

describe("formatVerseShare", () => {
  it("formats reference, quoted text, and URL on two lines", () => {
    const result = formatVerseShare(verse, "https://app.example.com");
    expect(result).toBe(
      'Gênesis 1:1 — "No princípio, Deus criou o céu e a terra."\nhttps://app.example.com/verses/gn/1#1',
    );
  });

  it("trims whitespace from the verse text", () => {
    const result = formatVerseShare(
      { ...verse, text: "  No princípio…  " },
      "https://app.example.com",
    );
    expect(result).toContain('"No princípio…"');
  });
});
