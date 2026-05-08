import { describe, it, expect } from "vitest";
import {
  ListAllCommentsForModerationUseCase,
  ToggleCommentVerifiedUseCase,
} from "./CommentUseCases";
import type { ICommentRepository } from "@/domain/repositories/ICommentRepository";
import type { ICommentReportRepository } from "@/domain/repositories/ICommentReportRepository";
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
    verified: false,
    ...partial,
  };
}

function inMemoryCommentRepo(comments: Comment[]): ICommentRepository {
  // Keep state mutable — toggle tests rewrite verified in place.
  const store = new Map(comments.map((c) => [c._id ?? "", { ...c }]));
  return {
    findById: async (id: string) => {
      const c = store.get(id);
      return c ? { ...c } : null;
    },
    setVerified: async (id: string, verified: boolean, by: string | null) => {
      const c = store.get(id);
      if (!c) return null;
      c.verified = verified;
      c.verifiedBy = verified ? by ?? undefined : undefined;
      c.verifiedAt = verified ? new Date() : undefined;
      return { ...c };
    },
    findForModeration: async ({ q, page, pageSize }: { q?: string; page: number; pageSize: number }) => {
      const all = [...store.values()];
      const filtered = q
        ? all.filter((c) =>
            [c.text, c.username, c.bookReference]
              .join(" ")
              .toLowerCase()
              .includes(q.toLowerCase()),
          )
        : all;
      // newest first by id (stand-in for createdAt — fixtures don't set it)
      filtered.sort((a, b) => (b._id ?? "").localeCompare(a._id ?? ""));
      const start = (page - 1) * pageSize;
      return { items: filtered.slice(start, start + pageSize), total: filtered.length };
    },
  } as unknown as ICommentRepository;
}

function reportRepoStub(byComment: Record<string, number> = {}): ICommentReportRepository {
  return {
    countByComment: async (ids: string[]) => {
      const out = new Map<string, number>();
      for (const id of ids) {
        const n = byComment[id] ?? 0;
        if (n > 0) out.set(id, n);
      }
      return out;
    },
  } as unknown as ICommentReportRepository;
}

describe("ListAllCommentsForModerationUseCase", () => {
  it("returns paginated items with total and enriches with reportCount", async () => {
    const cRepo = inMemoryCommentRepo([
      makeComment("c1", { text: "alpha" }),
      makeComment("c2", { text: "beta" }),
      makeComment("c3", { text: "gamma" }),
    ]);
    const rRepo = reportRepoStub({ c2: 5 });
    const uc = new ListAllCommentsForModerationUseCase(cRepo, rRepo);

    const result = await uc.execute(1, 2);

    expect(result.total).toBe(3);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(2);
    expect(result.items).toHaveLength(2);
    const reported = result.items.find((c) => c._id === "c2");
    expect(reported?.reportCount).toBe(5);
    const clean = result.items.find((c) => c._id !== "c2");
    expect(clean?.reportCount).toBe(0);
  });

  it("filters by query against text/username/bookReference", async () => {
    const cRepo = inMemoryCommentRepo([
      makeComment("c1", { text: "Genesis exegesis" }),
      makeComment("c2", { text: "John commentary", username: "bob" }),
      makeComment("c3", { text: "random", bookReference: "Mt 5:3" }),
    ]);
    const uc = new ListAllCommentsForModerationUseCase(cRepo, reportRepoStub());

    const matches = await uc.execute(1, 50, "bob");
    expect(matches.items.map((c) => c._id)).toEqual(["c2"]);
    expect(matches.total).toBe(1);
  });

  it("returns empty page without crashing on no results", async () => {
    const cRepo = inMemoryCommentRepo([]);
    const result = await new ListAllCommentsForModerationUseCase(
      cRepo,
      reportRepoStub(),
    ).execute(1, 20);

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });
});

describe("ToggleCommentVerifiedUseCase", () => {
  it("verifies an unverified comment and stamps verifiedBy", async () => {
    const cRepo = inMemoryCommentRepo([makeComment("c1", { verified: false })]);
    const updated = await new ToggleCommentVerifiedUseCase(cRepo).execute("c1", "mod-jane");

    expect(updated.verified).toBe(true);
    expect(updated.verifiedBy).toBe("mod-jane");
    expect(updated.verifiedAt).toBeInstanceOf(Date);
  });

  it("unverifies a verified comment and clears verifiedBy", async () => {
    const cRepo = inMemoryCommentRepo([
      makeComment("c1", { verified: true, verifiedBy: "old-mod" }),
    ]);
    const updated = await new ToggleCommentVerifiedUseCase(cRepo).execute("c1", "mod-jane");

    expect(updated.verified).toBe(false);
    expect(updated.verifiedBy).toBeUndefined();
  });

  it("throws when the comment is missing", async () => {
    const cRepo = inMemoryCommentRepo([]);
    await expect(
      new ToggleCommentVerifiedUseCase(cRepo).execute("missing", "mod"),
    ).rejects.toThrow("Comment not found");
  });
});
