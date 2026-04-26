import { describe, it, expect, vi } from "vitest";
import { SetModeratorUseCase, DeleteUserUseCase } from "./UserUseCases";
import type { IUserRepository } from "@/domain/repositories/IUserRepository";
import type { User } from "@/domain/entities/User";

function fakeUser(overrides: Partial<User> = {}): User {
  return {
    _id: "u1",
    email: "alice@example.com",
    username: "alice",
    password: "$2b$12$hash",
    passwordType: "bcrypt",
    moderator: false,
    ...overrides,
  };
}

describe("SetModeratorUseCase", () => {
  it("delegates to repo.update with the new moderator flag and returns the result", async () => {
    const update = vi.fn().mockResolvedValue(fakeUser({ moderator: true }));
    const repo = { update } as unknown as IUserRepository;
    const useCase = new SetModeratorUseCase(repo);

    const result = await useCase.execute("alice@example.com", true);

    expect(update).toHaveBeenCalledWith("alice@example.com", { moderator: true });
    expect(result.moderator).toBe(true);
  });

  it("can demote a moderator", async () => {
    const update = vi.fn().mockResolvedValue(fakeUser({ moderator: false }));
    const repo = { update } as unknown as IUserRepository;
    const useCase = new SetModeratorUseCase(repo);

    const result = await useCase.execute("alice@example.com", false);

    expect(update).toHaveBeenCalledWith("alice@example.com", { moderator: false });
    expect(result.moderator).toBe(false);
  });

  it("throws 'User not found' when the email does not exist", async () => {
    const update = vi.fn().mockResolvedValue(null);
    const repo = { update } as unknown as IUserRepository;
    const useCase = new SetModeratorUseCase(repo);

    await expect(useCase.execute("ghost@example.com", true)).rejects.toThrow("User not found");
  });
});

describe("DeleteUserUseCase", () => {
  it("allows a moderator to delete any user", async () => {
    const findByEmail = vi.fn().mockResolvedValue(fakeUser({ email: "victim@example.com" }));
    const del = vi.fn().mockResolvedValue(undefined);
    const repo = { findByEmail, delete: del } as unknown as IUserRepository;
    const useCase = new DeleteUserUseCase(repo);

    await useCase.execute("mod@example.com", "victim@example.com", true);

    expect(del).toHaveBeenCalledWith("victim@example.com");
  });

  it("allows a regular user to delete only themselves", async () => {
    const findByEmail = vi.fn().mockResolvedValue(fakeUser({ email: "alice@example.com" }));
    const del = vi.fn().mockResolvedValue(undefined);
    const repo = { findByEmail, delete: del } as unknown as IUserRepository;
    const useCase = new DeleteUserUseCase(repo);

    await useCase.execute("alice@example.com", "alice@example.com", false);

    expect(del).toHaveBeenCalledWith("alice@example.com");
  });

  it("throws Unauthorized when a non-moderator targets another user", async () => {
    const findByEmail = vi.fn().mockResolvedValue(fakeUser({ email: "victim@example.com" }));
    const del = vi.fn();
    const repo = { findByEmail, delete: del } as unknown as IUserRepository;
    const useCase = new DeleteUserUseCase(repo);

    await expect(
      useCase.execute("attacker@example.com", "victim@example.com", false),
    ).rejects.toThrow("Unauthorized");
    expect(del).not.toHaveBeenCalled();
  });
});
