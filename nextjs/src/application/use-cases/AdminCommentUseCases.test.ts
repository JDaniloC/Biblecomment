import { describe, it, expect } from "vitest";
import {
  ListAllCommentsForModerationUseCase,
  ToggleCommentVerifiedUseCase,
  SetCommentHiddenUseCase,
  UNHIDE_ACCOUNT_DISABLED_ERROR,
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
  // Keep state mutable — toggle tests rewrite verified in place. Stamp
  // sequential createdAt so the cursor predicate is deterministic.
  const store = new Map(
    comments.map((c, i) => [
      c._id ?? "",
      { ...c, createdAt: c.createdAt ?? new Date(2026, 0, 1 + i) },
    ]),
  );
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
    setHidden: async (
      id: string,
      hidden: boolean,
      by: string | null,
      reason: "moderator" | "account-disabled" | null,
    ) => {
      const c = store.get(id);
      if (!c) return null;
      c.hiddenAt = hidden ? new Date() : undefined;
      c.hiddenBy = hidden ? by ?? undefined : undefined;
      c.hiddenReason = hidden ? reason ?? "moderator" : undefined;
      return { ...c };
    },
    findForModeration: async ({
      q,
      cursor,
      limit,
      includeHidden,
    }: {
      q?: string;
      cursor?: { createdAt: Date; id: string } | null;
      limit: number;
      includeHidden?: boolean;
    }) => {
      const all = [...store.values()].filter(
        (c) => includeHidden || !c.hiddenAt,
      );
      let filtered = q
        ? all.filter((c) =>
            [c.text, c.username, c.bookReference]
              .join(" ")
              .toLowerCase()
              .includes(q.toLowerCase()),
          )
        : all;
      // newest first by createdAt, _id desc as tiebreak
      filtered = filtered.sort((a, b) => {
        const ad = (a.createdAt as Date)?.getTime() ?? 0;
        const bd = (b.createdAt as Date)?.getTime() ?? 0;
        if (ad !== bd) return bd - ad;
        return (b._id ?? "").localeCompare(a._id ?? "");
      });
      if (cursor) {
        filtered = filtered.filter((c) => {
          const cAt = (c.createdAt as Date).getTime();
          const cuAt = cursor.createdAt.getTime();
          if (cAt < cuAt) return true;
          if (cAt > cuAt) return false;
          return (c._id ?? "") < cursor.id;
        });
      }
      const slice = filtered.slice(0, limit + 1);
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
  it("returns first page with nextCursor when more remain, enriched with reportCount", async () => {
    const cRepo = inMemoryCommentRepo([
      makeComment("c1", { text: "alpha" }),
      makeComment("c2", { text: "beta" }),
      makeComment("c3", { text: "gamma" }),
    ]);
    const rRepo = reportRepoStub({ c2: 5 });
    const uc = new ListAllCommentsForModerationUseCase(cRepo, rRepo);

    const result = await uc.execute({ limit: 2 });

    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).not.toBeNull();
    const reported = result.items.find((c) => c._id === "c2");
    expect(reported?.reportCount).toBe(5);
    const clean = result.items.find((c) => c._id !== "c2");
    expect(clean?.reportCount).toBe(0);
  });

  it("walks pages via cursor and returns null cursor on the last slice", async () => {
    const cRepo = inMemoryCommentRepo([
      makeComment("c1"),
      makeComment("c2"),
      makeComment("c3"),
    ]);
    const uc = new ListAllCommentsForModerationUseCase(cRepo, reportRepoStub());

    const first = await uc.execute({ limit: 2 });
    expect(first.items).toHaveLength(2);
    expect(first.nextCursor).not.toBeNull();

    const second = await uc.execute({ limit: 2, cursor: first.nextCursor });
    expect(second.items).toHaveLength(1);
    expect(second.nextCursor).toBeNull();

    // Union covers all three with no duplicates.
    const ids = [...first.items, ...second.items].map((c) => c._id);
    expect(new Set(ids).size).toBe(3);
  });

  it("filters by query against text/username/bookReference", async () => {
    const cRepo = inMemoryCommentRepo([
      makeComment("c1", { text: "Genesis exegesis" }),
      makeComment("c2", { text: "John commentary", username: "bob" }),
      makeComment("c3", { text: "random", bookReference: "Mt 5:3" }),
    ]);
    const uc = new ListAllCommentsForModerationUseCase(cRepo, reportRepoStub());

    const matches = await uc.execute({ limit: 50, q: "bob" });
    expect(matches.items.map((c) => c._id)).toEqual(["c2"]);
    expect(matches.nextCursor).toBeNull();
  });

  it("returns empty result without crashing on no rows", async () => {
    const cRepo = inMemoryCommentRepo([]);
    const result = await new ListAllCommentsForModerationUseCase(
      cRepo,
      reportRepoStub(),
    ).execute({ limit: 20 });

    expect(result.items).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });

  it("includes soft-hidden comments — moderators must still see them", async () => {
    const cRepo = inMemoryCommentRepo([
      makeComment("c1", { text: "visible" }),
      makeComment("c2", {
        text: "hidden one",
        hiddenAt: new Date(),
        hiddenReason: "moderator",
      }),
    ]);
    const result = await new ListAllCommentsForModerationUseCase(
      cRepo,
      reportRepoStub(),
    ).execute({ limit: 50 });

    expect(result.items.map((c) => c._id).sort()).toEqual(["c1", "c2"]);
  });
});

describe("SetCommentHiddenUseCase", () => {
  it("hides a visible comment and stamps hiddenBy + reason", async () => {
    const cRepo = inMemoryCommentRepo([makeComment("c1")]);
    const updated = await new SetCommentHiddenUseCase(cRepo).execute(
      "c1",
      true,
      "mod-jane",
    );

    expect(updated.hiddenAt).toBeInstanceOf(Date);
    expect(updated.hiddenBy).toBe("mod-jane");
    expect(updated.hiddenReason).toBe("moderator");
  });

  it("un-hides a moderator-hidden comment, clearing all hidden fields", async () => {
    const cRepo = inMemoryCommentRepo([
      makeComment("c1", {
        hiddenAt: new Date(),
        hiddenBy: "mod",
        hiddenReason: "moderator",
      }),
    ]);
    const updated = await new SetCommentHiddenUseCase(cRepo).execute(
      "c1",
      false,
      "mod-jane",
    );

    expect(updated.hiddenAt).toBeUndefined();
    expect(updated.hiddenReason).toBeUndefined();
  });

  it("refuses to un-hide a comment hidden by an account disable", async () => {
    const cRepo = inMemoryCommentRepo([
      makeComment("c1", {
        hiddenAt: new Date(),
        hiddenReason: "account-disabled",
      }),
    ]);
    await expect(
      new SetCommentHiddenUseCase(cRepo).execute("c1", false, "mod"),
    ).rejects.toThrow(UNHIDE_ACCOUNT_DISABLED_ERROR);
  });

  it("throws when the comment is missing", async () => {
    await expect(
      new SetCommentHiddenUseCase(inMemoryCommentRepo([])).execute(
        "missing",
        true,
        "mod",
      ),
    ).rejects.toThrow("Comment not found");
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
