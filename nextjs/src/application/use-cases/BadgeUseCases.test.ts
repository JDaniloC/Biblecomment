import { describe, it, expect, beforeEach } from "vitest";
import { EvaluateBadgesUseCase, type BadgeRepos } from "./BadgeUseCases";
import type { IUserRepository } from "@/domain/repositories/IUserRepository";
import type { IUserChapterReadRepository } from "@/domain/repositories/IUserChapterReadRepository";
import type { ICommentRepository } from "@/domain/repositories/ICommentRepository";
import type { ICommentLikeRepository } from "@/domain/repositories/ICommentLikeRepository";
import type { IDiscussionRepository } from "@/domain/repositories/IDiscussionRepository";
import type { INotificationRepository } from "@/domain/repositories/INotificationRepository";
import type { IBookRepository } from "@/domain/repositories/IBookRepository";
import type { Comment } from "@/domain/entities/Comment";
import type { Book } from "@/domain/entities/Book";

interface FakeRepos extends BadgeRepos {
  user: IUserRepository & { _badges: Map<string, string[]> };
  notification: INotificationRepository & { _created: unknown[] };
}

function makeRepos(opts: {
  badges?: string[];
  chaptersRead?: number;
  chaptersReadByBook?: Record<string, number>;
  comments?: Comment[];
  hasGivenLike?: boolean;
  hasOpenedDiscussion?: boolean;
  hasAnsweredDiscussion?: boolean;
  hasMentioned?: boolean;
  books?: Book[];
} = {}): FakeRepos {
  const userBadges = new Map<string, string[]>();
  userBadges.set("user-1", [...(opts.badges ?? [])]);
  const notifs: unknown[] = [];

  const user = {
    findByEmail: async () => null,
    findByUsername: async () => null,
    findByUsernames: async () => [],
    findAll: async () => [],
    findAllPaginated: async () => [],
    create: async () => ({} as never),
    updatePassword: async () => {},
    updatePasswordById: async () => {},
    update: async () => null,
    markTutorialCompleted: async () => {},
    addBadges: async (userId: string, ids: string[]) => {
      const cur = new Set(userBadges.get(userId) ?? []);
      const fresh = ids.filter((id) => !cur.has(id));
      userBadges.set(userId, [...cur, ...fresh]);
      return fresh;
    },
    delete: async () => {},
    _badges: userBadges,
  } as IUserRepository & { _badges: Map<string, string[]> };

  const chapterRead: IUserChapterReadRepository = {
    markRead: async () => true,
    unmarkRead: async () => {},
    countByUser: async () => opts.chaptersRead ?? 0,
    findChaptersForBook: async () => [],
    countByUserPerBook: async () => opts.chaptersReadByBook ?? {},
    findAllForUser: async () => [],
  };

  const comment = {
    findByUsername: async () => opts.comments ?? [],
  } as unknown as ICommentRepository;

  const commentLike: ICommentLikeRepository = {
    like: async () => true,
    unlike: async () => {},
    hasLiked: async () => false,
    countByComment: async () => new Map(),
    whichLiked: async () => new Set(),
    findCommentIdsLikedBy: async () => [],
    userHasGivenAnyLike: async () => opts.hasGivenLike ?? false,
    deleteAllByUser: async () => 0,
    deleteAllByComment: async () => 0,
  };

  const discussion = {
    userHasOpenedDiscussion: async () => opts.hasOpenedDiscussion ?? false,
    userHasAnsweredDiscussion: async () => opts.hasAnsweredDiscussion ?? false,
  } as unknown as IDiscussionRepository;

  const notification = {
    create: async () => ({} as never),
    createMany: async (xs: unknown[]) => {
      notifs.push(...xs);
      return xs.length;
    },
    findByRecipient: async () => [],
    countUnread: async () => 0,
    markAsRead: async () => null,
    markAllAsRead: async () => 0,
    deleteForUser: async () => 0,
    userHasMentioned: async () => opts.hasMentioned ?? false,
    _created: notifs,
  } as unknown as INotificationRepository & { _created: unknown[] };

  const book = {
    findAll: async () => opts.books ?? [],
    findByAbbrev: async () => null,
    create: async () => ({} as never),
  } as IBookRepository;

  return { user, chapterRead, comment, commentLike, discussion, notification, book };
}

function makeComment(bookRef: string, partial: Partial<Comment> = {}): Comment {
  return {
    verseId: "v",
    username: "alice",
    onTitle: false,
    bookReference: bookRef,
    text: "x",
    tags: [],
    reports: [],
    ...partial,
  };
}

const ALICE = { userId: "user-1", username: "alice" };

describe("EvaluateBadgesUseCase", () => {
  describe("reader-volume axis", () => {
    it("does not unlock anything below the bronze threshold", async () => {
      const repos = makeRepos({ chaptersRead: 9 });
      const out = await new EvaluateBadgesUseCase(repos).evaluate({
        ...ALICE,
        axes: ["reader-volume"],
      });
      expect(out).toEqual([]);
    });

    it("unlocks bronze at 10 chapters", async () => {
      const repos = makeRepos({ chaptersRead: 10 });
      const out = await new EvaluateBadgesUseCase(repos).evaluate({
        ...ALICE,
        axes: ["reader-volume"],
      });
      expect(out).toContain("reader-bronze");
    });

    it("unlocks all four reader tiers at 1189", async () => {
      const repos = makeRepos({ chaptersRead: 1189 });
      const out = await new EvaluateBadgesUseCase(repos).evaluate({
        ...ALICE,
        axes: ["reader-volume"],
      });
      expect(out.sort()).toEqual(["reader-bronze", "reader-gold", "reader-platinum", "reader-silver"]);
    });

    it("only awards what is new — already-owned tiers are skipped", async () => {
      const repos = makeRepos({ chaptersRead: 50, badges: ["reader-bronze"] });
      const out = await new EvaluateBadgesUseCase(repos).evaluate({
        ...ALICE,
        axes: ["reader-volume"],
      });
      expect(out).toEqual(["reader-silver"]);
    });
  });

  describe("commenter axes", () => {
    it("counts comments and unlocks commenter-bronze at 1", async () => {
      const repos = makeRepos({ comments: [makeComment("gn 1:1")] });
      const out = await new EvaluateBadgesUseCase(repos).evaluate({
        ...ALICE,
        axes: ["commenter-volume", "commenter-diversity"],
      });
      expect(out).toContain("commenter-bronze");
    });

    it("commenter-diversity counts distinct books in bookReference", async () => {
      const repos = makeRepos({
        comments: [
          makeComment("gn 1:1"),
          makeComment("gn 2:2"),
          makeComment("ex 1:1"),
          makeComment("lv 1:1"),
        ],
      });
      const out = await new EvaluateBadgesUseCase(repos).evaluate({
        ...ALICE,
        axes: ["commenter-volume", "commenter-diversity"],
      });
      expect(out).toContain("diverse-bronze");
    });
  });

  describe("commenter-tags axis", () => {
    it("first-comment-devocional unlocks once user has a devocional-tagged comment", async () => {
      const repos = makeRepos({
        comments: [makeComment("gn 1:1", { tags: ["devocional"] })],
      });
      const out = await new EvaluateBadgesUseCase(repos).evaluate({
        ...ALICE,
        axes: ["commenter-tags"],
      });
      expect(out).toContain("first-comment-devocional");
      expect(out).not.toContain("first-comment-exegese");
    });

    it("treats 'exegetico' as 'exegese' (legacy alias)", async () => {
      const repos = makeRepos({
        comments: [makeComment("gn 1:1", { tags: ["exegetico"] })],
      });
      const out = await new EvaluateBadgesUseCase(repos).evaluate({
        ...ALICE,
        axes: ["commenter-tags"],
      });
      expect(out).toContain("first-comment-exegese");
    });
  });

  describe("interaction axis (first-time milestones)", () => {
    it("first-like is hint-driven (no repo round-trip needed)", async () => {
      const repos = makeRepos({ hasGivenLike: false });
      const out = await new EvaluateBadgesUseCase(repos).evaluate({
        ...ALICE,
        axes: ["interaction"],
        hints: { hasGivenLike: true },
      });
      expect(out).toContain("first-like");
    });

    it("first-discussion / first-answer / first-mention all unlock from hints", async () => {
      const repos = makeRepos();
      const out = await new EvaluateBadgesUseCase(repos).evaluate({
        ...ALICE,
        axes: ["interaction"],
        hints: {
          hasOpenedDiscussion: true,
          hasAnsweredDiscussion: true,
          hasMentioned: true,
        },
      });
      expect(out).toEqual(
        expect.arrayContaining(["first-discussion", "first-answer", "first-mention"]),
      );
    });

    it("first-read unlocks once chaptersRead >= 1", async () => {
      const repos = makeRepos({ chaptersRead: 1 });
      const out = await new EvaluateBadgesUseCase(repos).evaluate({
        ...ALICE,
        axes: ["interaction"],
      });
      expect(out).toContain("first-read");
    });
  });

  describe("section completion (reader-section)", () => {
    const PENTATEUCO_BOOKS: Book[] = [
      { abbrev: "gn", name: "Gênesis", author: "x", chapters: 50, group: "Pentateuco", testament: "VT" },
      { abbrev: "ex", name: "Êxodo",   author: "x", chapters: 40, group: "Pentateuco", testament: "VT" },
      { abbrev: "lv", name: "Levítico",author: "x", chapters: 27, group: "Pentateuco", testament: "VT" },
      { abbrev: "nm", name: "Números", author: "x", chapters: 36, group: "Pentateuco", testament: "VT" },
      { abbrev: "dt", name: "Deuter.", author: "x", chapters: 34, group: "Pentateuco", testament: "VT" },
    ];

    it("does NOT unlock section-pentateuco when one book is incomplete", async () => {
      const repos = makeRepos({
        books: PENTATEUCO_BOOKS,
        chaptersReadByBook: { gn: 50, ex: 40, lv: 27, nm: 36, dt: 33 /* one short */ },
      });
      const out = await new EvaluateBadgesUseCase(repos).evaluate({
        ...ALICE,
        axes: ["reader-section"],
      });
      expect(out).not.toContain("section-pentateuco");
    });

    it("unlocks section-pentateuco when all 5 books are fully read", async () => {
      const repos = makeRepos({
        books: PENTATEUCO_BOOKS,
        chaptersReadByBook: { gn: 50, ex: 40, lv: 27, nm: 36, dt: 34 },
      });
      const out = await new EvaluateBadgesUseCase(repos).evaluate({
        ...ALICE,
        axes: ["reader-section"],
      });
      expect(out).toContain("section-pentateuco");
    });
  });

  describe("notification side effects", () => {
    it("fires one badge_unlocked notification per newly-earned badge", async () => {
      const repos = makeRepos({ chaptersRead: 50 });
      const out = await new EvaluateBadgesUseCase(repos).evaluate({
        ...ALICE,
        axes: ["reader-volume"],
      });
      expect(out.length).toBeGreaterThan(0);
      const created = (repos.notification as unknown as { _created: { type: string }[] })._created;
      expect(created.length).toBe(out.length);
      for (const n of created) expect(n.type).toBe("badge_unlocked");
    });

    it("silent: true suppresses notifications", async () => {
      const repos = makeRepos({ chaptersRead: 50 });
      await new EvaluateBadgesUseCase(repos).evaluate({
        ...ALICE,
        axes: ["reader-volume"],
        silent: true,
      });
      const created = (repos.notification as unknown as { _created: unknown[] })._created;
      expect(created).toEqual([]);
    });
  });

  describe("axes filter", () => {
    it("a reader-volume trigger does not query comment data", async () => {
      let commentsQueried = false;
      const repos = makeRepos({ chaptersRead: 10 });
      // Spy on comment.findByUsername.
      const origFind = repos.comment.findByUsername.bind(repos.comment);
      repos.comment.findByUsername = async (u: string) => {
        commentsQueried = true;
        return origFind(u);
      };
      await new EvaluateBadgesUseCase(repos).evaluate({
        ...ALICE,
        axes: ["reader-volume"],
      });
      expect(commentsQueried).toBe(false);
    });
  });
});
