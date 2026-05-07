import { describe, it, expect, vi } from "vitest";
import { ImportUserCommentsUseCase } from "./ImportUserCommentsUseCase";
import type { ICommentRepository } from "@/domain/repositories/ICommentRepository";
import type { IVerseRepository } from "@/domain/repositories/IVerseRepository";
import type { Comment } from "@/domain/entities/Comment";
import type { Verse } from "@/domain/entities/Verse";

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

function setup(opts: {
  existing?: Comment[];
  verseLookup?: (abbrev: string, chapter: number, verse: number) => Verse | null;
} = {}) {
  const existing = opts.existing ?? [];
  const findByUsername = vi.fn().mockResolvedValue(existing);
  const createMany = vi.fn(async (rows: unknown[]) => rows.length);
  const commentRepo = { findByUsername, createMany } as unknown as ICommentRepository;

  const findByAbbrevChapterVerse = vi.fn(async (abbrev: string, ch: number, v: number) => {
    if (opts.verseLookup) return opts.verseLookup(abbrev, ch, v);
    if (abbrev === "gn" && ch === 1 && v === 1) return fakeVerse();
    if (abbrev === "gn" && ch === 1 && v === 2) return fakeVerse({ _id: "v-gn-1-2", verseNumber: 2, reference: "Gn 1:2" });
    return null;
  });
  const verseRepo = { findByAbbrevChapterVerse } as unknown as IVerseRepository;

  return { commentRepo, verseRepo, createMany, findByAbbrevChapterVerse };
}

describe("ImportUserCommentsUseCase", () => {
  it("imports new comments, looking up verseId from bookReference", async () => {
    const { commentRepo, verseRepo, createMany } = setup();
    const useCase = new ImportUserCommentsUseCase(commentRepo, verseRepo);

    const result = await useCase.execute("alice", [
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
    const { commentRepo, verseRepo, createMany } = setup({
      existing: [fakeComment({ verseId: "v-gn-1-1", text: "Already here" })],
    });
    const useCase = new ImportUserCommentsUseCase(commentRepo, verseRepo);

    const result = await useCase.execute("alice", [
      { bookReference: "Gn 1:1", text: "Already here" },
      { bookReference: "Gn 1:2", text: "Brand new" },
    ]);

    expect(result).toEqual({ imported: 1, skipped: 1, failed: 0 });
    expect(createMany).toHaveBeenCalledWith([
      expect.objectContaining({ verseId: "v-gn-1-2", text: "Brand new" }),
    ]);
  });

  it("dedups within the same import batch", async () => {
    const { commentRepo, verseRepo, createMany } = setup();
    const useCase = new ImportUserCommentsUseCase(commentRepo, verseRepo);

    const result = await useCase.execute("alice", [
      { bookReference: "Gn 1:1", text: "Same" },
      { bookReference: "Gn 1:1", text: "Same" }, // dup of row 1
    ]);

    expect(result).toEqual({ imported: 1, skipped: 1, failed: 0 });
    expect(createMany).toHaveBeenCalledWith([
      expect.objectContaining({ text: "Same" }),
    ]);
  });

  it("counts as failed when reference is unparseable", async () => {
    const { commentRepo, verseRepo, createMany } = setup();
    const useCase = new ImportUserCommentsUseCase(commentRepo, verseRepo);

    const result = await useCase.execute("alice", [
      { bookReference: "garbage", text: "x" },
      { bookReference: "Gn 1:1", text: "ok" },
    ]);

    expect(result).toEqual({ imported: 1, skipped: 0, failed: 1 });
    expect(createMany).toHaveBeenCalledWith([
      expect.objectContaining({ text: "ok" }),
    ]);
  });

  it("counts as failed when the referenced verse doesn't exist in this DB", async () => {
    const { commentRepo, verseRepo, createMany } = setup();
    const useCase = new ImportUserCommentsUseCase(commentRepo, verseRepo);

    const result = await useCase.execute("alice", [
      { bookReference: "Ap 99:99", text: "phantom" },
    ]);

    expect(result).toEqual({ imported: 0, skipped: 0, failed: 1 });
    expect(createMany).not.toHaveBeenCalled();
  });

  it("counts as failed when text is blank", async () => {
    const { commentRepo, verseRepo, createMany } = setup();
    const useCase = new ImportUserCommentsUseCase(commentRepo, verseRepo);

    const result = await useCase.execute("alice", [
      { bookReference: "Gn 1:1", text: "   " },
    ]);

    expect(result).toEqual({ imported: 0, skipped: 0, failed: 1 });
    expect(createMany).not.toHaveBeenCalled();
  });

  it("noop on empty input", async () => {
    const { commentRepo, verseRepo, createMany, findByAbbrevChapterVerse } = setup();
    const useCase = new ImportUserCommentsUseCase(commentRepo, verseRepo);

    const result = await useCase.execute("alice", []);

    expect(result).toEqual({ imported: 0, skipped: 0, failed: 0 });
    expect(createMany).not.toHaveBeenCalled();
    expect(findByAbbrevChapterVerse).not.toHaveBeenCalled();
  });

  it("uses the verse's canonical reference when re-creating, not the user's input", async () => {
    const { commentRepo, createMany } = setup();
    // Custom lookup: input "Gn 1:1" resolves to a verse whose canonical
    // reference field is different from what the user typed.
    const verseRepo = {
      findByAbbrevChapterVerse: vi.fn(async () => fakeVerse({ reference: "Gn 1:1 (NVI)" })),
    } as unknown as IVerseRepository;
    const useCase = new ImportUserCommentsUseCase(commentRepo, verseRepo);

    await useCase.execute("alice", [
      { bookReference: "Gn 1:1", text: "note" },
    ]);

    expect(createMany).toHaveBeenCalledWith([
      expect.objectContaining({ bookReference: "Gn 1:1 (NVI)" }),
    ]);
  });
});
