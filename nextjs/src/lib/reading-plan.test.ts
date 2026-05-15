import { describe, it, expect } from "vitest";
import {
  CANONICAL_BOOKS,
  TOTAL_CHAPTERS,
  indexForDate,
  getReadingForDate,
} from "./reading-plan";

describe("CANONICAL_BOOKS", () => {
  it("contains 66 books summing to 1189 chapters", () => {
    expect(CANONICAL_BOOKS).toHaveLength(66);
    expect(TOTAL_CHAPTERS).toBe(1189);
  });

  it("uses unique abbrevs", () => {
    const seen = new Set<string>();
    for (const b of CANONICAL_BOOKS) {
      expect(seen.has(b.abbrev), `duplicate abbrev: ${b.abbrev}`).toBe(false);
      seen.add(b.abbrev);
    }
  });
});

describe("getReadingForDate (RPSP plan)", () => {
  it("anchor: 2025-04-17 → Gênesis 1 (cycle day 1)", () => {
    const r = getReadingForDate(new Date(Date.UTC(2025, 3, 17)));
    expect(r.abbrev).toBe("gn");
    expect(r.chapter).toBe(1);
    expect(r.cycleIndex).toBe(1);
  });

  it("user-confirmed: 2026-05-14 → 2 Crônicas 26 (cycle day 393)", () => {
    const r = getReadingForDate(new Date(Date.UTC(2026, 4, 14)));
    expect(r.abbrev).toBe("2cr");
    expect(r.chapter).toBe(26);
    expect(r.cycleIndex).toBe(393);
  });

  it("day after anchor → 2 Crônicas 27", () => {
    const r = getReadingForDate(new Date(Date.UTC(2026, 4, 15)));
    expect(r.abbrev).toBe("2cr");
    expect(r.chapter).toBe(27);
  });

  it("day before anchor → 2 Crônicas 25", () => {
    const r = getReadingForDate(new Date(Date.UTC(2026, 4, 13)));
    expect(r.abbrev).toBe("2cr");
    expect(r.chapter).toBe(25);
  });

  it("crosses book boundaries cleanly (anchor + 10 days → 2 Crônicas 36)", () => {
    const r = getReadingForDate(new Date(Date.UTC(2026, 4, 24)));
    expect(r.abbrev).toBe("2cr");
    expect(r.chapter).toBe(36);
  });

  it("anchor + 11 days → Esdras 1 (first book past 2 Crônicas)", () => {
    const r = getReadingForDate(new Date(Date.UTC(2026, 4, 25)));
    expect(r.abbrev).toBe("ed");
    expect(r.chapter).toBe(1);
  });

  it("anchor + 1189 days → wraps back to 2 Crônicas 26", () => {
    const base = Date.UTC(2026, 4, 14);
    const wrapped = new Date(base + 1189 * 86_400_000);
    const r = getReadingForDate(wrapped);
    expect(r.abbrev).toBe("2cr");
    expect(r.chapter).toBe(26);
  });

  it("ignores time-of-day (resolves by UTC date only)", () => {
    const morning = getReadingForDate(new Date("2026-05-14T01:23:45Z"));
    const evening = getReadingForDate(new Date("2026-05-14T22:59:00Z"));
    expect(morning).toEqual(evening);
  });
});

describe("indexForDate cycle math", () => {
  it("wraps modulo TOTAL_CHAPTERS for dates far past the anchor", () => {
    const far = new Date(Date.UTC(2030, 0, 1));
    const idx = indexForDate(far);
    expect(idx).toBeGreaterThanOrEqual(1);
    expect(idx).toBeLessThanOrEqual(TOTAL_CHAPTERS);
  });

  it("wraps modulo for dates before the anchor", () => {
    const past = new Date(Date.UTC(2000, 0, 1));
    const idx = indexForDate(past);
    expect(idx).toBeGreaterThanOrEqual(1);
    expect(idx).toBeLessThanOrEqual(TOTAL_CHAPTERS);
  });
});
