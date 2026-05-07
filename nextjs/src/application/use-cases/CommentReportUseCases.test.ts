import { describe, it, expect } from "vitest";
import {
  ReportCommentUseCase,
  ListReportedCommentsUseCase,
  ClearReportsUseCase,
} from "./CommentUseCases";
import type { ICommentRepository } from "@/domain/repositories/ICommentRepository";
import type {
  ICommentReportRepository,
  ReportedCommentAggregate,
} from "@/domain/repositories/ICommentReportRepository";
import type { Comment } from "@/domain/entities/Comment";

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

function commentRepoStub(comments: Comment[]): ICommentRepository {
  const byId = new Map(comments.map((c) => [c._id ?? "", c]));
  return {
    findById: async (id: string) => byId.get(id) ?? null,
    findManyByIds: async (ids: string[]) =>
      ids.map((id) => byId.get(id)).filter((c): c is Comment => Boolean(c)),
  } as unknown as ICommentRepository;
}

function inMemoryReportRepo(): ICommentReportRepository {
  // Map<commentId, Map<userId, username>>
  const byComment = new Map<string, Map<string, string>>();
  return {
    async report(userId, username, commentId) {
      if (!byComment.has(commentId)) byComment.set(commentId, new Map());
      const inner = byComment.get(commentId)!;
      if (inner.has(userId)) return false;
      inner.set(userId, username);
      return true;
    },
    async clearReportsForComment(commentId) {
      const n = byComment.get(commentId)?.size ?? 0;
      byComment.delete(commentId);
      return n;
    },
    async findReportedCommentIds(page, pageSize) {
      const all: ReportedCommentAggregate[] = [];
      for (const [commentId, inner] of byComment.entries()) {
        if (inner.size === 0) continue;
        all.push({
          commentId,
          reportCount: inner.size,
          reporters: [...new Set(inner.values())],
        });
      }
      // most-reported first
      all.sort((a, b) => b.reportCount - a.reportCount);
      return all.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);
    },
    async countByComment(ids) {
      const out = new Map<string, number>();
      for (const id of ids) {
        const n = byComment.get(id)?.size ?? 0;
        if (n > 0) out.set(id, n);
      }
      return out;
    },
    async whichReported(userId, ids) {
      const out = new Set<string>();
      for (const id of ids) if (byComment.get(id)?.has(userId)) out.add(id);
      return out;
    },
    async deleteAllByUser(userId) {
      let n = 0;
      for (const inner of byComment.values()) if (inner.delete(userId)) n++;
      return n;
    },
    async deleteAllByComment(commentId) {
      const n = byComment.get(commentId)?.size ?? 0;
      byComment.delete(commentId);
      return n;
    },
  };
}

describe("ReportCommentUseCase", () => {
  it("first call inserts a report and returns reportCount: 1", async () => {
    const cRepo = commentRepoStub([makeComment("c1")]);
    const rRepo = inMemoryReportRepo();
    const uc = new ReportCommentUseCase(cRepo, rRepo);

    const result = await uc.execute("c1", "u-alice", "alice");

    expect(result).toEqual({ commentId: "c1", reportCount: 1, reportedByMe: true });
  });

  it("repeating the same user is idempotent (count stays at 1)", async () => {
    const cRepo = commentRepoStub([makeComment("c1")]);
    const rRepo = inMemoryReportRepo();
    const uc = new ReportCommentUseCase(cRepo, rRepo);

    await uc.execute("c1", "u-alice", "alice");
    const result = await uc.execute("c1", "u-alice", "alice");

    expect(result.reportCount).toBe(1);
  });

  it("counts distinct users", async () => {
    const cRepo = commentRepoStub([makeComment("c1")]);
    const rRepo = inMemoryReportRepo();
    const uc = new ReportCommentUseCase(cRepo, rRepo);

    await uc.execute("c1", "u-alice", "alice");
    const result = await uc.execute("c1", "u-bob", "bob");

    expect(result.reportCount).toBe(2);
  });

  it("throws when the comment does not exist", async () => {
    const cRepo = commentRepoStub([]);
    const rRepo = inMemoryReportRepo();
    const uc = new ReportCommentUseCase(cRepo, rRepo);

    await expect(uc.execute("missing", "u-alice", "alice")).rejects.toThrow("Comment not found");
  });
});

describe("ListReportedCommentsUseCase", () => {
  it("returns reported comments enriched with reportCount + reporters, ordered most-reported first", async () => {
    const cRepo = commentRepoStub([
      makeComment("c1", { text: "low priority" }),
      makeComment("c2", { text: "high priority" }),
    ]);
    const rRepo = inMemoryReportRepo();
    await rRepo.report("u-alice", "alice", "c1");
    await rRepo.report("u-alice", "alice", "c2");
    await rRepo.report("u-bob", "bob", "c2");
    await rRepo.report("u-mod", "mod", "c2");

    const items = await new ListReportedCommentsUseCase(cRepo, rRepo).execute(1, 50);

    expect(items.map((c) => c._id)).toEqual(["c2", "c1"]);
    expect(items[0].reportCount).toBe(3);
    expect([...(items[0].reporters ?? [])].sort()).toEqual(["alice", "bob", "mod"]);
    expect(items[1].reportCount).toBe(1);
  });

  it("skips reports whose target was hard-deleted", async () => {
    const cRepo = commentRepoStub([makeComment("c1")]);
    const rRepo = inMemoryReportRepo();
    await rRepo.report("u-alice", "alice", "ghost"); // no Comment doc
    await rRepo.report("u-alice", "alice", "c1");

    const items = await new ListReportedCommentsUseCase(cRepo, rRepo).execute(1, 50);

    expect(items.map((c) => c._id)).toEqual(["c1"]);
  });
});

describe("ClearReportsUseCase", () => {
  it("returns the cleared count for the comment", async () => {
    const rRepo = inMemoryReportRepo();
    await rRepo.report("u-alice", "alice", "c1");
    await rRepo.report("u-bob", "bob", "c1");

    const result = await new ClearReportsUseCase(rRepo).execute("c1");

    expect(result).toEqual({ commentId: "c1", cleared: 2 });
    expect(await rRepo.countByComment(["c1"])).toEqual(new Map());
  });
});

describe("inMemoryReportRepo (sanity)", () => {
  it("deleteAllByUser removes only the reporter's rows", async () => {
    const repo = inMemoryReportRepo();
    await repo.report("u1", "alice", "c1");
    await repo.report("u2", "bob", "c1");

    const removed = await repo.deleteAllByUser("u1");

    expect(removed).toBe(1);
    expect(await repo.countByComment(["c1"])).toEqual(new Map([["c1", 1]]));
  });

  it("whichReported returns the subset the viewer reported", async () => {
    const repo = inMemoryReportRepo();
    await repo.report("u1", "alice", "c1");
    await repo.report("u1", "alice", "c3");

    const reported = await repo.whichReported("u1", ["c1", "c2", "c3"]);

    expect([...reported].sort()).toEqual(["c1", "c3"]);
  });
});
