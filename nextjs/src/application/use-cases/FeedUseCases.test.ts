import { describe, it, expect } from "vitest";
import {
  GetRecentFeedUseCase,
  GetPopularFeedUseCase,
  GetActiveDiscussionsUseCase,
} from "./FeedUseCases";
import type { ICommentRepository } from "@/domain/repositories/ICommentRepository";
import type { ICommentLikeRepository } from "@/domain/repositories/ICommentLikeRepository";
import type { IVerseRepository } from "@/domain/repositories/IVerseRepository";
import type { IDiscussionRepository } from "@/domain/repositories/IDiscussionRepository";
import type { IDiscussionAnswerRepository } from "@/domain/repositories/IDiscussionAnswerRepository";
import type { Comment } from "@/domain/entities/Comment";
import type { Discussion } from "@/domain/entities/Discussion";
import type { Verse } from "@/domain/entities/Verse";

function comment(id: string, partial: Partial<Comment> = {}): Comment {
  return {
    _id: id,
    verseId: `v-${id}`,
    username: "alice",
    onTitle: false,
    bookReference: "Gn 1:1",
    text: `text-${id}`,
    tags: [],
    createdAt: partial.createdAt ?? new Date(2026, 0, parseInt(id.replace(/\D/g, ""), 10) || 1),
    ...partial,
  };
}

function commentRepoStub(comments: Comment[]): ICommentRepository {
  return {
    findManyByIds: async (ids: string[]) =>
      ids.map((i) => comments.find((c) => c._id === i)).filter((c): c is Comment => Boolean(c)),
    findForModeration: async ({ limit }: { limit: number }) => {
      const sorted = [...comments].sort(
        (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
      );
      const slice = sorted.slice(0, limit + 1);
      const hasMore = slice.length > limit;
      const items = (hasMore ? slice.slice(0, limit) : slice).map((c) => ({ ...c }));
      const last = items[items.length - 1];
      return {
        items,
        nextCursor:
          hasMore && last?.createdAt && last._id
            ? { createdAt: last.createdAt, id: last._id }
            : null,
      };
    },
  } as unknown as ICommentRepository;
}

function likeRepoStub(opts: {
  countMap?: Record<string, number>;
  topSince?: Array<{ commentId: string; likeCount: number }>;
} = {}): ICommentLikeRepository {
  return {
    countByComment: async (ids: string[]) => {
      const out = new Map<string, number>();
      for (const id of ids) {
        const n = opts.countMap?.[id] ?? 0;
        if (n > 0) out.set(id, n);
      }
      return out;
    },
    topLikedSince: async () => opts.topSince ?? [],
  } as unknown as ICommentLikeRepository;
}

function verseRepoStub(verses: Verse[]): IVerseRepository {
  return {
    findManyByIds: async (ids: string[]) =>
      ids.map((i) => verses.find((v) => v._id === i)).filter((v): v is Verse => Boolean(v)),
  } as unknown as IVerseRepository;
}

describe("GetRecentFeedUseCase", () => {
  it("returns newest comments enriched with likeCount + verse-link", async () => {
    const comments = [
      comment("c1", { createdAt: new Date(2026, 0, 1) }),
      comment("c2", { createdAt: new Date(2026, 0, 2) }),
    ];
    const verses: Verse[] = [
      { _id: "v-c1", abbrev: "gn", chapter: 1, verseNumber: 1, text: "" },
      { _id: "v-c2", abbrev: "gn", chapter: 2, verseNumber: 5, text: "" },
    ];
    const uc = new GetRecentFeedUseCase(
      commentRepoStub(comments),
      likeRepoStub({ countMap: { c2: 3 } }),
      verseRepoStub(verses),
    );

    const result = await uc.execute({ limit: 10 });

    expect(result.items.map((c) => c._id)).toEqual(["c2", "c1"]);
    expect(result.items[0].likeCount).toBe(3);
    expect(result.items[0].link).toEqual({ abbrev: "gn", chapter: 2, verseNumber: 5 });
    expect(result.items[1].likeCount).toBe(0);
  });

  it("emits null link when the verse has been deleted", async () => {
    const uc = new GetRecentFeedUseCase(
      commentRepoStub([comment("c1")]),
      likeRepoStub(),
      verseRepoStub([]),
    );

    const result = await uc.execute({ limit: 10 });

    expect(result.items[0].link).toBeNull();
  });

  it("walks pages via cursor", async () => {
    const comments = [
      comment("c1", { createdAt: new Date(2026, 0, 1) }),
      comment("c2", { createdAt: new Date(2026, 0, 2) }),
      comment("c3", { createdAt: new Date(2026, 0, 3) }),
    ];
    const verses: Verse[] = [];
    const uc = new GetRecentFeedUseCase(
      commentRepoStub(comments),
      likeRepoStub(),
      verseRepoStub(verses),
    );

    const first = await uc.execute({ limit: 2 });
    expect(first.items).toHaveLength(2);
    expect(first.nextCursor).not.toBeNull();
  });
});

describe("GetPopularFeedUseCase", () => {
  it("returns comments ordered by likeCount desc", async () => {
    const comments = [
      comment("c1", { text: "less popular" }),
      comment("c2", { text: "most popular" }),
    ];
    const verses: Verse[] = [
      { _id: "v-c1", abbrev: "gn", chapter: 1, verseNumber: 1, text: "" },
      { _id: "v-c2", abbrev: "gn", chapter: 1, verseNumber: 2, text: "" },
    ];
    const topSince = [
      { commentId: "c2", likeCount: 5 },
      { commentId: "c1", likeCount: 1 },
    ];
    const uc = new GetPopularFeedUseCase(
      commentRepoStub(comments),
      likeRepoStub({ topSince, countMap: { c1: 1, c2: 5 } }),
      verseRepoStub(verses),
    );

    const result = await uc.execute({ windowDays: 7, limit: 10 });

    expect(result.items.map((c) => c._id)).toEqual(["c2", "c1"]);
    expect(result.items[0].likeCount).toBe(5);
  });

  it("returns empty when no likes in the window", async () => {
    const uc = new GetPopularFeedUseCase(
      commentRepoStub([]),
      likeRepoStub(),
      verseRepoStub([]),
    );

    const result = await uc.execute({ windowDays: 7, limit: 10 });
    expect(result.items).toEqual([]);
  });
});

describe("GetActiveDiscussionsUseCase", () => {
  it("returns discussions ordered by lastAnswerAt desc with answerCount", async () => {
    const discussions: Discussion[] = [
      {
        _id: "d1",
        bookAbbrev: "gn",
        username: "alice",
        verseReference: "Gn 1:1",
        verseText: "",
        commentText: "",
        question: "first?",
      },
      {
        _id: "d2",
        bookAbbrev: "gn",
        username: "alice",
        verseReference: "Gn 2:5",
        verseText: "",
        commentText: "",
        question: "second?",
      },
    ];
    const dRepo = {
      findManyByIds: async (ids: string[]) =>
        ids.map((i) => discussions.find((d) => d._id === i)).filter(Boolean),
    } as unknown as IDiscussionRepository;
    const aRepo = {
      latestPerDiscussion: async () => [
        { discussionId: "d2", lastAnswerAt: new Date(2026, 0, 5), answerCount: 3 },
        { discussionId: "d1", lastAnswerAt: new Date(2026, 0, 1), answerCount: 1 },
      ],
    } as unknown as IDiscussionAnswerRepository;

    const result = await new GetActiveDiscussionsUseCase(dRepo, aRepo).execute({ limit: 10 });

    expect(result.items.map((d) => d._id)).toEqual(["d2", "d1"]);
    expect(result.items[0].answerCount).toBe(3);
  });

  it("skips aggregates whose discussion was hard-deleted", async () => {
    const dRepo = {
      findManyByIds: async () => [],
    } as unknown as IDiscussionRepository;
    const aRepo = {
      latestPerDiscussion: async () => [
        { discussionId: "ghost", lastAnswerAt: new Date(), answerCount: 1 },
      ],
    } as unknown as IDiscussionAnswerRepository;

    const result = await new GetActiveDiscussionsUseCase(dRepo, aRepo).execute({ limit: 10 });
    expect(result.items).toEqual([]);
  });
});
