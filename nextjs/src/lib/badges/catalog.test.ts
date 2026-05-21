import { describe, it, expect } from "vitest";
import { BADGES, badgesByAxis, getBadge } from "./catalog";
import { BADGE_SECTIONS } from "./sections";
import type { BadgeCounters } from "./types";

const EMPTY: BadgeCounters = {
  chaptersRead: 0,
  chaptersReadByBook: {},
  readingStreak: 0,
  commentsCount: 0,
  commentBooks: 0,
  commentTagsUsed: new Set(),
  hasGivenLike: false,
  hasOpenedDiscussion: false,
  hasAnsweredDiscussion: false,
  hasMentioned: false,
  completedSections: new Set(),
};

describe("badge catalog", () => {
  it("contains the expected count of 34 badges", () => {
    // 30 original + 4 streak tiers (bronze/silver/gold/diamond).
    expect(BADGES).toHaveLength(34);
  });

  it("commenter-volume axis exposes all 6 tiers with correct targets", () => {
    expect(getBadge("commenter-bronze")?.progress?.(EMPTY)?.target).toBe(1);
    expect(getBadge("commenter-silver")?.progress?.(EMPTY)?.target).toBe(10);
    expect(getBadge("commenter-gold")?.progress?.(EMPTY)?.target).toBe(50);
    expect(getBadge("commenter-platinum")?.progress?.(EMPTY)?.target).toBe(200);
    expect(getBadge("commenter-diamond")?.progress?.(EMPTY)?.target).toBe(500);
    expect(getBadge("commenter-mythic")?.progress?.(EMPTY)?.target).toBe(1000);
  });

  it("reader-volume axis exposes all 6 tiers with rebalanced targets", () => {
    expect(getBadge("reader-bronze")?.progress?.(EMPTY)?.target).toBe(10);
    expect(getBadge("reader-silver")?.progress?.(EMPTY)?.target).toBe(50);
    expect(getBadge("reader-gold")?.progress?.(EMPTY)?.target).toBe(100);
    expect(getBadge("reader-platinum")?.progress?.(EMPTY)?.target).toBe(250);
    expect(getBadge("reader-diamond")?.progress?.(EMPTY)?.target).toBe(500);
    expect(getBadge("reader-mythic")?.progress?.(EMPTY)?.target).toBe(1189);
  });

  it("new diamond/mythic tier IDs are present", () => {
    for (const id of [
      "commenter-diamond", "commenter-mythic",
      "reader-diamond", "reader-mythic",
    ]) {
      expect(getBadge(id), `${id} should exist`).toBeDefined();
    }
  });

  it("has unique ids across the whole catalog", () => {
    const ids = BADGES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers every axis with at least one badge", () => {
    expect(badgesByAxis("reader-volume").length).toBeGreaterThan(0);
    expect(badgesByAxis("reader-section").length).toBe(BADGE_SECTIONS.length);
    expect(badgesByAxis("commenter-volume").length).toBeGreaterThan(0);
    expect(badgesByAxis("commenter-diversity").length).toBeGreaterThan(0);
    expect(badgesByAxis("commenter-tags").length).toBe(4);
    expect(badgesByAxis("interaction").length).toBeGreaterThan(0);
  });

  it("has one first-comment badge per canonical tag (devocional/exegese/pessoal/inspirado)", () => {
    for (const tag of ["devocional", "exegese", "pessoal", "inspirado"]) {
      expect(getBadge(`first-comment-${tag}`)).toBeDefined();
    }
  });

  it("first-comment-<tag> meets() reads from commentTagsUsed", () => {
    const c: BadgeCounters = { ...EMPTY, commentTagsUsed: new Set(["devocional"]) };
    expect(getBadge("first-comment-devocional")!.meets(c)).toBe(true);
    expect(getBadge("first-comment-exegese")!.meets(c)).toBe(false);
  });

  it("reader-volume tier targets are strictly ascending", () => {
    const tiers = badgesByAxis("reader-volume");
    const targets = tiers.map((t) => t.progress!(EMPTY)!.target);
    for (let i = 1; i < targets.length; i++) {
      expect(targets[i]).toBeGreaterThan(targets[i - 1]);
    }
  });

  it("commenter-volume tier targets are strictly ascending", () => {
    const tiers = badgesByAxis("commenter-volume");
    const targets = tiers.map((t) => t.progress!(EMPTY)!.target);
    for (let i = 1; i < targets.length; i++) {
      expect(targets[i]).toBeGreaterThan(targets[i - 1]);
    }
  });

  it("reader-platinum requires 250 chapters (rebalanced)", () => {
    const platinum = getBadge("reader-platinum");
    expect(platinum).toBeDefined();
    expect(platinum!.progress!(EMPTY)!.target).toBe(250);
  });

  it("nothing unlocks on an empty counters profile", () => {
    expect(BADGES.filter((b) => b.meets(EMPTY))).toEqual([]);
  });

  it("first-read unlocks at chaptersRead >= 1 (and reader-bronze does not)", () => {
    const c: BadgeCounters = { ...EMPTY, chaptersRead: 1 };
    expect(getBadge("first-read")!.meets(c)).toBe(true);
    expect(getBadge("reader-bronze")!.meets(c)).toBe(false);
  });

  it("commenter-bronze unlocks on the first comment", () => {
    const c: BadgeCounters = { ...EMPTY, commentsCount: 1 };
    expect(getBadge("commenter-bronze")!.meets(c)).toBe(true);
  });

  it("streak badges unlock at their day thresholds", () => {
    expect(getBadge("streak-bronze")!.meets({ ...EMPTY, readingStreak: 7 })).toBe(true);
    expect(getBadge("streak-bronze")!.meets({ ...EMPTY, readingStreak: 6 })).toBe(false);
    expect(getBadge("streak-silver")!.meets({ ...EMPTY, readingStreak: 30 })).toBe(true);
    expect(getBadge("streak-gold")!.meets({ ...EMPTY, readingStreak: 100 })).toBe(true);
    expect(getBadge("streak-diamond")!.meets({ ...EMPTY, readingStreak: 365 })).toBe(true);
  });

  it("a 30-day streak unlocks bronze + silver but not gold", () => {
    const c: BadgeCounters = { ...EMPTY, readingStreak: 30 };
    const streakIds = BADGES.filter(
      (b) => b.axis === "reader-streak" && b.meets(c),
    ).map((b) => b.id);
    expect(streakIds).toEqual(["streak-bronze", "streak-silver"]);
  });

  it("streak badge progress caps at the target", () => {
    const def = getBadge("streak-bronze")!;
    expect(def.progress!({ ...EMPTY, readingStreak: 3 })).toEqual({
      current: 3,
      target: 7,
    });
    expect(def.progress!({ ...EMPTY, readingStreak: 999 })).toEqual({
      current: 7,
      target: 7,
    });
  });

  it("section badge meets() reads from completedSections", () => {
    const c: BadgeCounters = { ...EMPTY, completedSections: new Set(["pentateuco"]) };
    expect(getBadge("section-pentateuco")!.meets(c)).toBe(true);
    expect(getBadge("section-historicos")!.meets(c)).toBe(false);
  });

  it("every section in BADGE_SECTIONS has a corresponding catalog entry", () => {
    for (const s of BADGE_SECTIONS) {
      expect(getBadge(`section-${s.id}`)).toBeDefined();
    }
  });

  it("first-time interaction badges all advertise progress 1/1 once met", () => {
    const c: BadgeCounters = {
      ...EMPTY,
      chaptersRead: 1,
      hasGivenLike: true,
      hasOpenedDiscussion: true,
      hasAnsweredDiscussion: true,
      hasMentioned: true,
    };
    for (const id of ["first-read", "first-like", "first-discussion", "first-answer", "first-mention"]) {
      const b = getBadge(id)!;
      expect(b.meets(c)).toBe(true);
      expect(b.progress!(c)).toEqual({ current: 1, target: 1 });
    }
  });
});
