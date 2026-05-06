import { describe, it, expect } from "vitest";
import {
  MarkChapterReadUseCase,
  UnmarkChapterReadUseCase,
  GetReadChaptersForBookUseCase,
} from "./MarkChapterReadUseCases";
import type { IUserChapterReadRepository } from "@/domain/repositories/IUserChapterReadRepository";

function inMemoryRepo(): IUserChapterReadRepository {
  const data = new Map<string, { userId: string; abbrev: string; chapter: number; readAt: Date }>();
  const key = (u: string, a: string, c: number) => `${u}::${a.toLowerCase()}::${c}`;
  return {
    async markRead(userId, abbrev, chapter) {
      const k = key(userId, abbrev, chapter);
      if (data.has(k)) return false;
      data.set(k, { userId, abbrev: abbrev.toLowerCase(), chapter, readAt: new Date() });
      return true;
    },
    async unmarkRead(userId, abbrev, chapter) {
      data.delete(key(userId, abbrev, chapter));
    },
    async countByUser(userId) {
      let n = 0;
      for (const v of data.values()) if (v.userId === userId) n++;
      return n;
    },
    async findChaptersForBook(userId, abbrev) {
      const out: number[] = [];
      const target = abbrev.toLowerCase();
      for (const v of data.values()) {
        if (v.userId === userId && v.abbrev === target) out.push(v.chapter);
      }
      return out.sort((a, b) => a - b);
    },
    async countByUserPerBook(userId) {
      const out: Record<string, number> = {};
      for (const v of data.values()) {
        if (v.userId === userId) out[v.abbrev] = (out[v.abbrev] ?? 0) + 1;
      }
      return out;
    },
    async findAllForUser(userId) {
      return [...data.values()].filter((v) => v.userId === userId);
    },
  };
}

describe("MarkChapterReadUseCase", () => {
  it("marks (userId, abbrev, chapter) and returns true on first call", async () => {
    const repo = inMemoryRepo();
    const uc = new MarkChapterReadUseCase(repo);
    expect(await uc.execute("u1", "gn", 1)).toBe(true);
    expect(await repo.countByUser("u1")).toBe(1);
  });

  it("is idempotent — second call returns false and does not duplicate", async () => {
    const repo = inMemoryRepo();
    const uc = new MarkChapterReadUseCase(repo);
    expect(await uc.execute("u1", "gn", 1)).toBe(true);
    expect(await uc.execute("u1", "gn", 1)).toBe(false);
    expect(await repo.countByUser("u1")).toBe(1);
  });

  it("rejects chapter < 1", async () => {
    const uc = new MarkChapterReadUseCase(inMemoryRepo());
    await expect(uc.execute("u1", "gn", 0)).rejects.toThrow();
  });

  it("normalizes abbrev case so 'GN' and 'gn' collide", async () => {
    const repo = inMemoryRepo();
    const uc = new MarkChapterReadUseCase(repo);
    expect(await uc.execute("u1", "GN", 1)).toBe(true);
    expect(await uc.execute("u1", "gn", 1)).toBe(false);
  });
});

describe("UnmarkChapterReadUseCase", () => {
  it("removes the mark", async () => {
    const repo = inMemoryRepo();
    await repo.markRead("u1", "gn", 1);
    await new UnmarkChapterReadUseCase(repo).execute("u1", "gn", 1);
    expect(await repo.countByUser("u1")).toBe(0);
  });

  it("is a no-op if the mark didn't exist", async () => {
    const repo = inMemoryRepo();
    await expect(
      new UnmarkChapterReadUseCase(repo).execute("u1", "gn", 99),
    ).resolves.toBeUndefined();
  });
});

describe("GetReadChaptersForBookUseCase", () => {
  it("returns sorted chapter numbers for the user/book", async () => {
    const repo = inMemoryRepo();
    await repo.markRead("u1", "gn", 3);
    await repo.markRead("u1", "gn", 1);
    await repo.markRead("u1", "gn", 2);
    await repo.markRead("u2", "gn", 5); // other user — must be excluded
    await repo.markRead("u1", "ex", 1); // other book — must be excluded
    const out = await new GetReadChaptersForBookUseCase(repo).execute("u1", "gn");
    expect(out).toEqual([1, 2, 3]);
  });
});
