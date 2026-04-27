import { describe, it, expect, vi } from "vitest";
import { UpdateAnswerUseCase } from "./DiscussionUseCases";
import type { IDiscussionRepository } from "@/domain/repositories/IDiscussionRepository";
import type { Discussion } from "@/domain/entities/Discussion";

function fakeDiscussion(overrides: Partial<Discussion> = {}): Discussion {
  return {
    _id: "d1",
    bookAbbrev: "gn",
    username: "alice",
    verseReference: "Gn 1:1",
    verseText: "",
    commentText: "",
    question: "Why?",
    answers: [
      { _id: "a1", name: "bob", text: "first take" },
      { _id: "a2", name: "carol", text: "second take" },
    ],
    ...overrides,
  };
}

describe("UpdateAnswerUseCase", () => {
  it("lets the answer's owner edit their own text", async () => {
    const findById = vi.fn().mockResolvedValue(fakeDiscussion());
    const updateAnswer = vi.fn().mockResolvedValue(
      fakeDiscussion({
        answers: [
          { _id: "a1", name: "bob", text: "edited by bob" },
          { _id: "a2", name: "carol", text: "second take" },
        ],
      }),
    );
    const repo = { findById, updateAnswer } as unknown as IDiscussionRepository;
    const useCase = new UpdateAnswerUseCase(repo);

    const result = await useCase.execute("d1", "a1", "bob", false, "edited by bob");

    expect(updateAnswer).toHaveBeenCalledWith("d1", "a1", "edited by bob");
    expect(result.answers[0].text).toBe("edited by bob");
  });

  it("lets a moderator edit any answer", async () => {
    const findById = vi.fn().mockResolvedValue(fakeDiscussion());
    const updateAnswer = vi.fn().mockResolvedValue(fakeDiscussion());
    const repo = { findById, updateAnswer } as unknown as IDiscussionRepository;
    const useCase = new UpdateAnswerUseCase(repo);

    await useCase.execute("d1", "a1", "mod", true, "moderator override");

    expect(updateAnswer).toHaveBeenCalledWith("d1", "a1", "moderator override");
  });

  it("rejects edits from someone who isn't the owner or a moderator", async () => {
    const findById = vi.fn().mockResolvedValue(fakeDiscussion());
    const updateAnswer = vi.fn();
    const repo = { findById, updateAnswer } as unknown as IDiscussionRepository;
    const useCase = new UpdateAnswerUseCase(repo);

    await expect(
      useCase.execute("d1", "a1", "attacker", false, "hijack"),
    ).rejects.toThrow("Unauthorized");
    expect(updateAnswer).not.toHaveBeenCalled();
  });

  it("throws 'Discussion not found' when the discussion doesn't exist", async () => {
    const findById = vi.fn().mockResolvedValue(null);
    const updateAnswer = vi.fn();
    const repo = { findById, updateAnswer } as unknown as IDiscussionRepository;
    const useCase = new UpdateAnswerUseCase(repo);

    await expect(
      useCase.execute("missing", "a1", "bob", false, "x"),
    ).rejects.toThrow("Discussion not found");
  });

  it("throws 'Answer not found' when the answer ID doesn't match (e.g. legacy answer with no _id)", async () => {
    const findById = vi.fn().mockResolvedValue(
      fakeDiscussion({ answers: [{ name: "bob", text: "legacy" }] }),
    );
    const updateAnswer = vi.fn();
    const repo = { findById, updateAnswer } as unknown as IDiscussionRepository;
    const useCase = new UpdateAnswerUseCase(repo);

    await expect(
      useCase.execute("d1", "missing-id", "bob", false, "x"),
    ).rejects.toThrow("Answer not found");
  });
});
