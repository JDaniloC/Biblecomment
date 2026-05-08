import { describe, it, expect } from "vitest";
import {
  AddAnswerUseCase,
  GetDiscussionByIdUseCase,
  GetAllDiscussionsPaginatedUseCase,
  DeleteDiscussionUseCase,
} from "./DiscussionUseCases";
import type { IDiscussionRepository } from "@/domain/repositories/IDiscussionRepository";
import type { IDiscussionAnswerRepository } from "@/domain/repositories/IDiscussionAnswerRepository";
import type { Discussion } from "@/domain/entities/Discussion";
import type { DiscussionAnswer } from "@/domain/entities/DiscussionAnswer";

function fakeDiscussion(id: string, partial: Partial<Discussion> = {}): Discussion {
  return {
    _id: id,
    bookAbbrev: "gn",
    username: "alice",
    verseReference: "Gn 1:1",
    verseText: "",
    commentText: "",
    question: "?",
    ...partial,
  };
}

function discussionRepoStub(discussions: Discussion[]): IDiscussionRepository {
  const byId = new Map(discussions.map((d) => [d._id ?? "", d]));
  return {
    findById: async (id: string) => byId.get(id) ?? null,
    findManyByIds: async (ids: string[]) => ids.map((i) => byId.get(i)).filter((d): d is Discussion => Boolean(d)),
    findAllPaginated: async () => discussions,
    findByBookAbbrev: async () => discussions,
    findAll: async () => discussions,
    create: async (d) => ({ _id: "new", ...d }) as Discussion,
    createMany: async () => discussions.length,
    delete: async () => {},
    anonymizeByUsername: async () => 0,
    userHasOpenedDiscussion: async () => discussions.length > 0,
  };
}

function inMemoryAnswerRepo(): IDiscussionAnswerRepository {
  let nextId = 1;
  const rows: DiscussionAnswer[] = [];
  return {
    async add({ discussionId, userId, username, text }) {
      const row: DiscussionAnswer = {
        _id: `a${nextId++}`,
        discussionId,
        userId,
        username,
        text,
        createdAt: new Date(Date.now() + nextId),
        updatedAt: new Date(Date.now() + nextId),
      };
      rows.push(row);
      return row;
    },
    async update(answerId, text) {
      const row = rows.find((r) => r._id === answerId);
      if (!row) return null;
      row.text = text;
      row.updatedAt = new Date();
      return row;
    },
    async findById(answerId) {
      return rows.find((r) => r._id === answerId) ?? null;
    },
    async findByDiscussion(discussionId) {
      return rows
        .filter((r) => r.discussionId === discussionId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    },
    async countByDiscussion(ids) {
      const out = new Map<string, number>();
      for (const id of ids) {
        const n = rows.filter((r) => r.discussionId === id).length;
        if (n > 0) out.set(id, n);
      }
      return out;
    },
    async findByUser(userId) {
      return rows.filter((r) => r.userId === userId);
    },
    async userHasAnsweredAny(userId) {
      return rows.some((r) => r.userId === userId);
    },
    async latestPerDiscussion() {
      return [];
    },
    async anonymizeByUser(userId, replacement) {
      let n = 0;
      for (const r of rows) if (r.userId === userId) { r.username = replacement; n++; }
      return n;
    },
    async deleteByDiscussion(discussionId) {
      const before = rows.length;
      for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i].discussionId === discussionId) rows.splice(i, 1);
      }
      return before - rows.length;
    },
  };
}

describe("AddAnswerUseCase", () => {
  it("appends an answer and returns the discussion with the full answers list + count", async () => {
    const repo = discussionRepoStub([fakeDiscussion("d1")]);
    const answers = inMemoryAnswerRepo();
    const uc = new AddAnswerUseCase(repo, answers);

    const result = await uc.execute("d1", "u-bob", "bob", "first answer");

    expect(result.answersCount).toBe(1);
    expect(result.answers?.[0]).toMatchObject({ username: "bob", text: "first answer" });
  });

  it("rejects when the discussion is missing", async () => {
    const repo = discussionRepoStub([]);
    const uc = new AddAnswerUseCase(repo, inMemoryAnswerRepo());

    await expect(uc.execute("missing", "u-bob", "bob", "x")).rejects.toThrow("Discussion not found");
  });
});

describe("GetDiscussionByIdUseCase", () => {
  it("hydrates answers when the answer repo is wired", async () => {
    const repo = discussionRepoStub([fakeDiscussion("d1")]);
    const answers = inMemoryAnswerRepo();
    await answers.add({ discussionId: "d1", userId: "u1", username: "x", text: "older" });
    await answers.add({ discussionId: "d1", userId: "u2", username: "y", text: "newer" });

    const result = await new GetDiscussionByIdUseCase(repo, answers).execute("d1");

    expect(result?.answersCount).toBe(2);
    expect(result?.answers?.map((a) => a.text)).toEqual(["older", "newer"]);
  });

  it("returns the bare discussion when no answer repo is provided", async () => {
    const repo = discussionRepoStub([fakeDiscussion("d1")]);

    const result = await new GetDiscussionByIdUseCase(repo).execute("d1");

    expect(result?._id).toBe("d1");
    expect(result?.answers).toBeUndefined();
  });

  it("returns null when the discussion does not exist", async () => {
    const repo = discussionRepoStub([]);
    const answers = inMemoryAnswerRepo();

    const result = await new GetDiscussionByIdUseCase(repo, answers).execute("missing");

    expect(result).toBeNull();
  });
});

describe("GetAllDiscussionsPaginatedUseCase", () => {
  it("populates answersCount via batch aggregation", async () => {
    const discussions = [fakeDiscussion("d1"), fakeDiscussion("d2"), fakeDiscussion("d3")];
    const repo = discussionRepoStub(discussions);
    const answers = inMemoryAnswerRepo();
    await answers.add({ discussionId: "d1", userId: "u1", username: "x", text: "a" });
    await answers.add({ discussionId: "d1", userId: "u2", username: "y", text: "b" });
    await answers.add({ discussionId: "d3", userId: "u1", username: "x", text: "c" });

    const result = await new GetAllDiscussionsPaginatedUseCase(repo, answers).execute(1, 50);

    const counts = Object.fromEntries(result.map((d) => [d._id, d.answersCount]));
    expect(counts).toEqual({ d1: 2, d2: 0, d3: 1 });
  });
});

describe("DeleteDiscussionUseCase cascade", () => {
  it("deletes answers when the discussion is hard-deleted", async () => {
    const repo = discussionRepoStub([fakeDiscussion("d1")]);
    const answers = inMemoryAnswerRepo();
    await answers.add({ discussionId: "d1", userId: "u1", username: "x", text: "a" });
    await answers.add({ discussionId: "d2", userId: "u1", username: "x", text: "kept" });

    await new DeleteDiscussionUseCase(repo, answers).execute("d1", "alice", false);

    expect(await answers.findByDiscussion("d1")).toEqual([]);
    expect(await answers.findByDiscussion("d2")).toHaveLength(1);
  });
});
