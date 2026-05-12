import { describe, it, expect } from "vitest";
import { tryParseReference } from "./parse-reference";

const BOOKS = [
  { abbrev: "gn", name: "Gênesis" },
  { abbrev: "ex", name: "Êxodo" },
  { abbrev: "1co", name: "1 Coríntios" },
  { abbrev: "ap", name: "Apocalipse" },
];

describe("tryParseReference", () => {
  it("parses abbrev + chapter:verse", () => {
    expect(tryParseReference("Gn 1:1", BOOKS)).toEqual({ abbrev: "gn", chapter: 1, verse: 1 });
  });

  it("parses full name + chapter:verse, accent-insensitive", () => {
    expect(tryParseReference("Gênesis 1:1", BOOKS)).toEqual({ abbrev: "gn", chapter: 1, verse: 1 });
    expect(tryParseReference("genesis 1:1", BOOKS)).toEqual({ abbrev: "gn", chapter: 1, verse: 1 });
    expect(tryParseReference("ÊXODO 3:14", BOOKS)).toEqual({ abbrev: "ex", chapter: 3, verse: 14 });
  });

  it("parses chapter only (no verse)", () => {
    expect(tryParseReference("Gn 1", BOOKS)).toEqual({ abbrev: "gn", chapter: 1, verse: undefined });
    expect(tryParseReference("Gênesis 50", BOOKS)).toEqual({ abbrev: "gn", chapter: 50, verse: undefined });
  });

  it("parses multi-token book name", () => {
    expect(tryParseReference("1 Co 13:5", BOOKS)).toEqual({ abbrev: "1co", chapter: 13, verse: 5 });
    expect(tryParseReference("1 Coríntios 13", BOOKS)).toEqual({ abbrev: "1co", chapter: 13, verse: undefined });
  });

  it("collapses extra whitespace", () => {
    expect(tryParseReference("  Gn   1:1  ", BOOKS)).toEqual({ abbrev: "gn", chapter: 1, verse: 1 });
  });

  it("returns null for plain text queries", () => {
    expect(tryParseReference("princípio", BOOKS)).toBeNull();
    expect(tryParseReference("no princípio Deus", BOOKS)).toBeNull();
  });

  it("returns null when book token doesn't match any book", () => {
    expect(tryParseReference("Foobar 1:1", BOOKS)).toBeNull();
  });

  it("returns null when there's no chapter", () => {
    expect(tryParseReference("Gn", BOOKS)).toBeNull();
  });

  it("returns null on empty input", () => {
    expect(tryParseReference("", BOOKS)).toBeNull();
    expect(tryParseReference("   ", BOOKS)).toBeNull();
  });

  it("rejects chapter or verse <= 0", () => {
    expect(tryParseReference("Gn 0:1", BOOKS)).toBeNull();
    expect(tryParseReference("Gn 1:0", BOOKS)).toBeNull();
  });
});
