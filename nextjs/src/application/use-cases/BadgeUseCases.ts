import type { IUserRepository } from "@/domain/repositories/IUserRepository";
import type { IUserChapterReadRepository } from "@/domain/repositories/IUserChapterReadRepository";
import type { ICommentRepository } from "@/domain/repositories/ICommentRepository";
import type { ICommentLikeRepository } from "@/domain/repositories/ICommentLikeRepository";
import type { IDiscussionRepository } from "@/domain/repositories/IDiscussionRepository";
import type { IDiscussionAnswerRepository } from "@/domain/repositories/IDiscussionAnswerRepository";
import type { INotificationRepository } from "@/domain/repositories/INotificationRepository";
import type { IBookRepository } from "@/domain/repositories/IBookRepository";
import { BADGES, getBadge } from "@/lib/badges/catalog";
import { BADGE_SECTIONS } from "@/lib/badges/sections";
import type { BadgeAxis, BadgeCounters, BadgeDefinition } from "@/lib/badges/types";
import type { IReadingSessionRepository } from "@/domain/repositories/IReadingSessionRepository";
import { GetReadingStreakUseCase } from "./GetReadingStreakUseCase";

export interface BadgeRepos {
  user: IUserRepository;
  chapterRead: IUserChapterReadRepository;
  comment: ICommentRepository;
  commentLike: ICommentLikeRepository;
  discussion: IDiscussionRepository;
  discussionAnswer: IDiscussionAnswerRepository;
  notification: INotificationRepository;
  book: IBookRepository;
  readingSession: IReadingSessionRepository;
}

export interface EvaluateInput {
  userId: string;
  username: string;
  /** Subset of axes to evaluate. Each trigger only touches the axes it can affect. */
  axes: BadgeAxis[];
  /**
   * Implicit signals from the trigger that don't need a repo round-trip
   * (e.g., `toggleLikeAction` adding a like → hasGivenLike: true).
   * Wins over repo-derived values for the same key.
   */
  hints?: Partial<BadgeCounters>;
  /** Skip notification creation. Used by the backfill script. */
  silent?: boolean;
}

export class EvaluateBadgesUseCase {
  constructor(private readonly repos: BadgeRepos) {}

  /**
   * Compute the user's counters for the requested axes, diff against the
   * catalog, persist any newly-earned badge IDs on the user, and (unless
   * silent) fire a `badge_unlocked` notification for each. Returns the
   * list of newly-unlocked badge IDs.
   *
   * Failures are surfaced via thrown errors — callers should wrap in try/catch
   * and treat the badge evaluation as non-critical (don't fail the user's
   * primary action because badges blew up).
   */
  async evaluate(input: EvaluateInput): Promise<string[]> {
    const candidates = BADGES.filter((b) => input.axes.includes(b.axis));
    if (candidates.length === 0) return [];

    const counters = await this.computeCounters(input, candidates);

    const earned = new Set<string>();
    for (const badge of candidates) {
      if (badge.meets(counters)) earned.add(badge.id);
    }
    if (earned.size === 0) return [];

    const newlyEarned = await this.repos.user.addBadges(input.userId, [...earned]);
    if (newlyEarned.length === 0) return [];

    if (!input.silent) {
      await this.notify(input.username, newlyEarned);
    }
    return newlyEarned;
  }

  /**
   * Compute counters for ALL axes — used by GetUserBadgesUseCase to render
   * progress on every catalog entry without forcing the caller to think
   * about which axis controls which badge.
   */
  async getCountersForAllAxes(userId: string, username: string): Promise<BadgeCounters> {
    return this.computeCounters(
      { userId, username, axes: ["reader-volume", "reader-section", "commenter-volume", "commenter-diversity", "commenter-tags", "interaction"] },
      BADGES,
    );
  }

  private async computeCounters(
    input: EvaluateInput,
    candidates: BadgeDefinition[],
  ): Promise<BadgeCounters> {
    const needs = (axis: BadgeAxis) => candidates.some((c) => c.axis === axis);
    const hints = input.hints ?? {};

    const counters: BadgeCounters = {
      chaptersRead: 0,
      chaptersReadByBook: {},
      readingStreak: 0,
      commentsCount: 0,
      commentBooks: 0,
      commentTagsUsed: new Set<string>(),
      hasGivenLike: false,
      hasOpenedDiscussion: false,
      hasAnsweredDiscussion: false,
      hasMentioned: false,
      completedSections: new Set<string>(),
    };

    // Reading axes both want the book-level breakdown — fetch once.
    const wantsReader = needs("reader-volume") || needs("reader-section") || needs("interaction");
    if (wantsReader) {
      const [chaptersRead, chaptersReadByBook] = await Promise.all([
        this.repos.chapterRead.countByUser(input.userId),
        needs("reader-section")
          ? this.repos.chapterRead.countByUserPerBook(input.userId)
          : Promise.resolve({} as Record<string, number>),
      ]);
      counters.chaptersRead = chaptersRead;
      counters.chaptersReadByBook = chaptersReadByBook;
      if (needs("reader-section")) {
        counters.completedSections = await this.computeCompletedSections(chaptersReadByBook);
      }
    }

    if (needs("reader-streak")) {
      const streak = await new GetReadingStreakUseCase({
        chapterRead: this.repos.chapterRead,
        comment: this.repos.comment,
        readingSession: this.repos.readingSession,
      }).execute({ userId: input.userId, username: input.username });
      counters.readingStreak = streak.current;
    }

    if (needs("commenter-volume") || needs("commenter-diversity") || needs("commenter-tags")) {
      const comments = await this.repos.comment.findByUsername(input.username);
      counters.commentsCount = comments.length;
      const books = new Set<string>();
      const tags = new Set<string>();
      for (const c of comments) {
        // bookReference is shaped like "abbrev chapter:verse" (see CreateCommentUseCase).
        const abbrev = c.bookReference?.split(/\s+/)[0]?.toLowerCase();
        if (abbrev) books.add(abbrev);
        for (const raw of c.tags ?? []) {
          // Canonicalize: lowercase, alias "exegetico" → "exegese" (matches tag-meta.ts).
          const t = raw.toLowerCase().trim();
          if (!t) continue;
          tags.add(t === "exegetico" ? "exegese" : t);
        }
      }
      counters.commentBooks = books.size;
      counters.commentTagsUsed = tags;
    }

    if (needs("interaction")) {
      counters.hasGivenLike =
        hints.hasGivenLike ?? (await this.repos.commentLike.userHasGivenAnyLike(input.userId));
      counters.hasOpenedDiscussion =
        hints.hasOpenedDiscussion ??
        (await this.repos.discussion.userHasOpenedDiscussion(input.username));
      counters.hasAnsweredDiscussion =
        hints.hasAnsweredDiscussion ??
        (await this.repos.discussionAnswer.userHasAnsweredAny(input.userId));
      counters.hasMentioned =
        hints.hasMentioned ??
        (await this.repos.notification.userHasMentioned(input.username));
    }

    // Hints win for any caller-supplied counter (used both as "you just did X"
    // hot-path optimization AND to override repo values in tests).
    if (typeof hints.chaptersRead === "number") counters.chaptersRead = hints.chaptersRead;
    if (typeof hints.readingStreak === "number") counters.readingStreak = hints.readingStreak;
    if (typeof hints.commentsCount === "number") counters.commentsCount = hints.commentsCount;
    if (typeof hints.commentBooks === "number") counters.commentBooks = hints.commentBooks;
    if (hints.commentTagsUsed) counters.commentTagsUsed = hints.commentTagsUsed;
    if (hints.completedSections) counters.completedSections = hints.completedSections;
    if (hints.chaptersReadByBook) counters.chaptersReadByBook = hints.chaptersReadByBook;

    return counters;
  }

  private async computeCompletedSections(
    chaptersReadByBook: Record<string, number>,
  ): Promise<Set<string>> {
    const allBooks = await this.repos.book.findAll();
    const totalByAbbrev = new Map<string, number>();
    const groupToAbbrevs = new Map<string, string[]>();
    for (const b of allBooks) {
      const abbrev = b.abbrev.toLowerCase();
      totalByAbbrev.set(abbrev, b.chapters);
      const list = groupToAbbrevs.get(b.group) ?? [];
      list.push(abbrev);
      groupToAbbrevs.set(b.group, list);
    }

    const completed = new Set<string>();
    for (const section of BADGE_SECTIONS) {
      const sectionAbbrevs: string[] = [];
      for (const g of section.groups) {
        sectionAbbrevs.push(...(groupToAbbrevs.get(g) ?? []));
      }
      // Empty section (e.g., DB not seeded) → don't award.
      if (sectionAbbrevs.length === 0) continue;
      const allRead = sectionAbbrevs.every((abbrev) => {
        const total = totalByAbbrev.get(abbrev);
        if (total === undefined) return false;
        return (chaptersReadByBook[abbrev] ?? 0) >= total;
      });
      if (allRead) completed.add(section.id);
    }
    return completed;
  }

  private async notify(username: string, badgeIds: string[]): Promise<void> {
    const messages = badgeIds
      .map((id) => ({ id, def: getBadge(id) }))
      .filter((x): x is { id: string; def: BadgeDefinition } => x.def !== undefined);

    if (messages.length === 0) return;

    await this.repos.notification.createMany(
      messages.map(({ id, def }) => ({
        recipient: username,
        // System-issued — bypasses the actor==recipient dedupe in
        // CreateNotificationUseCase by NOT going through it.
        actor: "system",
        type: "badge_unlocked",
        resourceType: "badge",
        resourceId: id,
        message: `Conquista desbloqueada: ${def.name}`,
        url: "/profile?tab=badges",
      })),
    );
  }
}

export interface BadgeProgressEntry {
  id: string;
  earned: boolean;
  /** Current value toward the badge's target. 0 when meaningless. */
  current: number;
  /** Target value the badge needs. 1 for one-shot/binary badges. */
  target: number;
}

export interface UserBadgesView {
  /** All catalog badges, with the user's progress and earned flag. */
  entries: BadgeProgressEntry[];
  /** Just the unlocked IDs, for quick header copy ("4 of 26 unlocked"). */
  earned: string[];
}

export class GetUserBadgesUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly evaluator: EvaluateBadgesUseCase,
  ) {}

  async execute(email: string, username: string, userId: string): Promise<UserBadgesView> {
    const user = await this.userRepo.findByEmail(email);
    const earnedSet = new Set(user?.badges ?? []);
    const counters = await this.evaluator.getCountersForAllAxes(userId, username);

    const entries: BadgeProgressEntry[] = BADGES.map((b) => {
      const prog = b.progress?.(counters) ?? null;
      return {
        id: b.id,
        earned: earnedSet.has(b.id),
        current: prog?.current ?? (b.meets(counters) ? 1 : 0),
        target: prog?.target ?? 1,
      };
    });

    return {
      entries,
      earned: BADGES.filter((b) => earnedSet.has(b.id)).map((b) => b.id),
    };
  }
}
