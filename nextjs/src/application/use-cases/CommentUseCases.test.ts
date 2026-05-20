import { describe, it, expect, vi } from "vitest";
import {
  DeleteCommentUseCase,
  CreateCommentUseCase,
  ListCommunityCommentsUseCase,
} from "./CommentUseCases";
import type { ICommentRepository } from "@/domain/repositories/ICommentRepository";
import type { IVerseRepository } from "@/domain/repositories/IVerseRepository";
import type { ICommunityRepository } from "@/domain/repositories/ICommunityRepository";
import type { ICommunityMembershipRepository } from "@/domain/repositories/ICommunityMembershipRepository";
import type { IUserRepository } from "@/domain/repositories/IUserRepository";
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

describe("ListCommunityCommentsUseCase (plan_community: by approved members)", () => {
  // Helper: minimal community membership + comment repo fakes.
  const mkRepos = (overrides: {
    community?: { _id: string; slug: string } | null;
    approvedUserIds?: string[];
    users?: Array<{ _id: string; username: string }>;
    commentsResult?: { items: Comment[]; total: number };
  }) => {
    const community =
      overrides.community === undefined
        ? { _id: "comm1", slug: "reformados" }
        : overrides.community;
    const findByUsernamesPaginated = vi
      .fn()
      .mockResolvedValue(overrides.commentsResult ?? { items: [], total: 0 });
    return {
      commentRepo: {
        findByUsernamesPaginated,
      } as unknown as ICommentRepository,
      communityRepo: {
        findBySlug: vi.fn().mockResolvedValue(community),
      } as unknown as ICommunityRepository,
      membershipRepo: {
        approvedUserIds: vi
          .fn()
          .mockResolvedValue(overrides.approvedUserIds ?? []),
      } as unknown as ICommunityMembershipRepository,
      userRepo: {
        findManyByIds: vi.fn().mockResolvedValue(overrides.users ?? []),
      } as unknown as IUserRepository,
      findByUsernamesPaginated,
    };
  };

  it("resolves community → approved userIds → usernames → comments", async () => {
    const { commentRepo, communityRepo, membershipRepo, userRepo, findByUsernamesPaginated } =
      mkRepos({
        approvedUserIds: ["u1", "u2"],
        users: [
          { _id: "u1", username: "alice" },
          { _id: "u2", username: "bob" },
        ],
        commentsResult: {
          items: [fakeComment({ _id: "c1", username: "alice" })],
          total: 1,
        },
      });

    const uc = new ListCommunityCommentsUseCase(
      commentRepo,
      communityRepo,
      membershipRepo,
      userRepo,
    );
    const result = await uc.execute("reformados", 1, 20);

    expect(findByUsernamesPaginated).toHaveBeenCalledWith(
      ["alice", "bob"],
      1,
      20,
      undefined,
    );
    expect(result.total).toBe(1);
    expect(result.items[0]?.username).toBe("alice");
  });

  it("returns empty for unknown slug — no membership/user/comment queries", async () => {
    const { commentRepo, communityRepo, membershipRepo, userRepo, findByUsernamesPaginated } =
      mkRepos({ community: null });

    const uc = new ListCommunityCommentsUseCase(
      commentRepo,
      communityRepo,
      membershipRepo,
      userRepo,
    );
    const result = await uc.execute("ghost", 1, 20);

    expect(result).toEqual({ items: [], total: 0 });
    expect(membershipRepo.approvedUserIds).not.toHaveBeenCalled();
    expect(findByUsernamesPaginated).not.toHaveBeenCalled();
  });

  it("returns empty when community has no approved members", async () => {
    const { commentRepo, communityRepo, membershipRepo, userRepo, findByUsernamesPaginated } =
      mkRepos({ approvedUserIds: [] });

    const uc = new ListCommunityCommentsUseCase(
      commentRepo,
      communityRepo,
      membershipRepo,
      userRepo,
    );
    const result = await uc.execute("reformados", 1, 20);

    expect(result).toEqual({ items: [], total: 0 });
    expect(findByUsernamesPaginated).not.toHaveBeenCalled();
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
