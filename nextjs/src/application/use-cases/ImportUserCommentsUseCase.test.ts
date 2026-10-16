import { describe, it, expect, vi } from "vitest";
import { ImportUserCommentsUseCase } from "./ImportUserCommentsUseCase";
import type { ICommentRepository } from "@/domain/repositories/ICommentRepository";
import type { IVerseRepository } from "@/domain/repositories/IVerseRepository";
import type { IUserRepository } from "@/domain/repositories/IUserRepository";
import type { Comment } from "@/domain/entities/Comment";
import type { User } from "@/domain/entities/User";
import type { Verse } from "@/domain/entities/Verse";
import { EmailNotVerifiedError } from "@/lib/auth-guards";

function fakeVerse(overrides: Partial<Verse> = {}): Verse {
  return {
    _id: "v-gn-1-1",
    abbrev: "gn",
    chapter: 1,
    verseNumber: 1,
    text: "No princípio…",
    reference: "Gn 1:1",
    ...overrides,
  };
}

function fakeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    _id: "c1",
    verseId: "v-gn-1-1",
    username: "alice",
    onTitle: false,
    bookReference: "Gn 1:1",
    text: "existing",
    tags: [],
    ...overrides,
  };
}

function fakeUser(overrides: Partial<User> = {}): User {
  return {
    _id: "u-alice",
    email: "alice@x",
    username: "alice",
    password: "h",
    emailVerifiedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

const DELETION = {
  requestedAt: new Date("2026-10-01"),
  communityIds: [],
  discussionIds: [],
};

/** Verses of Gn 1 known to the fake corpus. */
const GN_1: Verse[] = [
  fakeVerse(),
  fakeVerse({ _id: "v-gn-1-2", verseNumber: 2, reference: "Gn 1:2" }),
];

function setup(opts: {
  existing?: Comment[];
  /** Every findById returns this user (null = account gone). */
  user?: User | null;
  /** Successive findById results (the gate, then the pre-write re-check). */
  userSequence?: (User | null)[];
  chapter?: (abbrev: string, chapter: number) => Verse[];
} = {}) {
  const existing = opts.existing ?? [];
  const findByUsername = vi.fn().mockResolvedValue(existing);
  const createMany = vi.fn(async (rows: unknown[]) => rows.length);
  const commentRepo = { findByUsername, createMany } as unknown as ICommentRepository;

  const findByAbbrevAndChapter = vi.fn(async (abbrev: string, ch: number) => {
    if (opts.chapter) return opts.chapter(abbrev, ch);
    return abbrev === "gn" && ch === 1 ? GN_1 : [];
  });
  const findByAbbrevChapterVerse = vi.fn();
  const verseRepo = {
    findByAbbrevAndChapter,
    findByAbbrevChapterVerse,
  } as unknown as IVerseRepository;

  const user = opts.user === undefined ? fakeUser() : opts.user;
  const findById = vi.fn(async () => user);
  for (const next of opts.userSequence ?? []) {
    findById.mockResolvedValueOnce(next);
  }
  const userRepo = { findById } as unknown as IUserRepository;

  const useCase = new ImportUserCommentsUseCase(commentRepo, verseRepo, userRepo);
  return {
    useCase,
    commentRepo,
    verseRepo,
    userRepo,
    createMany,
    findByUsername,
    findById,
    findByAbbrevAndChapter,
    findByAbbrevChapterVerse,
  };
}

describe("ImportUserCommentsUseCase", () => {
  it("imports new comments, looking up verseId from bookReference", async () => {
    const { useCase, createMany } = setup();

    const result = await useCase.execute("u-alice", [
      { bookReference: "Gn 1:1", text: "First note", tags: ["devocional"] },
      { bookReference: "Gn 1:2", text: "Second note", tags: [] },
    ]);

    expect(result).toEqual({ imported: 2, skipped: 0, failed: 0 });
    expect(createMany).toHaveBeenCalledWith([
      expect.objectContaining({ verseId: "v-gn-1-1", text: "First note", username: "alice", tags: ["devocional"] }),
      expect.objectContaining({ verseId: "v-gn-1-2", text: "Second note" }),
    ]);
  });

  it("skips a duplicate the user already wrote (idempotency)", async () => {
    const { useCase, createMany } = setup({
      existing: [fakeComment({ verseId: "v-gn-1-1", text: "Already here" })],
    });

    const result = await useCase.execute("u-alice", [
      { bookReference: "Gn 1:1", text: "Already here" },
      { bookReference: "Gn 1:2", text: "Brand new" },
    ]);

    expect(result).toEqual({ imported: 1, skipped: 1, failed: 0 });
    expect(createMany).toHaveBeenCalledWith([
      expect.objectContaining({ verseId: "v-gn-1-2", text: "Brand new" }),
    ]);
  });

  it("dedups within the same import batch", async () => {
    const { useCase, createMany } = setup();

    const result = await useCase.execute("u-alice", [
      { bookReference: "Gn 1:1", text: "Same" },
      { bookReference: "Gn 1:1", text: "Same" }, // dup of row 1
    ]);

    expect(result).toEqual({ imported: 1, skipped: 1, failed: 0 });
    expect(createMany).toHaveBeenCalledWith([
      expect.objectContaining({ text: "Same" }),
    ]);
  });

  it("counts as failed when reference is unparseable", async () => {
    const { useCase, createMany } = setup();

    const result = await useCase.execute("u-alice", [
      { bookReference: "garbage", text: "x" },
      { bookReference: "Gn 1:1", text: "ok" },
    ]);

    expect(result).toEqual({ imported: 1, skipped: 0, failed: 1 });
    expect(createMany).toHaveBeenCalledWith([
      expect.objectContaining({ text: "ok" }),
    ]);
  });

  it("counts as failed when the referenced verse doesn't exist in this DB", async () => {
    const { useCase, createMany } = setup();

    const result = await useCase.execute("u-alice", [
      { bookReference: "Ap 99:99", text: "phantom" },
      { bookReference: "Gn 1:31", text: "verse missing from a known chapter" },
    ]);

    expect(result).toEqual({ imported: 0, skipped: 0, failed: 2 });
    expect(createMany).not.toHaveBeenCalled();
  });

  it("counts as failed when text is blank", async () => {
    const { useCase, createMany } = setup();

    const result = await useCase.execute("u-alice", [
      { bookReference: "Gn 1:1", text: "   " },
    ]);

    expect(result).toEqual({ imported: 0, skipped: 0, failed: 1 });
    expect(createMany).not.toHaveBeenCalled();
  });

  it("noop on empty input", async () => {
    const { useCase, createMany, findByAbbrevAndChapter, findByAbbrevChapterVerse } = setup();

    const result = await useCase.execute("u-alice", []);

    expect(result).toEqual({ imported: 0, skipped: 0, failed: 0 });
    expect(createMany).not.toHaveBeenCalled();
    expect(findByAbbrevAndChapter).not.toHaveBeenCalled();
    expect(findByAbbrevChapterVerse).not.toHaveBeenCalled();
  });

  it("uses the verse's canonical reference when re-creating, not the user's input", async () => {
    // Input "Gn 1:1" resolves to a verse whose canonical reference field is
    // different from what the user typed.
    const { useCase, createMany } = setup({
      chapter: () => [fakeVerse({ reference: "Gn 1:1 (NVI)" })],
    });

    await useCase.execute("u-alice", [
      { bookReference: "Gn 1:1", text: "note" },
    ]);

    expect(createMany).toHaveBeenCalledWith([
      expect.objectContaining({ bookReference: "Gn 1:1 (NVI)" }),
    ]);
  });

  describe("account gate", () => {
    it("rejects an unverified account before touching comments", async () => {
      const { useCase, findByUsername, createMany } = setup({
        user: fakeUser({ emailVerifiedAt: undefined }),
      });

      await expect(
        useCase.execute("u-alice", [{ bookReference: "Gn 1:1", text: "x" }]),
      ).rejects.toBeInstanceOf(EmailNotVerifiedError);
      expect(findByUsername).not.toHaveBeenCalled();
      expect(createMany).not.toHaveBeenCalled();
    });

    it("rejects an unverified account even for an empty file", async () => {
      const { useCase } = setup({ user: fakeUser({ emailVerifiedAt: undefined }) });

      await expect(useCase.execute("u-alice", [])).rejects.toBeInstanceOf(
        EmailNotVerifiedError,
      );
    });

    it.each([
      ["disabled", fakeUser({ disabledAt: new Date(), disabledBy: "mod" })],
      ["being deleted", fakeUser({ deletion: DELETION })],
      ["gone", null],
    ])("rejects an account that is %s with Unauthorized", async (_label, user) => {
      const { useCase, findByUsername, createMany } = setup({ user });

      await expect(
        useCase.execute("u-alice", [{ bookReference: "Gn 1:1", text: "x" }]),
      ).rejects.toThrow("Unauthorized");
      expect(findByUsername).not.toHaveBeenCalled();
      expect(createMany).not.toHaveBeenCalled();
    });

    it("checks the account state before e-mail verification", async () => {
      const { useCase } = setup({
        user: fakeUser({ disabledAt: new Date(), emailVerifiedAt: undefined }),
      });

      await expect(
        useCase.execute("u-alice", [{ bookReference: "Gn 1:1", text: "x" }]),
      ).rejects.toThrow("Unauthorized");
    });

    it("writes under the username stored on the account, not a caller-supplied one", async () => {
      const { useCase, findByUsername, createMany, findById } = setup({
        user: fakeUser({ username: "alice-novo" }),
      });

      await useCase.execute("u-alice", [
        { bookReference: "Gn 1:1", text: "x", username: "someone-else" },
      ]);

      expect(findById).toHaveBeenCalledWith("u-alice");
      expect(findByUsername).toHaveBeenCalledWith("alice-novo");
      expect(createMany).toHaveBeenCalledWith([
        expect.objectContaining({ username: "alice-novo" }),
      ]);
    });

    it("re-checks the account right before writing", async () => {
      const { useCase, createMany, findById } = setup({
        userSequence: [fakeUser(), fakeUser({ deletion: DELETION })],
      });

      await expect(
        useCase.execute("u-alice", [{ bookReference: "Gn 1:1", text: "x" }]),
      ).rejects.toThrow("Unauthorized");
      expect(findById).toHaveBeenCalledTimes(2);
      expect(createMany).not.toHaveBeenCalled();
    });

    it("refuses to write when the account was renamed meanwhile", async () => {
      const { useCase, createMany } = setup({
        userSequence: [fakeUser(), fakeUser({ username: "alice-2" })],
      });

      await expect(
        useCase.execute("u-alice", [{ bookReference: "Gn 1:1", text: "x" }]),
      ).rejects.toThrow("Unauthorized");
      expect(createMany).not.toHaveBeenCalled();
    });

    it("skips the re-check when nothing is left to write", async () => {
      const { useCase, findById } = setup({
        existing: [fakeComment({ text: "dup" })],
      });

      const result = await useCase.execute("u-alice", [
        { bookReference: "Gn 1:1", text: "dup" },
      ]);

      expect(result).toEqual({ imported: 0, skipped: 1, failed: 0 });
      expect(findById).toHaveBeenCalledTimes(1);
    });
  });

  describe("per-row limits", () => {
    it("fails only the rows over a limit and imports the rest", async () => {
      const { useCase, createMany } = setup();

      const result = await useCase.execute("u-alice", [
        { bookReference: "Gn 1:1", text: "a".repeat(5000) },
        { bookReference: "Gn 1:1", text: "b".repeat(5001) },
        { bookReference: "Gn 1:1", text: "twenty tags", tags: Array(20).fill("t".repeat(50)) },
        { bookReference: "Gn 1:1", text: "21 tags", tags: Array(21).fill("t") },
        { bookReference: "Gn 1:1", text: "long tag", tags: ["t".repeat(51)] },
        { bookReference: "Gn " + "1".repeat(196) + ":1", text: "201-char reference" },
        null,
        "x",
        { text: 1, bookReference: "Gn 1:1" },
        { bookReference: "Gn 1:2", text: "ok", tags: "not-an-array" },
      ]);

      expect(result).toEqual({ imported: 2, skipped: 0, failed: 8 });
      const rows = createMany.mock.calls[0][0] as Comment[];
      expect(rows.map((r) => r.text)).toEqual(["a".repeat(5000), "twenty tags"]);
      expect(rows[1].tags).toHaveLength(20);
    });

    it("measures the text limit after trimming and stores the trimmed text", async () => {
      const { useCase, createMany } = setup();

      const result = await useCase.execute("u-alice", [
        { bookReference: "  Gn 1:1  ", text: "  " + "a".repeat(5000) + "  " },
      ]);

      expect(result).toEqual({ imported: 1, skipped: 0, failed: 0 });
      expect(createMany).toHaveBeenCalledWith([
        expect.objectContaining({ text: "a".repeat(5000), tags: [] }),
      ]);
    });

    it("accepts the comment rows of a v2 export file", async () => {
      const { useCase, createMany } = setup();

      const result = await useCase.execute("u-alice", [
        {
          _id: "64b000000000000000000001",
          verseId: "old-verse-id",
          username: "alice",
          bookReference: "Gn 1:1",
          text: "Exportado",
          tags: [],
          onTitle: true,
          communitySlug: null,
          hiddenAt: null,
          likeCount: 3,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ]);

      expect(result).toEqual({ imported: 1, skipped: 0, failed: 0 });
      const [row] = createMany.mock.calls[0][0] as Comment[];
      expect(row).toEqual({
        verseId: "v-gn-1-1",
        username: "alice",
        onTitle: true,
        bookReference: "Gn 1:1",
        text: "Exportado",
        tags: [],
      });
    });
  });

  it("looks each chapter up once, not once per row", async () => {
    const { useCase, findByAbbrevAndChapter, findByAbbrevChapterVerse } = setup();

    await useCase.execute("u-alice", [
      { bookReference: "Gn 1:1", text: "one" },
      { bookReference: "Gn 1:2", text: "two" },
      { bookReference: "Gn 1:1", text: "three" },
    ]);

    expect(findByAbbrevAndChapter).toHaveBeenCalledTimes(1);
    expect(findByAbbrevAndChapter).toHaveBeenCalledWith("gn", 1);
    expect(findByAbbrevChapterVerse).not.toHaveBeenCalled();
  });
});
