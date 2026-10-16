import { describe, it, expect, vi } from "vitest";
import bcrypt from "bcryptjs";
import { ChangePasswordUseCase } from "./AuthUseCases";
import type { IUserRepository } from "@/domain/repositories/IUserRepository";
import type { User } from "@/domain/entities/User";

function buildRepo(user: User | null, writeResult: number | null = 3) {
  const order: string[] = [];
  const track = (name: string) =>
    vi.fn(async (..._args: unknown[]): Promise<void> => {
      order.push(name);
    });
  const findByEmail = vi.fn().mockResolvedValue(user);
  const updatePasswordById = vi.fn(async (..._args: unknown[]) => {
    order.push("updatePasswordById");
    return writeResult;
  });
  const clearPendingEmail = track("clearPendingEmail");
  const repo = {
    findByEmail,
    updatePasswordById,
    clearPendingEmail,
  } as unknown as IUserRepository;
  const tokens = {
    passwordReset: { deleteByUserId: track("passwordReset.deleteByUserId") },
  };
  return { repo, findByEmail, updatePasswordById, clearPendingEmail, tokens, order };
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
  it("rotates the password with a compare-and-set on the verified hash", async () => {
    const stored = await bcrypt.hash("old-secret-123", 4);
    const { repo, updatePasswordById, tokens } = buildRepo(fakeUser({ password: stored }));

    const result = await new ChangePasswordUseCase(repo, tokens).execute(
      "alice@example.com",
      "old-secret-123",
      "new-secret-456",
    );

    expect(result).toEqual({ userId: "u1", sessionVersion: 3 });
    expect(updatePasswordById).toHaveBeenCalledTimes(1);
    const [userIdArg, hashArg, optsArg] = updatePasswordById.mock.calls[0] as unknown as [
      string,
      string,
      { expectedHash?: string },
    ];
    expect(userIdArg).toBe("u1");
    expect(optsArg).toEqual({ expectedHash: stored });
    // The new password must verify against the freshly stored hash.
    expect(await bcrypt.compare("new-secret-456", hashArg)).toBe(true);
    // And the previous plaintext must NOT verify against the new hash.
    expect(await bcrypt.compare("old-secret-123", hashArg)).toBe(false);
  });

  it("after the write, revokes the reset links and any pending e-mail change", async () => {
    const stored = await bcrypt.hash("old-secret-123", 4);
    const { repo, clearPendingEmail, tokens, order } = buildRepo(
      fakeUser({ password: stored, pendingEmail: "attacker@example.com" }),
    );

    await new ChangePasswordUseCase(repo, tokens).execute(
      "alice@example.com",
      "old-secret-123",
      "new-secret-456",
    );

    expect(tokens.passwordReset.deleteByUserId).toHaveBeenCalledWith("u1");
    // Clearing pendingEmail is what makes an outstanding change link fail.
    expect(clearPendingEmail).toHaveBeenCalledWith("u1");
    expect(order[0]).toBe("updatePasswordById");
    expect(order.slice(1).sort()).toEqual(
      ["clearPendingEmail", "passwordReset.deleteByUserId"].sort(),
    );
  });

  it("leaves e-mail verification tokens alone, so a first-time verification link keeps working", async () => {
    const stored = await bcrypt.hash("old-secret-123", 4);
    const { repo, tokens } = buildRepo(fakeUser({ password: stored }));
    const emailTokens = { deleteByUserId: vi.fn(), deleteById: vi.fn() };
    // Even if a caller still passes a verification-token repo along, the
    // use case has no reason to touch it.
    const result = await new ChangePasswordUseCase(repo, {
      ...tokens,
      emailVerification: emailTokens,
    } as typeof tokens).execute("alice@example.com", "old-secret-123", "new-secret-456");

    expect(result).toEqual({ userId: "u1", sessionVersion: 3 });
    expect(emailTokens.deleteByUserId).not.toHaveBeenCalled();
    expect(emailTokens.deleteById).not.toHaveBeenCalled();
  });

  it("still succeeds when a cleanup step fails after the write, reporting it as cleanupError", async () => {
    const stored = await bcrypt.hash("old-secret-123", 4);
    const { repo, clearPendingEmail, tokens } = buildRepo(fakeUser({ password: stored }));
    const failure = new Error("Atlas timeout");
    tokens.passwordReset.deleteByUserId.mockRejectedValueOnce(failure);

    const result = await new ChangePasswordUseCase(repo, tokens).execute(
      "alice@example.com",
      "old-secret-123",
      "new-secret-456",
    );

    expect(result).toEqual({ userId: "u1", sessionVersion: 3, cleanupError: failure });
    // The other step still ran.
    expect(clearPendingEmail).toHaveBeenCalledWith("u1");
  });

  it("reports every failed cleanup step when several fail", async () => {
    const stored = await bcrypt.hash("old-secret-123", 4);
    const { repo, clearPendingEmail, tokens } = buildRepo(fakeUser({ password: stored }));
    clearPendingEmail.mockRejectedValueOnce(new Error("pending"));
    tokens.passwordReset.deleteByUserId.mockRejectedValueOnce(new Error("reset"));

    const result = await new ChangePasswordUseCase(repo, tokens).execute(
      "alice@example.com",
      "old-secret-123",
      "new-secret-456",
    );

    expect(result.sessionVersion).toBe(3);
    expect(result.cleanupError).toBeInstanceOf(AggregateError);
    expect((result.cleanupError as AggregateError).errors.map((e: Error) => e.message).sort()).toEqual([
      "pending",
      "reset",
    ]);
  });

  it("rejects when the compare-and-set loses (a reset or another change landed first)", async () => {
    const stored = await bcrypt.hash("old-secret-123", 4);
    const { repo, clearPendingEmail, tokens } = buildRepo(fakeUser({ password: stored }), null);

    await expect(
      new ChangePasswordUseCase(repo, tokens).execute(
        "alice@example.com",
        "old-secret-123",
        "new-secret-456",
      ),
    ).rejects.toThrow("Invalid current password");
    expect(tokens.passwordReset.deleteByUserId).not.toHaveBeenCalled();
    expect(clearPendingEmail).not.toHaveBeenCalled();
  });

  it("throws 'Invalid current password' when bcrypt comparison fails", async () => {
    const stored = await bcrypt.hash("the-real-pass", 4);
    const { repo, updatePasswordById, clearPendingEmail, tokens } = buildRepo(
      fakeUser({ password: stored }),
    );

    await expect(
      new ChangePasswordUseCase(repo, tokens).execute(
        "alice@example.com",
        "wrong-pass",
        "new-pass",
      ),
    ).rejects.toThrow("Invalid current password");
    expect(updatePasswordById).not.toHaveBeenCalled();
    expect(tokens.passwordReset.deleteByUserId).not.toHaveBeenCalled();
    expect(clearPendingEmail).not.toHaveBeenCalled();
  });

  it.each([
    ["disabled", { disabledAt: new Date(), disabledBy: "mod" }],
    [
      "being deleted",
      { deletion: { requestedAt: new Date(), communityIds: [], discussionIds: [] } },
    ],
  ])("rejects a %s account with 'Unauthorized' and writes nothing", async (_label, overrides) => {
    const stored = await bcrypt.hash("old-secret-123", 4);
    const { repo, updatePasswordById, tokens } = buildRepo(
      fakeUser({ password: stored, ...overrides }),
    );

    await expect(
      new ChangePasswordUseCase(repo, tokens).execute(
        "alice@example.com",
        "old-secret-123",
        "new-secret-456",
      ),
    ).rejects.toThrow("Unauthorized");
    expect(updatePasswordById).not.toHaveBeenCalled();
  });

  it("throws 'User not found' when the email doesn't exist", async () => {
    const { repo, tokens } = buildRepo(null);
    await expect(
      new ChangePasswordUseCase(repo, tokens).execute("ghost@example.com", "x", "y"),
    ).rejects.toThrow("User not found");
  });
});
