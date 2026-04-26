import { describe, it, expect, vi } from "vitest";
import { CreateVerseUseCase, UpdateVerseUseCase } from "./VerseUseCases";
import type { IVerseRepository } from "@/domain/repositories/IVerseRepository";
import type { Verse } from "@/domain/entities/Verse";

function fakeVerse(overrides: Partial<Verse> = {}): Verse {
  return {
    _id: "v1",
    reference: "Gn 1:1",
    abbrev: "gn",
    chapter: 1,
    verseNumber: 1,
    text: "No princípio…",
    ...overrides,
  };
}

describe("CreateVerseUseCase", () => {
  it("creates the verse when no duplicate exists", async () => {
    const findByAbbrevChapterVerse = vi.fn().mockResolvedValue(null);
    const create = vi.fn().mockResolvedValue(fakeVerse());
    const repo = { findByAbbrevChapterVerse, create } as unknown as IVerseRepository;
    const useCase = new CreateVerseUseCase(repo);

    const result = await useCase.execute({
      abbrev: "gn",
      chapter: 1,
      verseNumber: 1,
      text: "No princípio…",
    });

    expect(create).toHaveBeenCalledTimes(1);
    expect(result.abbrev).toBe("gn");
  });

  it("throws when (abbrev, chapter, verseNumber) already exists", async () => {
    const findByAbbrevChapterVerse = vi.fn().mockResolvedValue(fakeVerse());
    const create = vi.fn();
    const repo = { findByAbbrevChapterVerse, create } as unknown as IVerseRepository;
    const useCase = new CreateVerseUseCase(repo);

    await expect(
      useCase.execute({ abbrev: "gn", chapter: 1, verseNumber: 1, text: "x" }),
    ).rejects.toThrow("Verse already exists");
    expect(create).not.toHaveBeenCalled();
  });
});

describe("UpdateVerseUseCase", () => {
  it("delegates to repo.update and returns the updated verse", async () => {
    const update = vi.fn().mockResolvedValue(fakeVerse({ text: "edited" }));
    const repo = { update } as unknown as IVerseRepository;
    const useCase = new UpdateVerseUseCase(repo);

    const result = await useCase.execute("v1", { text: "edited" });

    expect(update).toHaveBeenCalledWith("v1", { text: "edited" });
    expect(result.text).toBe("edited");
  });

  it("throws 'Verse not found' when repo returns null", async () => {
    const update = vi.fn().mockResolvedValue(null);
    const repo = { update } as unknown as IVerseRepository;
    const useCase = new UpdateVerseUseCase(repo);

    await expect(useCase.execute("missing", { text: "x" })).rejects.toThrow("Verse not found");
  });
});
