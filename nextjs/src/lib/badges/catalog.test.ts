import { describe, it, expect } from "vitest";
import { BADGES, badgesByAxis, getBadge } from "./catalog";
import { BADGE_SECTIONS } from "./sections";
import type { BadgeCounters } from "./types";

const EMPTY: BadgeCounters = {
  chaptersRead: 0,
  chaptersReadByBook: {},
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
  it("contains the expected v1 count of 26 badges", () => {
    expect(BADGES).toHaveLength(26);
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

  it("reader-platinum requires the full 1189 chapters of the Bible", () => {
    const platinum = getBadge("reader-platinum");
    expect(platinum).toBeDefined();
    expect(platinum!.progress!(EMPTY)!.target).toBe(1189);
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
