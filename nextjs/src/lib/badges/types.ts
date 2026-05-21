/**
 * Badge catalog types.
 *
 * Badges live in code (src/lib/badges/catalog.ts) — adding/editing one is a
 * source change, no migration. Earned badges are stored as string IDs in
 * `User.badges`. The catalog is the source of truth for display + criteria.
 */

export type BadgeAxis =
  | "reader-volume"
  | "reader-section"
  | "reader-streak"
  | "commenter-volume"
  | "commenter-diversity"
  | "commenter-tags"
  | "interaction";

export type BadgeTier =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "mythic";

/**
 * Counters available to badge criteria. The evaluator computes these once per
 * trigger and feeds them into each candidate badge's `meets()` predicate.
 */
export interface BadgeCounters {
  /** Total chapters the user has marked as read. */
  chaptersRead: number;
  /** Per-book chapter-read count, keyed by abbrev. */
  chaptersReadByBook: Record<string, number>;
  /**
   * Current consecutive-days reading streak (lenient: any chapter on a
   * day keeps it). Drives the `streak-*` badges.
   */
  readingStreak: number;
  /** Total comments the user has posted. */
  commentsCount: number;
  /** Distinct book abbrevs in which the user has posted at least one comment. */
  commentBooks: number;
  /**
   * Set of canonical tag keys (lowercase, e.g. "devocional", "exegese",
   * "pessoal", "inspirado") the user has applied to at least one comment.
   * Drives the `first-comment-<tag>` badges.
   */
  commentTagsUsed: Set<string>;
  /** True if the user has given at least one like on any comment. */
  hasGivenLike: boolean;
  /** True if the user has opened at least one discussion. */
  hasOpenedDiscussion: boolean;
  /** True if the user has answered at least one discussion. */
  hasAnsweredDiscussion: boolean;
  /** True if the user has @-mentioned someone in a comment or answer. */
  hasMentioned: boolean;
  /**
   * Section IDs (from BADGE_SECTIONS) the user has fully completed —
   * every book in every group of that section has all chapters read.
   * Pre-computed by the evaluator so catalog criteria stay pure.
   */
  completedSections: Set<string>;
}

export interface BadgeDefinition {
  /** Stable id used in `User.badges` and as React key. Lowercase kebab. */
  id: string;
  axis: BadgeAxis;
  tier?: BadgeTier;
  /** PT-BR display name. */
  name: string;
  /** PT-BR one-liner shown on the badge card. */
  description: string;
  /**
   * Lucide icon name (rendered via dynamic import in the UI). Keep simple.
   * Examples: "BookOpen", "MessageCircle", "Heart", "Sparkles".
   */
  icon: string;
  /** Returns true when the user's counters satisfy the unlock criterion. */
  meets: (c: BadgeCounters) => boolean;
  /**
   * Optional progress accessor — `{ current, target }` shown on locked cards.
   * Returns null when progress isn't meaningful (e.g., binary first-time badges
   * that the user already earned).
   */
  progress?: (c: BadgeCounters) => { current: number; target: number } | null;
}
