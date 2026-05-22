import { describe, it, expect } from "vitest";
import {
  ToggleLikeUseCase,
  GetUserFavoritesUseCase,
} from "./CommentUseCases";
import type { ICommentRepository } from "@/domain/repositories/ICommentRepository";
import type { ICommentLikeRepository } from "@/domain/repositories/ICommentLikeRepository";
import type { Comment } from "@/domain/entities/Comment";

function commentRepoStub(comments: Comment[]): ICommentRepository {
  const byId = new Map(comments.map((c) => [c._id ?? "", c]));
  return {
    findById: async (id: string) => byId.get(id) ?? null,
    findManyByIds: async (ids: string[]) =>
      ids.map((id) => byId.get(id)).filter((c): c is Comment => Boolean(c)),
  } as unknown as ICommentRepository;
}

function inMemoryLikeRepo(): ICommentLikeRepository {
  // Map<userId, Map<commentId, createdAt>> — preserves insertion order so the
  // "favorites" sort matches what Mongo's createdAt index would produce.
  const data = new Map<string, Map<string, Date>>();
  return {
    async like(userId, commentId) {
      if (!data.has(userId)) data.set(userId, new Map());
      const userMap = data.get(userId)!;
      if (userMap.has(commentId)) return false;
      userMap.set(commentId, new Date(Date.now() + userMap.size));
      return true;
    },
    async unlike(userId, commentId) {
      data.get(userId)?.delete(commentId);
    },
    async hasLiked(userId, commentId) {
      return data.get(userId)?.has(commentId) ?? false;
    },
    async countByComment(ids) {
      const out = new Map<string, number>();
      for (const id of ids) {
        let n = 0;
        for (const userMap of data.values()) if (userMap.has(id)) n++;
        if (n > 0) out.set(id, n);
      }
      return out;
    },
    async whichLiked(userId, ids) {
      const userMap = data.get(userId);
      const out = new Set<string>();
      if (!userMap) return out;
      for (const id of ids) if (userMap.has(id)) out.add(id);
      return out;
    },
    async findCommentIdsLikedBy(userId, page, pageSize) {
      const userMap = data.get(userId);
      if (!userMap) return [];
      // newest first
      const entries = [...userMap.entries()].sort(
        (a, b) => b[1].getTime() - a[1].getTime(),
      );
      return entries
        .slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize)
        .map(([id]) => id);
    },
    async userHasGivenAnyLike(userId) {
      return (data.get(userId)?.size ?? 0) > 0;
    },
    async topLikedSince() {
      return [];
    },
    async deleteAllByUser(userId) {
      const n = data.get(userId)?.size ?? 0;
      data.delete(userId);
      return n;
    },
    async deleteAllByComment(commentId) {
      let n = 0;
      for (const userMap of data.values()) {
        if (userMap.delete(commentId)) n++;
      }
      return n;
    },
  };
}

function makeComment(id: string, partial: Partial<Comment> = {}): Comment {
  return {
    _id: id,
    verseId: "v",
    username: "alice",
    onTitle: false,
    bookReference: "Gn 1:1",
    text: "x",
    tags: [],
    ...partial,
  };
}

describe("ToggleLikeUseCase", () => {
  it("first call inserts a like and returns likedByMe: true with count 1", async () => {
    const cRepo = commentRepoStub([makeComment("c1")]);
    const lRepo = inMemoryLikeRepo();
    const uc = new ToggleLikeUseCase(cRepo, lRepo);

    const result = await uc.execute("c1", "user-1");

    expect(result).toEqual({ commentId: "c1", likeCount: 1, likedByMe: true });
    expect(await lRepo.hasLiked("user-1", "c1")).toBe(true);
  });

  it("second call by the same user removes the like", async () => {
    const cRepo = commentRepoStub([makeComment("c1")]);
    const lRepo = inMemoryLikeRepo();
    const uc = new ToggleLikeUseCase(cRepo, lRepo);

    await uc.execute("c1", "user-1");
    const result = await uc.execute("c1", "user-1");

    expect(result).toEqual({ commentId: "c1", likeCount: 0, likedByMe: false });
    expect(await lRepo.hasLiked("user-1", "c1")).toBe(false);
  });

  it("counts likes from multiple users independently", async () => {
    const cRepo = commentRepoStub([makeComment("c1")]);
    const lRepo = inMemoryLikeRepo();
    const uc = new ToggleLikeUseCase(cRepo, lRepo);

    await uc.execute("c1", "user-1");
    const result = await uc.execute("c1", "user-2");

    expect(result.likeCount).toBe(2);
    expect(result.likedByMe).toBe(true);
  });

  it("throws when the comment does not exist (no orphan join row)", async () => {
    const cRepo = commentRepoStub([]);
    const lRepo = inMemoryLikeRepo();
    const uc = new ToggleLikeUseCase(cRepo, lRepo);

    await expect(uc.execute("missing", "user-1")).rejects.toThrow("Comment not found");
    expect(await lRepo.userHasGivenAnyLike("user-1")).toBe(false);
  });
});

describe("GetUserFavoritesUseCase", () => {
  it("returns empty list when user has no likes", async () => {
    const cRepo = commentRepoStub([makeComment("c1")]);
    const lRepo = inMemoryLikeRepo();
    const uc = new GetUserFavoritesUseCase(cRepo, lRepo);

    const result = await uc.execute("user-1", 1, 50);

    expect(result).toEqual([]);
  });

  it("returns liked comments in like-date desc order with likedByMe: true", async () => {
    const cRepo = commentRepoStub([
      makeComment("c1", { text: "first" }),
      makeComment("c2", { text: "second" }),
      makeComment("c3", { text: "third" }),
    ]);
    const lRepo = inMemoryLikeRepo();
    const uc = new GetUserFavoritesUseCase(cRepo, lRepo);

    // Like in order c1 → c2 → c3; expect c3 first.
    await lRepo.like("user-1", "c1");
    await lRepo.like("user-1", "c2");
    await lRepo.like("user-1", "c3");

    const result = await uc.execute("user-1", 1, 50);

    expect(result.map((c) => c._id)).toEqual(["c3", "c2", "c1"]);
    for (const c of result) {
      expect(c.likedByMe).toBe(true);
      expect(c.likeCount).toBe(1);
    }
  });

  it("skips comments that no longer exist (lazy cascade)", async () => {
    const cRepo = commentRepoStub([makeComment("c1")]);
    const lRepo = inMemoryLikeRepo();
    const uc = new GetUserFavoritesUseCase(cRepo, lRepo);

    await lRepo.like("user-1", "c1");
    await lRepo.like("user-1", "ghost"); // no Comment doc for "ghost"

    const result = await uc.execute("user-1", 1, 50);

    expect(result.map((c) => c._id)).toEqual(["c1"]);
  });

  it("excludes soft-hidden comments from favorites", async () => {
    const cRepo = commentRepoStub([
      makeComment("c1", { text: "visible" }),
      makeComment("c2", { text: "hidden", hiddenAt: new Date() }),
    ]);
    const lRepo = inMemoryLikeRepo();
    const uc = new GetUserFavoritesUseCase(cRepo, lRepo);

    await lRepo.like("user-1", "c1");
    await lRepo.like("user-1", "c2");

    const result = await uc.execute("user-1", 1, 50);

    expect(result.map((c) => c._id)).toEqual(["c1"]);
  });
});

describe("inMemoryLikeRepo (sanity)", () => {
  it("countByComment aggregates across users", async () => {
    const repo = inMemoryLikeRepo();
    await repo.like("u1", "c1");
    await repo.like("u2", "c1");
    await repo.like("u1", "c2");

    const counts = await repo.countByComment(["c1", "c2", "c3"]);

    expect(counts.get("c1")).toBe(2);
    expect(counts.get("c2")).toBe(1);
    expect(counts.has("c3")).toBe(false);
  });

  it("whichLiked returns the subset the viewer liked", async () => {
    const repo = inMemoryLikeRepo();
    await repo.like("u1", "c1");
    await repo.like("u1", "c3");

    const liked = await repo.whichLiked("u1", ["c1", "c2", "c3"]);

    expect([...liked].sort()).toEqual(["c1", "c3"]);
  });

  it("deleteAllByUser cascades the user's likes only", async () => {
    const repo = inMemoryLikeRepo();
    await repo.like("u1", "c1");
    await repo.like("u2", "c1");

    const removed = await repo.deleteAllByUser("u1");

    expect(removed).toBe(1);
    expect(await repo.hasLiked("u1", "c1")).toBe(false);
    expect(await repo.hasLiked("u2", "c1")).toBe(true);
  });
});
