import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import {
  RequestPasswordResetUseCase,
  CompletePasswordResetUseCase,
  sha256,
  generateRawToken,
  RESET_TOKEN_TTL_MS,
} from "./PasswordRecoveryUseCases";
import type { IUserRepository } from "@/domain/repositories/IUserRepository";
import type { IPasswordResetTokenRepository } from "@/domain/repositories/IPasswordResetTokenRepository";
import type { User } from "@/domain/entities/User";
import type { PasswordResetToken } from "@/domain/entities/PasswordResetToken";

function fakeUser(overrides: Partial<User> = {}): User {
  return {
    _id: "u1",
    email: "alice@example.com",
    username: "alice",
    password: "$2b$12$hash",
    moderator: false,
    ...overrides,
  };
}

function makeUserRepo(user: User | null = fakeUser()) {
  return {
    findByEmail: vi.fn().mockResolvedValue(user),
    updatePasswordById: vi.fn().mockResolvedValue(undefined),
  } as unknown as IUserRepository;
}

function makeTokenRepo(overrides: Partial<IPasswordResetTokenRepository> = {}) {
  const created: PasswordResetToken[] = [];
  const repo: IPasswordResetTokenRepository = {
    create: vi.fn(async (t) => {
      const doc = { _id: "t-" + (created.length + 1), createdAt: new Date(), ...t };
      created.push(doc);
      return doc;
    }),
    findActiveByHash: vi.fn().mockResolvedValue(null),
    deleteByUserId: vi.fn().mockResolvedValue(undefined),
    deleteById: vi.fn().mockResolvedValue(undefined),
    countRecentByUserId: vi.fn().mockResolvedValue(0),
    ...overrides,
  };
  return { repo, created };
}

function makeEmailer() {
  return {
    sendPasswordReset: vi.fn().mockResolvedValue(undefined),
  };
}

const fixedClock = (t: number) => ({ now: () => t });

describe("RequestPasswordResetUseCase", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a token and sends an email when the user exists", async () => {
    const userRepo = makeUserRepo();
    const { repo: tokenRepo, created } = makeTokenRepo();
    const emailer = makeEmailer();

    const useCase = new RequestPasswordResetUseCase(userRepo, tokenRepo, emailer);
    const sent = await useCase.execute("alice@example.com", "https://app.test");

    expect(sent).toBe(true);
    expect(tokenRepo.deleteByUserId).toHaveBeenCalledWith("u1");
    expect(created).toHaveLength(1);
    expect(created[0].userId).toBe("u1");
    expect(created[0].tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(emailer.sendPasswordReset).toHaveBeenCalledOnce();
    const [to, username, link] = emailer.sendPasswordReset.mock.calls[0];
    expect(to).toBe("alice@example.com");
    expect(username).toBe("alice");
    expect(link).toMatch(/^https:\/\/app\.test\/reset-password\?token=[\w-]+$/);
  });

  it("silently no-ops for an unknown email — no token, no send", async () => {
    const userRepo = makeUserRepo(null);
    const { repo: tokenRepo } = makeTokenRepo();
    const emailer = makeEmailer();

    const useCase = new RequestPasswordResetUseCase(userRepo, tokenRepo, emailer);
    const sent = await useCase.execute("ghost@example.com", "https://app.test");

    expect(sent).toBe(false);
    expect(tokenRepo.create).not.toHaveBeenCalled();
    expect(emailer.sendPasswordReset).not.toHaveBeenCalled();
  });

  it("rate-limits at 3 recent tokens and skips email", async () => {
    const userRepo = makeUserRepo();
    const { repo: tokenRepo } = makeTokenRepo({
      countRecentByUserId: vi.fn().mockResolvedValue(3),
    });
    const emailer = makeEmailer();

    const useCase = new RequestPasswordResetUseCase(userRepo, tokenRepo, emailer);
    const sent = await useCase.execute("alice@example.com", "https://app.test");

    expect(sent).toBe(false);
    expect(tokenRepo.create).not.toHaveBeenCalled();
    expect(emailer.sendPasswordReset).not.toHaveBeenCalled();
  });

  it("invalidates prior tokens before issuing a new one (1-token-per-user policy)", async () => {
    const userRepo = makeUserRepo();
    const { repo: tokenRepo } = makeTokenRepo();
    const useCase = new RequestPasswordResetUseCase(userRepo, tokenRepo, makeEmailer());

    await useCase.execute("alice@example.com", "https://app.test");

    expect(tokenRepo.deleteByUserId).toHaveBeenCalledWith("u1");
  });

  it("computes expiresAt = clock.now() + 30min", async () => {
    const NOW = 1_700_000_000_000;
    const userRepo = makeUserRepo();
    const { repo: tokenRepo, created } = makeTokenRepo();

    const useCase = new RequestPasswordResetUseCase(
      userRepo,
      tokenRepo,
      makeEmailer(),
      fixedClock(NOW),
    );
    await useCase.execute("alice@example.com", "https://app.test");

    expect(created[0].expiresAt.getTime()).toBe(NOW + RESET_TOKEN_TTL_MS);
  });

  it("normalizes the email when looking the user up", async () => {
    const userRepo = makeUserRepo();
    const { repo: tokenRepo } = makeTokenRepo();

    await new RequestPasswordResetUseCase(userRepo, tokenRepo, makeEmailer())
      .execute("  ALICE@Example.com  ", "https://app.test");

    expect(userRepo.findByEmail).toHaveBeenCalledWith("alice@example.com");
  });
});

describe("CompletePasswordResetUseCase", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rotates the password and burns the token on success", async () => {
    const raw = generateRawToken();
    const tokenDoc: PasswordResetToken = {
      _id: "t1",
      userId: "u1",
      tokenHash: sha256(raw),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      createdAt: new Date(),
    };
    const userRepo = makeUserRepo();
    const { repo: tokenRepo } = makeTokenRepo({
      findActiveByHash: vi.fn().mockResolvedValue(tokenDoc),
    });

    const useCase = new CompletePasswordResetUseCase(userRepo, tokenRepo);
    await useCase.execute(raw, "new-secret-123");

    expect(tokenRepo.findActiveByHash).toHaveBeenCalledWith(sha256(raw));
    expect(userRepo.updatePasswordById).toHaveBeenCalledOnce();
    const [userId, hash] = (userRepo.updatePasswordById as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(userId).toBe("u1");
    expect(await bcrypt.compare("new-secret-123", hash)).toBe(true);
    expect(tokenRepo.deleteById).toHaveBeenCalledWith("t1");
  });

  it("rejects passwords shorter than 6 characters without touching repos", async () => {
    const userRepo = makeUserRepo();
    const { repo: tokenRepo } = makeTokenRepo();

    const useCase = new CompletePasswordResetUseCase(userRepo, tokenRepo);
    await expect(useCase.execute("anytoken", "short")).rejects.toThrow(/Senha/);
    expect(tokenRepo.findActiveByHash).not.toHaveBeenCalled();
    expect(userRepo.updatePasswordById).not.toHaveBeenCalled();
  });

  it("rejects an unknown / missing token", async () => {
    const userRepo = makeUserRepo();
    const { repo: tokenRepo } = makeTokenRepo({
      findActiveByHash: vi.fn().mockResolvedValue(null),
    });

    const useCase = new CompletePasswordResetUseCase(userRepo, tokenRepo);
    await expect(useCase.execute("garbage", "new-secret-123")).rejects.toThrow(/inválido|expirado/i);
    expect(userRepo.updatePasswordById).not.toHaveBeenCalled();
  });

  it("rejects an expired token and burns it", async () => {
    const raw = generateRawToken();
    const expired: PasswordResetToken = {
      _id: "t-expired",
      userId: "u1",
      tokenHash: sha256(raw),
      expiresAt: new Date(Date.now() - 1000),
      createdAt: new Date(),
    };
    const userRepo = makeUserRepo();
    const { repo: tokenRepo } = makeTokenRepo({
      findActiveByHash: vi.fn().mockResolvedValue(expired),
    });

    const useCase = new CompletePasswordResetUseCase(userRepo, tokenRepo);
    await expect(useCase.execute(raw, "new-secret-123")).rejects.toThrow(/inválido|expirado/i);
    expect(tokenRepo.deleteById).toHaveBeenCalledWith("t-expired");
    expect(userRepo.updatePasswordById).not.toHaveBeenCalled();
  });
});
