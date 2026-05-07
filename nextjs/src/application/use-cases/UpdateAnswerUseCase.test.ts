import { describe, it, expect, vi } from "vitest";
import { UpdateAnswerUseCase } from "./DiscussionUseCases";
import type { IDiscussionRepository } from "@/domain/repositories/IDiscussionRepository";
import type { IDiscussionAnswerRepository } from "@/domain/repositories/IDiscussionAnswerRepository";
import type { Discussion } from "@/domain/entities/Discussion";
import type { DiscussionAnswer } from "@/domain/entities/DiscussionAnswer";

function fakeDiscussion(overrides: Partial<Discussion> = {}): Discussion {
  return {
    _id: "d1",
    bookAbbrev: "gn",
    username: "alice",
    verseReference: "Gn 1:1",
    verseText: "",
    commentText: "",
    question: "Why?",
    ...overrides,
  };
}

function fakeAnswer(overrides: Partial<DiscussionAnswer> = {}): DiscussionAnswer {
  return {
    _id: "a1",
    discussionId: "d1",
    userId: "u-bob",
    username: "bob",
    text: "first take",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function answerRepoStub(
  overrides: Partial<IDiscussionAnswerRepository> = {},
): IDiscussionAnswerRepository {
  return {
    add: async () => ({} as never),
    update: async () => null,
    findById: async () => null,
    findByDiscussion: async () => [],
    countByDiscussion: async () => new Map(),
    findByUser: async () => [],
    userHasAnsweredAny: async () => false,
    anonymizeByUser: async () => 0,
    deleteByDiscussion: async () => 0,
    ...overrides,
  };
}

describe("UpdateAnswerUseCase", () => {
  it("lets the answer's owner edit their own text (matched by userId)", async () => {
    const findById = vi.fn().mockResolvedValue(fakeDiscussion());
    const repo = { findById } as unknown as IDiscussionRepository;
    const update = vi.fn().mockResolvedValue(fakeAnswer({ text: "edited by bob" }));
    const findAnswer = vi.fn().mockResolvedValue(fakeAnswer());
    const findByDiscussion = vi
      .fn()
      .mockResolvedValue([fakeAnswer({ text: "edited by bob" })]);
    const answerRepo = answerRepoStub({
      findById: findAnswer,
      update,
      findByDiscussion,
    });

    const useCase = new UpdateAnswerUseCase(repo, answerRepo);
    const result = await useCase.execute("d1", "a1", "u-bob", "bob", false, "edited by bob");

    expect(update).toHaveBeenCalledWith("a1", "edited by bob");
    expect(result.answers?.[0].text).toBe("edited by bob");
  });

  it("lets a moderator edit any answer", async () => {
    const findById = vi.fn().mockResolvedValue(fakeDiscussion());
    const repo = { findById } as unknown as IDiscussionRepository;
    const update = vi.fn().mockResolvedValue(fakeAnswer({ text: "mod override" }));
    const answerRepo = answerRepoStub({
      findById: async () => fakeAnswer(),
      update,
      findByDiscussion: async () => [fakeAnswer({ text: "mod override" })],
    });

    const useCase = new UpdateAnswerUseCase(repo, answerRepo);
    await useCase.execute("d1", "a1", "u-mod", "mod", true, "mod override");

    expect(update).toHaveBeenCalledWith("a1", "mod override");
  });

  it("rejects edits from someone who isn't the owner or a moderator", async () => {
    const findById = vi.fn().mockResolvedValue(fakeDiscussion());
    const repo = { findById } as unknown as IDiscussionRepository;
    const update = vi.fn();
    const answerRepo = answerRepoStub({
      findById: async () => fakeAnswer(),
      update,
    });

    const useCase = new UpdateAnswerUseCase(repo, answerRepo);
    await expect(
      useCase.execute("d1", "a1", "u-attacker", "attacker", false, "hijack"),
    ).rejects.toThrow("Unauthorized");
    expect(update).not.toHaveBeenCalled();
  });

  it("throws 'Discussion not found' when the discussion doesn't exist", async () => {
    const findById = vi.fn().mockResolvedValue(null);
    const repo = { findById } as unknown as IDiscussionRepository;
    const useCase = new UpdateAnswerUseCase(repo, answerRepoStub());

    await expect(
      useCase.execute("missing", "a1", "u-bob", "bob", false, "x"),
    ).rejects.toThrow("Discussion not found");
  });

  it("throws 'Answer not found' when the answer ID doesn't match", async () => {
    const findById = vi.fn().mockResolvedValue(fakeDiscussion());
    const repo = { findById } as unknown as IDiscussionRepository;
    const answerRepo = answerRepoStub({ findById: async () => null });

    const useCase = new UpdateAnswerUseCase(repo, answerRepo);
    await expect(
      useCase.execute("d1", "missing-id", "u-bob", "bob", false, "x"),
    ).rejects.toThrow("Answer not found");
  });

  it("rejects when the answer belongs to a sibling discussion", async () => {
    const findById = vi.fn().mockResolvedValue(fakeDiscussion());
    const repo = { findById } as unknown as IDiscussionRepository;
    const answerRepo = answerRepoStub({
      findById: async () => fakeAnswer({ discussionId: "other" }),
    });

    const useCase = new UpdateAnswerUseCase(repo, answerRepo);
    await expect(
      useCase.execute("d1", "a1", "u-bob", "bob", false, "x"),
    ).rejects.toThrow("Answer not found");
  });
});
