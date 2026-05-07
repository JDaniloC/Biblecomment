import { describe, it, expect, vi } from "vitest";
import {
  BackupUsersUseCase,
  ImportCommentsUseCase,
  ImportDiscussionsUseCase,
} from "./BackupUseCases";
import type { IUserRepository } from "@/domain/repositories/IUserRepository";
import type { ICommentRepository } from "@/domain/repositories/ICommentRepository";
import type { IDiscussionRepository } from "@/domain/repositories/IDiscussionRepository";
import type { User } from "@/domain/entities/User";

function fakeUser(overrides: Partial<User> = {}): User {
  return {
    _id: "u1",
    email: "alice@example.com",
    username: "alice",
    password: "$2b$12$abcdefghijklmnopqrstuv",
    passwordType: "bcrypt",
    state: "SP",
    belief: "catholic",
    moderator: false,
    ...overrides,
  };
}

function repoReturning(users: User[]): IUserRepository {
  return {
    findByEmail: async () => null,
    findByUsername: async () => null,
    findByUsernames: async () => [],
    findAll: async () => users,
    findAllPaginated: async () => users,
    create: async (u) => ({ _id: "new", ...u }),
    updatePassword: async () => {},
    updatePasswordById: async () => {},
    update: async () => null,
    markTutorialCompleted: async () => {},
    addBadges: async () => [],
    delete: async () => {},
  };
}

describe("BackupUsersUseCase", () => {
  it("strips password and passwordType from every user", async () => {
    const users = [
      fakeUser({ username: "alice", passwordType: "bcrypt" }),
      fakeUser({ username: "bob", passwordType: "md5", password: "5f4dcc3b5aa765d61d8327deb882cf99" }),
    ];
    const useCase = new BackupUsersUseCase(repoReturning(users));

    const result = await useCase.execute();

    expect(result).toHaveLength(2);
    for (const u of result) {
      expect(u).not.toHaveProperty("password");
      expect(u).not.toHaveProperty("passwordType");
    }
    expect(result[0].username).toBe("alice");
    expect(result[1].username).toBe("bob");
  });

  it("preserves all non-credential fields", async () => {
    const useCase = new BackupUsersUseCase(
      repoReturning([fakeUser({ state: "RJ", belief: "atheist", moderator: true })]),
    );

    const [u] = await useCase.execute();

    expect(u.email).toBe("alice@example.com");
    expect(u.username).toBe("alice");
    expect(u.state).toBe("RJ");
    expect(u.belief).toBe("atheist");
    expect(u.moderator).toBe(true);
  });
});

describe("ImportCommentsUseCase", () => {
  it("returns 0 and skips repo call when input is empty", async () => {
    const createMany = vi.fn();
    const repo = { createMany } as unknown as ICommentRepository;
    const useCase = new ImportCommentsUseCase(repo);

    const result = await useCase.execute([]);

    expect(result).toBe(0);
    expect(createMany).not.toHaveBeenCalled();
  });

  it("delegates to createMany once and returns the count", async () => {
    const createMany = vi.fn().mockResolvedValue(3);
    const repo = { createMany } as unknown as ICommentRepository;
    const useCase = new ImportCommentsUseCase(repo);

    const items = [
      { verseId: "v1", username: "a", onTitle: false, bookReference: "Gn 1", text: "x", tags: [] },
      { verseId: "v2", username: "b", onTitle: false, bookReference: "Gn 2", text: "y", tags: [] },
      { verseId: "v3", username: "c", onTitle: false, bookReference: "Gn 3", text: "z", tags: [] },
    ];
    const result = await useCase.execute(items);

    expect(result).toBe(3);
    expect(createMany).toHaveBeenCalledTimes(1);
    expect(createMany).toHaveBeenCalledWith(items);
  });
});

describe("ImportDiscussionsUseCase", () => {
  it("returns 0 and skips repo call when input is empty", async () => {
    const createMany = vi.fn();
    const repo = { createMany } as unknown as IDiscussionRepository;
    const useCase = new ImportDiscussionsUseCase(repo);

    const result = await useCase.execute([]);

    expect(result).toBe(0);
    expect(createMany).not.toHaveBeenCalled();
  });

  it("delegates to createMany once and returns the count", async () => {
    const createMany = vi.fn().mockResolvedValue(2);
    const repo = { createMany } as unknown as IDiscussionRepository;
    const useCase = new ImportDiscussionsUseCase(repo);

    const items = [
      { bookAbbrev: "gn", username: "a", verseReference: "Gn 1", verseText: "", commentText: "", question: "?", answers: [] },
      { bookAbbrev: "ex", username: "b", verseReference: "Ex 1", verseText: "", commentText: "", question: "?", answers: [] },
    ];
    const result = await useCase.execute(items);

    expect(result).toBe(2);
    expect(createMany).toHaveBeenCalledTimes(1);
    expect(createMany).toHaveBeenCalledWith(items);
  });
});
