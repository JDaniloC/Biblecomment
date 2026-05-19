import { describe, it, expect, vi } from "vitest";
import { DeleteCommentUseCase, CreateCommentUseCase } from "./CommentUseCases";
import type { ICommentRepository } from "@/domain/repositories/ICommentRepository";
import type { IVerseRepository } from "@/domain/repositories/IVerseRepository";
import type { Comment } from "@/domain/entities/Comment";

function fakeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    _id: "c1",
    verseId: "v1",
    username: "alice",
    onTitle: false,
    bookReference: "Gn 1",
    text: "comment",
    tags: [],
    ...overrides,
  };
}

describe("DeleteCommentUseCase", () => {
  it("allows the owner to delete their own comment", async () => {
    const findById = vi.fn().mockResolvedValue(fakeComment({ username: "alice" }));
    const del = vi.fn().mockResolvedValue(undefined);
    const repo = { findById, delete: del } as unknown as ICommentRepository;
    const useCase = new DeleteCommentUseCase(repo);

    await useCase.execute("c1", "alice", false);

    expect(del).toHaveBeenCalledWith("c1");
  });

  it("allows a moderator to delete anyone's comment", async () => {
    const findById = vi.fn().mockResolvedValue(fakeComment({ username: "alice" }));
    const del = vi.fn().mockResolvedValue(undefined);
    const repo = { findById, delete: del } as unknown as ICommentRepository;
    const useCase = new DeleteCommentUseCase(repo);

    await useCase.execute("c1", "mod", true);

    expect(del).toHaveBeenCalledWith("c1");
  });

  it("rejects non-owner non-moderator", async () => {
    const findById = vi.fn().mockResolvedValue(fakeComment({ username: "alice" }));
    const del = vi.fn();
    const repo = { findById, delete: del } as unknown as ICommentRepository;
    const useCase = new DeleteCommentUseCase(repo);

    await expect(useCase.execute("c1", "attacker", false)).rejects.toThrow("Unauthorized");
    expect(del).not.toHaveBeenCalled();
  });

  it("cascades likes + reports cleanup when those repos are passed", async () => {
    const findById = vi.fn().mockResolvedValue(fakeComment());
    const del = vi.fn().mockResolvedValue(undefined);
    const repo = { findById, delete: del } as unknown as ICommentRepository;
    const likeCascade = vi.fn().mockResolvedValue(0);
    const reportCascade = vi.fn().mockResolvedValue(0);
    const useCase = new DeleteCommentUseCase(
      repo,
      { deleteAllByComment: likeCascade } as never,
      { deleteAllByComment: reportCascade } as never,
    );

    await useCase.execute("c1", "alice", false);

    expect(del).toHaveBeenCalledWith("c1");
    expect(likeCascade).toHaveBeenCalledWith("c1");
    expect(reportCascade).toHaveBeenCalledWith("c1");
  });
});

describe("CreateCommentUseCase (plan_community: no community gate)", () => {
  it("a non-member can comment and no communitySlug is written", async () => {
    const create = vi.fn(
      async (input: Partial<Comment>) => fakeComment({ ...input, _id: "new" }),
    );
    const commentRepo = { create } as unknown as ICommentRepository;
    const verseRepo = {
      findById: vi.fn().mockResolvedValue({
        _id: "v1",
        abbrev: "gn",
        chapter: 1,
        verseNumber: 1,
        reference: "Gn 1:1",
      }),
    } as unknown as IVerseRepository;

    const uc = new CreateCommentUseCase(commentRepo, verseRepo);
    const c = await uc.execute({
      verseId: "v1",
      username: "stranger",
      text: "olá",
      tags: [],
    });

    const arg = create.mock.calls[0][0] as Partial<Comment>;
    expect(arg.communitySlug).toBeUndefined();
    expect(c.communitySlug).toBeUndefined();
    expect(arg.username).toBe("stranger");
  });
});
