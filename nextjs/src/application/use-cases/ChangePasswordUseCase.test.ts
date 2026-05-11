import { describe, it, expect, vi } from "vitest";
import bcrypt from "bcryptjs";
import { ChangePasswordUseCase } from "./AuthUseCases";
import type { IUserRepository } from "@/domain/repositories/IUserRepository";
import type { User } from "@/domain/entities/User";

function buildRepo(user: User | null) {
  const findByEmail = vi.fn().mockResolvedValue(user);
  const updatePassword = vi.fn().mockResolvedValue(undefined);
  const repo = {
    findByEmail,
    updatePassword,
  } as unknown as IUserRepository;
  return { repo, findByEmail, updatePassword };
}

function fakeUser(overrides: Partial<User> = {}): User {
  return {
    _id: "u1",
    email: "alice@example.com",
    username: "alice",
    password: "ignored — overridden by tests",
    moderator: false,
    ...overrides,
  };
}

describe("ChangePasswordUseCase", () => {
  it("rotates a bcrypt user's password to a fresh bcrypt hash", async () => {
    const stored = await bcrypt.hash("old-secret-123", 4);
    const { repo, updatePassword } = buildRepo(
      fakeUser({ password: stored }),
    );

    await new ChangePasswordUseCase(repo).execute(
      "alice@example.com",
      "old-secret-123",
      "new-secret-456",
    );

    expect(updatePassword).toHaveBeenCalledTimes(1);
    const [emailArg, hashArg] = updatePassword.mock.calls[0];
    expect(emailArg).toBe("alice@example.com");
    // The new password must verify against the freshly stored hash.
    expect(await bcrypt.compare("new-secret-456", hashArg)).toBe(true);
    // And the previous plaintext must NOT verify against the new hash.
    expect(await bcrypt.compare("old-secret-123", hashArg)).toBe(false);
  });

  it("throws 'Invalid current password' when bcrypt comparison fails", async () => {
    const stored = await bcrypt.hash("the-real-pass", 4);
    const { repo, updatePassword } = buildRepo(
      fakeUser({ password: stored }),
    );

    await expect(
      new ChangePasswordUseCase(repo).execute(
        "alice@example.com",
        "wrong-pass",
        "new-pass",
      ),
    ).rejects.toThrow("Invalid current password");
    expect(updatePassword).not.toHaveBeenCalled();
  });

  it("throws 'User not found' when the email doesn't exist", async () => {
    const { repo } = buildRepo(null);
    await expect(
      new ChangePasswordUseCase(repo).execute("ghost@example.com", "x", "y"),
    ).rejects.toThrow("User not found");
  });
});
