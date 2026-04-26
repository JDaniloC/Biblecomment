import { describe, it, expect, vi } from "vitest";
import {
  ListReportedCommentsUseCase,
  ClearReportsUseCase,
  DeleteCommentUseCase,
} from "./CommentUseCases";
import type { ICommentRepository } from "@/domain/repositories/ICommentRepository";
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
    reports: [],
    likes: [],
    ...overrides,
  };
}

describe("ListReportedCommentsUseCase", () => {
  it("delegates to findReported with page and pageSize", async () => {
    const findReported = vi.fn().mockResolvedValue([
      fakeComment({ _id: "c1", reports: ["bob"] }),
      fakeComment({ _id: "c2", reports: ["bob", "carol"] }),
    ]);
    const repo = { findReported } as unknown as ICommentRepository;
    const useCase = new ListReportedCommentsUseCase(repo);

    const result = await useCase.execute(2, 10);

    expect(findReported).toHaveBeenCalledWith(2, 10);
    expect(result).toHaveLength(2);
  });
});

describe("ClearReportsUseCase", () => {
  it("returns the cleared comment on success", async () => {
    const clearReports = vi.fn().mockResolvedValue(fakeComment({ reports: [] }));
    const repo = { clearReports } as unknown as ICommentRepository;
    const useCase = new ClearReportsUseCase(repo);

    const result = await useCase.execute("c1");

    expect(clearReports).toHaveBeenCalledWith("c1");
    expect(result.reports).toEqual([]);
  });

  it("throws 'Comment not found' when repo returns null", async () => {
    const clearReports = vi.fn().mockResolvedValue(null);
    const repo = { clearReports } as unknown as ICommentRepository;
    const useCase = new ClearReportsUseCase(repo);

    await expect(useCase.execute("missing")).rejects.toThrow("Comment not found");
  });
});

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
});
