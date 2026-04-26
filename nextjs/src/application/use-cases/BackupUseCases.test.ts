import { describe, it, expect } from "vitest";
import { BackupUsersUseCase } from "./BackupUseCases";
import type { IUserRepository } from "@/domain/repositories/IUserRepository";
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
    findAll: async () => users,
    findAllPaginated: async () => users,
    create: async (u) => ({ _id: "new", ...u }),
    updatePassword: async () => {},
    update: async () => null,
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
