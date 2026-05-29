import { describe, it, expect } from "vitest";
import { CreateDiscussionUseCase } from "./DiscussionUseCases";
import type { IDiscussionRepository } from "@/domain/repositories/IDiscussionRepository";
import type { ICommentRepository } from "@/domain/repositories/ICommentRepository";
import type { IUserRepository } from "@/domain/repositories/IUserRepository";
import type { Discussion } from "@/domain/entities/Discussion";
import type { Comment } from "@/domain/entities/Comment";
import type { User } from "@/domain/entities/User";
import { EmailNotVerifiedError } from "@/lib/auth-guards";

function makeComment(partial: Partial<Comment> = {}): Comment {
  return {
    _id: "c1",
    verseId: "v1",
    username: "alice",
    onTitle: false,
    bookReference: "JO 3:16",
    text: "Porque Deus amou o mundo.",
    tags: [],
    ...partial,
  };
}

function commentRepoStub(comments: Comment[]): ICommentRepository {
  const byId = new Map(comments.map((c) => [c._id ?? "", c]));
  return {
    findById: async (id: string) => byId.get(id) ?? null,
  } as unknown as ICommentRepository;
}

function userRepoStub(verified: boolean): IUserRepository {
  const user = {
    username: "bob",
    email: "b@b.com",
    password: "x",
    emailVerifiedAt: verified ? new Date() : undefined,
  } as unknown as User;
  return {
    findByUsername: async () => user,
  } as unknown as IUserRepository;
}

function capturingDiscussionRepo(): {
  repo: IDiscussionRepository;
  created: Discussion[];
} {
  const created: Discussion[] = [];
  const repo = {
    async create(d: Omit<Discussion, "_id" | "createdAt" | "updatedAt">) {
      const full = {
        ...d,
        _id: "d1",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Discussion;
      created.push(full);
      return full;
    },
  } as unknown as IDiscussionRepository;
  return { repo, created };
}

const base = {
  bookAbbrev: "jo",
  username: "bob",
  commentId: "c1",
  title: "Será que isso é literal?",
  body: "Acho que fala de amor sacrificial.\n\nVejam o contexto.",
};

describe("CreateDiscussionUseCase", () => {
  it("stores the authoritative comment text from the linked comment", async () => {
    const { repo, created } = capturingDiscussionRepo();
    const uc = new CreateDiscussionUseCase(
      repo,
      commentRepoStub([makeComment({ text: "TEXTO REAL DO COMENTÁRIO" })]),
      userRepoStub(true),
    );

    await uc.execute({ ...base });

    expect(created[0].commentText).toBe("TEXTO REAL DO COMENTÁRIO");
    expect(created[0].commentId).toBe("c1");
    expect(created[0].verseReference).toBe("JO 3:16");
  });

  it("maps body to question and preserves line breaks", async () => {
    const { repo, created } = capturingDiscussionRepo();
    const uc = new CreateDiscussionUseCase(
      repo,
      commentRepoStub([makeComment()]),
      userRepoStub(true),
    );

    await uc.execute({ ...base, body: "linha 1\nlinha 2" });

    expect(created[0].question).toBe("linha 1\nlinha 2");
  });

  it("strips line breaks from the title", async () => {
    const { repo, created } = capturingDiscussionRepo();
    const uc = new CreateDiscussionUseCase(
      repo,
      commentRepoStub([makeComment()]),
      userRepoStub(true),
    );

    await uc.execute({ ...base, title: "linha 1\nlinha 2" });

    expect(created[0].title).toBe("linha 1 linha 2");
  });

  it("keeps a valid highlighted excerpt range", async () => {
    const { repo, created } = capturingDiscussionRepo();
    const uc = new CreateDiscussionUseCase(
      repo,
      commentRepoStub([makeComment({ text: "0123456789" })]),
      userRepoStub(true),
    );

    await uc.execute({ ...base, quoteStart: 2, quoteEnd: 5 });

    expect(created[0].quoteStart).toBe(2);
    expect(created[0].quoteEnd).toBe(5);
  });

  it("drops an out-of-range or inverted excerpt range", async () => {
    const { repo, created } = capturingDiscussionRepo();
    const uc = new CreateDiscussionUseCase(
      repo,
      commentRepoStub([makeComment({ text: "short" })]),
      userRepoStub(true),
    );

    await uc.execute({ ...base, quoteStart: 3, quoteEnd: 99 });

    expect(created[0].quoteStart).toBeUndefined();
    expect(created[0].quoteEnd).toBeUndefined();
  });

  it("throws when the linked comment does not exist", async () => {
    const { repo } = capturingDiscussionRepo();
    const uc = new CreateDiscussionUseCase(
      repo,
      commentRepoStub([]),
      userRepoStub(true),
    );

    await expect(uc.execute({ ...base, commentId: "missing" })).rejects.toThrow(
      "Comment not found",
    );
  });

  it("throws when the author's email is not verified", async () => {
    const { repo } = capturingDiscussionRepo();
    const uc = new CreateDiscussionUseCase(
      repo,
      commentRepoStub([makeComment()]),
      userRepoStub(false),
    );

    await expect(uc.execute({ ...base })).rejects.toBeInstanceOf(
      EmailNotVerifiedError,
    );
  });
});
