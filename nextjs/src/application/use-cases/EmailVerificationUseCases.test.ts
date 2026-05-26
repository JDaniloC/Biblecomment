import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  RequestEmailVerificationUseCase,
  ConfirmEmailVerificationUseCase,
  RequestEmailChangeUseCase,
  generateRawToken,
  sha256,
  VERIFY_TOKEN_TTL_MS,
  VERIFY_RATE_LIMIT_PER_USER,
} from "./EmailVerificationUseCases";
import type { IUserRepository } from "@/domain/repositories/IUserRepository";
import type { IEmailVerificationTokenRepository } from "@/domain/repositories/IEmailVerificationTokenRepository";
import type { User } from "@/domain/entities/User";
import type { EmailVerificationToken } from "@/domain/entities/EmailVerificationToken";

function fakeUser(o: Partial<User> = {}): User {
  return {
    _id: "u1",
    email: "alice@example.com",
    username: "alice",
    password: "hash",
    ...o,
  };
}

function makeUserRepo(user: User | null = fakeUser()) {
  return {
    findById: vi.fn().mockResolvedValue(user),
    setEmailVerified: vi.fn().mockResolvedValue(undefined),
    setPendingEmail: vi.fn().mockResolvedValue(undefined),
    clearPendingEmail: vi.fn().mockResolvedValue(undefined),
    promotePendingEmail: vi.fn().mockResolvedValue(undefined),
    findByEmailOrPendingEmail: vi.fn().mockResolvedValue(null),
  } as unknown as IUserRepository;
}

function makeTokenRepo(overrides: Partial<IEmailVerificationTokenRepository> = {}) {
  const created: EmailVerificationToken[] = [];
  const repo: IEmailVerificationTokenRepository = {
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
  return { sendEmailVerification: vi.fn().mockResolvedValue(undefined) };
}

describe("RequestEmailVerificationUseCase", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends a token to the user's current email when unverified and no pendingEmail", async () => {
    const userRepo = makeUserRepo(fakeUser());
    const { repo: tokenRepo, created } = makeTokenRepo();
    const emailer = makeEmailer();

    const uc = new RequestEmailVerificationUseCase(userRepo, tokenRepo, emailer);
    const sent = await uc.execute("u1", "https://app.test");

    expect(sent).toBe(true);
    expect(tokenRepo.deleteByUserId).toHaveBeenCalledWith("u1");
    expect(created).toHaveLength(1);
    expect(created[0].email).toBe("alice@example.com");
    expect(created[0].tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(emailer.sendEmailVerification).toHaveBeenCalledOnce();
    const [to, _username, link] = emailer.sendEmailVerification.mock.calls[0];
    expect(to).toBe("alice@example.com");
    expect(link).toMatch(/^https:\/\/app\.test\/verify-email\?token=[\w-]+$/);
  });

  it("sends to pendingEmail when one is set", async () => {
    const userRepo = makeUserRepo(
      fakeUser({ pendingEmail: "new@example.com", emailVerifiedAt: new Date() }),
    );
    const { repo: tokenRepo, created } = makeTokenRepo();
    const emailer = makeEmailer();

    const uc = new RequestEmailVerificationUseCase(userRepo, tokenRepo, emailer);
    await uc.execute("u1", "https://app.test");

    expect(created[0].email).toBe("new@example.com");
    expect(emailer.sendEmailVerification.mock.calls[0][0]).toBe("new@example.com");
  });

  it("is a no-op when already verified and no pending change", async () => {
    const userRepo = makeUserRepo(
      fakeUser({ emailVerifiedAt: new Date() }),
    );
    const { repo: tokenRepo } = makeTokenRepo();
    const emailer = makeEmailer();

    const uc = new RequestEmailVerificationUseCase(userRepo, tokenRepo, emailer);
    const sent = await uc.execute("u1", "https://app.test");

    expect(sent).toBe(false);
    expect(tokenRepo.create).not.toHaveBeenCalled();
    expect(emailer.sendEmailVerification).not.toHaveBeenCalled();
  });

  it("rate-limits when >= VERIFY_RATE_LIMIT_PER_USER recent tokens exist", async () => {
    const userRepo = makeUserRepo();
    const { repo: tokenRepo } = makeTokenRepo({
      countRecentByUserId: vi.fn().mockResolvedValue(VERIFY_RATE_LIMIT_PER_USER),
    });
    const emailer = makeEmailer();

    const uc = new RequestEmailVerificationUseCase(userRepo, tokenRepo, emailer);
    const sent = await uc.execute("u1", "https://app.test");

    expect(sent).toBe(false);
    expect(tokenRepo.create).not.toHaveBeenCalled();
    expect(emailer.sendEmailVerification).not.toHaveBeenCalled();
  });

  it("deletes prior tokens before issuing a new one", async () => {
    const userRepo = makeUserRepo();
    const { repo: tokenRepo } = makeTokenRepo();
    const uc = new RequestEmailVerificationUseCase(userRepo, tokenRepo, makeEmailer());
    await uc.execute("u1", "https://app.test");
    expect(tokenRepo.deleteByUserId).toHaveBeenCalledWith("u1");
  });

  it("rejects disabled users (no send, no token)", async () => {
    const userRepo = makeUserRepo(fakeUser({ disabledAt: new Date() }));
    const { repo: tokenRepo } = makeTokenRepo();
    const emailer = makeEmailer();
    const uc = new RequestEmailVerificationUseCase(userRepo, tokenRepo, emailer);
    const sent = await uc.execute("u1", "https://app.test");
    expect(sent).toBe(false);
    expect(tokenRepo.create).not.toHaveBeenCalled();
    expect(emailer.sendEmailVerification).not.toHaveBeenCalled();
  });

  it("uses TTL = 24h", async () => {
    expect(VERIFY_TOKEN_TTL_MS).toBe(24 * 60 * 60 * 1000);
  });
});

describe("ConfirmEmailVerificationUseCase", () => {
  beforeEach(() => vi.clearAllMocks());

  function activeToken(raw: string, overrides: Partial<EmailVerificationToken> = {}): EmailVerificationToken {
    return {
      _id: "t1",
      userId: "u1",
      email: "alice@example.com",
      tokenHash: sha256(raw),
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      ...overrides,
    };
  }

  it("stamps emailVerifiedAt when token.email matches user.email", async () => {
    const raw = generateRawToken();
    const userRepo = makeUserRepo(fakeUser());
    const { repo: tokenRepo } = makeTokenRepo({
      findActiveByHash: vi.fn().mockResolvedValue(activeToken(raw)),
    });

    const uc = new ConfirmEmailVerificationUseCase(userRepo, tokenRepo);
    await uc.execute(raw);

    expect(userRepo.setEmailVerified).toHaveBeenCalledOnce();
    const [uid, when] = (userRepo.setEmailVerified as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(uid).toBe("u1");
    expect(when).toBeInstanceOf(Date);
    expect(userRepo.promotePendingEmail).not.toHaveBeenCalled();
    expect(tokenRepo.deleteById).toHaveBeenCalledWith("t1");
  });

  it("promotes pendingEmail when token.email matches user.pendingEmail", async () => {
    const raw = generateRawToken();
    const userRepo = makeUserRepo(
      fakeUser({ pendingEmail: "new@example.com", emailVerifiedAt: new Date() }),
    );
    const { repo: tokenRepo } = makeTokenRepo({
      findActiveByHash: vi.fn().mockResolvedValue(activeToken(raw, { email: "new@example.com" })),
    });

    const uc = new ConfirmEmailVerificationUseCase(userRepo, tokenRepo);
    await uc.execute(raw);

    expect(userRepo.promotePendingEmail).toHaveBeenCalledOnce();
    const [uid] = (userRepo.promotePendingEmail as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(uid).toBe("u1");
    expect(userRepo.setEmailVerified).not.toHaveBeenCalled();
    expect(tokenRepo.deleteById).toHaveBeenCalledWith("t1");
  });

  it("rejects TOKEN_STALE when token.email matches neither current nor pending", async () => {
    const raw = generateRawToken();
    const userRepo = makeUserRepo(
      fakeUser({ pendingEmail: "newer@example.com" }),
    );
    const { repo: tokenRepo } = makeTokenRepo({
      findActiveByHash: vi.fn().mockResolvedValue(activeToken(raw, { email: "stale@example.com" })),
    });

    const uc = new ConfirmEmailVerificationUseCase(userRepo, tokenRepo);
    await expect(uc.execute(raw)).rejects.toThrow(/expirado|inv[áa]lido|TOKEN_STALE/i);
    expect(tokenRepo.deleteById).toHaveBeenCalledWith("t1");
    expect(userRepo.setEmailVerified).not.toHaveBeenCalled();
    expect(userRepo.promotePendingEmail).not.toHaveBeenCalled();
  });

  it("rejects an expired token and burns it", async () => {
    const raw = generateRawToken();
    const expired = activeToken(raw, { expiresAt: new Date(Date.now() - 1000) });
    const userRepo = makeUserRepo();
    const { repo: tokenRepo } = makeTokenRepo({
      findActiveByHash: vi.fn().mockResolvedValue(expired),
    });

    const uc = new ConfirmEmailVerificationUseCase(userRepo, tokenRepo);
    await expect(uc.execute(raw)).rejects.toThrow(/expirado|inv[áa]lido/i);
    expect(tokenRepo.deleteById).toHaveBeenCalledWith("t1");
    expect(userRepo.setEmailVerified).not.toHaveBeenCalled();
  });

  it("rejects unknown / missing tokens", async () => {
    const userRepo = makeUserRepo();
    const { repo: tokenRepo } = makeTokenRepo({
      findActiveByHash: vi.fn().mockResolvedValue(null),
    });
    const uc = new ConfirmEmailVerificationUseCase(userRepo, tokenRepo);
    await expect(uc.execute("garbage")).rejects.toThrow(/inv[áa]lido|expirado/i);
    expect(userRepo.setEmailVerified).not.toHaveBeenCalled();
  });

  it("rejects when user is disabled", async () => {
    const raw = generateRawToken();
    const userRepo = makeUserRepo(fakeUser({ disabledAt: new Date() }));
    const { repo: tokenRepo } = makeTokenRepo({
      findActiveByHash: vi.fn().mockResolvedValue(activeToken(raw)),
    });
    const uc = new ConfirmEmailVerificationUseCase(userRepo, tokenRepo);
    await expect(uc.execute(raw)).rejects.toThrow(/desativada|disabled|inv[áa]lido/i);
    expect(userRepo.setEmailVerified).not.toHaveBeenCalled();
  });
});

describe("RequestEmailChangeUseCase", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects when new email equals current email (case/space insensitive)", async () => {
    const userRepo = makeUserRepo(fakeUser());
    const { repo: tokenRepo } = makeTokenRepo();
    const emailer = makeEmailer();
    const uc = new RequestEmailChangeUseCase(userRepo, tokenRepo, emailer);
    await expect(uc.execute("u1", "  ALICE@Example.com  ", "https://app.test"))
      .rejects.toThrow(/igual|atual/i);
    expect(userRepo.setPendingEmail).not.toHaveBeenCalled();
  });

  it("rejects when the new email is in use by another account (email or pendingEmail)", async () => {
    const userRepo = makeUserRepo(fakeUser());
    (userRepo.findByEmailOrPendingEmail as ReturnType<typeof vi.fn>)
      .mockResolvedValue(fakeUser({ _id: "u2", email: "taken@example.com" }));
    const { repo: tokenRepo } = makeTokenRepo();
    const emailer = makeEmailer();
    const uc = new RequestEmailChangeUseCase(userRepo, tokenRepo, emailer);
    await expect(uc.execute("u1", "taken@example.com", "https://app.test"))
      .rejects.toThrow(/indispon[íi]vel/i);
    expect(userRepo.setPendingEmail).not.toHaveBeenCalled();
    expect(emailer.sendEmailVerification).not.toHaveBeenCalled();
  });

  it("allows reusing an address already pending on the same user (idempotent)", async () => {
    const userRepo = makeUserRepo(fakeUser({ pendingEmail: "new@example.com" }));
    (userRepo.findByEmailOrPendingEmail as ReturnType<typeof vi.fn>)
      .mockResolvedValue(fakeUser({ _id: "u1", email: "alice@example.com", pendingEmail: "new@example.com" }));
    const { repo: tokenRepo, created } = makeTokenRepo();
    const emailer = makeEmailer();
    const uc = new RequestEmailChangeUseCase(userRepo, tokenRepo, emailer);
    await uc.execute("u1", "new@example.com", "https://app.test");
    expect(userRepo.setPendingEmail).toHaveBeenCalledWith("u1", "new@example.com");
    expect(created).toHaveLength(1);
    expect(created[0].email).toBe("new@example.com");
    expect(emailer.sendEmailVerification.mock.calls[0][0]).toBe("new@example.com");
  });

  it("happy path: stores pendingEmail, issues token, mails the new address", async () => {
    const userRepo = makeUserRepo(fakeUser());
    const { repo: tokenRepo, created } = makeTokenRepo();
    const emailer = makeEmailer();
    const uc = new RequestEmailChangeUseCase(userRepo, tokenRepo, emailer);
    await uc.execute("u1", "  Brand-New@Example.com ", "https://app.test");
    expect(userRepo.setPendingEmail).toHaveBeenCalledWith("u1", "brand-new@example.com");
    expect(created).toHaveLength(1);
    expect(created[0].email).toBe("brand-new@example.com");
    expect(emailer.sendEmailVerification.mock.calls[0][0]).toBe("brand-new@example.com");
  });
});
