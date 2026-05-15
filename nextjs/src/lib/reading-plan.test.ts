import { describe, it, expect } from "vitest";
import {
  CANONICAL_BOOKS,
  TOTAL_CHAPTERS,
  indexForDate,
  getReadingForDate,
  bookChapterToIndex,
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

/** Helper: noon UTC of the given BRT calendar date — unambiguously mid-day in BRT. */
function brtNoon(year: number, monthZero: number, day: number): Date {
  // Noon UTC = 09:00 BRT, comfortably inside the BRT day regardless of
  // shifts. Using this in tests keeps them readable while exercising the
  // BRT boundary logic.
  return new Date(Date.UTC(year, monthZero, day, 12, 0, 0));
}

describe("getReadingForDate (RPSP plan, BRT calendar)", () => {
  it("anchor: 2025-04-17 → Gênesis 1 (cycle day 1)", () => {
    const r = getReadingForDate(brtNoon(2025, 3, 17));
    expect(r.abbrev).toBe("gn");
    expect(r.chapter).toBe(1);
    expect(r.cycleIndex).toBe(1);
  });

  it("user-confirmed: 2026-05-14 → 2 Crônicas 26 (cycle day 393)", () => {
    const r = getReadingForDate(brtNoon(2026, 4, 14));
    expect(r.abbrev).toBe("2cr");
    expect(r.chapter).toBe(26);
    expect(r.cycleIndex).toBe(393);
  });

  it("day after → 2 Crônicas 27", () => {
    const r = getReadingForDate(brtNoon(2026, 4, 15));
    expect(r.abbrev).toBe("2cr");
    expect(r.chapter).toBe(27);
  });

  it("day before → 2 Crônicas 25", () => {
    const r = getReadingForDate(brtNoon(2026, 4, 13));
    expect(r.abbrev).toBe("2cr");
    expect(r.chapter).toBe(25);
  });

  it("crosses book boundaries cleanly (anchor + 10 days → 2 Crônicas 36)", () => {
    const r = getReadingForDate(brtNoon(2026, 4, 24));
    expect(r.abbrev).toBe("2cr");
    expect(r.chapter).toBe(36);
  });

  it("anchor + 11 days → Esdras 1 (first book past 2 Crônicas)", () => {
    const r = getReadingForDate(brtNoon(2026, 4, 25));
    expect(r.abbrev).toBe("ed");
    expect(r.chapter).toBe(1);
  });

  it("anchor + 1189 days → wraps back to 2 Crônicas 26", () => {
    const wrapped = new Date(brtNoon(2026, 4, 14).getTime() + 1189 * 86_400_000);
    const r = getReadingForDate(wrapped);
    expect(r.abbrev).toBe("2cr");
    expect(r.chapter).toBe(26);
  });

  it("ignores time-of-day within the same BRT day", () => {
    // 06:00 BRT = 09:00 UTC; 22:00 BRT = 01:00 UTC of the next UTC day.
    // Both must resolve to the same BRT date.
    const morning = getReadingForDate(new Date("2026-05-14T09:00:00Z"));
    const lateEvening = getReadingForDate(new Date("2026-05-15T01:00:00Z"));
    expect(morning).toEqual(lateEvening);
    expect(morning.abbrev).toBe("2cr");
    expect(morning.chapter).toBe(26);
  });

  it("regression: 22:30 BRT on 14/05 still shows 2Cr 26 (was 2Cr 27)", () => {
    // 22:30 BRT 14/05 = 01:30 UTC 15/05 — the UTC date already rolled
    // forward but the BRT calendar still reads 14/05. The pre-fix code
    // returned 2Cr 27 here because it floored to UTC midnight.
    const lateNightBrt = new Date("2026-05-15T01:30:00Z");
    const r = getReadingForDate(lateNightBrt);
    expect(r.abbrev).toBe("2cr");
    expect(r.chapter).toBe(26);
  });

  it("rolls to the next chapter at 00:00 BRT, not at 00:00 UTC", () => {
    // 00:30 BRT 15/05 = 03:30 UTC 15/05.
    const earlyMorningBrt = new Date("2026-05-15T03:30:00Z");
    const r = getReadingForDate(earlyMorningBrt);
    expect(r.abbrev).toBe("2cr");
    expect(r.chapter).toBe(27);
  });
});

describe("bookChapterToIndex", () => {
  it("maps Gn 1 → 1", () => {
    expect(bookChapterToIndex("gn", 1)).toBe(1);
  });

  it("maps 2Cr 26 → 393", () => {
    expect(bookChapterToIndex("2cr", 26)).toBe(393);
  });

  it("maps Ap 22 → 1189 (last chapter)", () => {
    expect(bookChapterToIndex("ap", 22)).toBe(TOTAL_CHAPTERS);
  });

  it("is case-insensitive on abbrev", () => {
    expect(bookChapterToIndex("GN", 1)).toBe(1);
    expect(bookChapterToIndex("2Cr", 26)).toBe(393);
  });

  it("returns null for unknown abbrev or out-of-range chapter", () => {
    expect(bookChapterToIndex("xx", 1)).toBeNull();
    expect(bookChapterToIndex("gn", 0)).toBeNull();
    expect(bookChapterToIndex("gn", 51)).toBeNull();
  });
});

describe("anchor override (configurable from AppConfig)", () => {
  it("uses the supplied anchor instead of the compiled default", () => {
    // Pretend the moderator pushed "today should be Ap 22".
    const today = brtNoon(2026, 4, 14);
    const override = {
      anchorDateUtc: Date.UTC(2026, 4, 14),
      anchorIndex: TOTAL_CHAPTERS, // Ap 22
    };
    const r = getReadingForDate(today, override);
    expect(r.abbrev).toBe("ap");
    expect(r.chapter).toBe(22);
  });

  it("walks forward from the override anchor the same way", () => {
    // Anchor 2026-01-01 = Gn 1; one day later (in BRT) should be Gn 2.
    const anchor = {
      anchorDateUtc: Date.UTC(2026, 0, 1),
      anchorIndex: 1,
    };
    const r = getReadingForDate(brtNoon(2026, 0, 2), anchor);
    expect(r.abbrev).toBe("gn");
    expect(r.chapter).toBe(2);
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
