import crypto from "crypto";
import { IUserRepository } from "@/domain/repositories/IUserRepository";
import { IEmailVerificationTokenRepository } from "@/domain/repositories/IEmailVerificationTokenRepository";

export interface Clock { now(): number; }
export const systemClock: Clock = { now: () => Date.now() };

export interface EmailVerificationEmailer {
  sendEmailVerification(to: string, username: string, link: string): Promise<void>;
}

export const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
export const VERIFY_RATE_LIMIT_PER_USER = 3;
export const VERIFY_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function generateRawToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export class RequestEmailVerificationUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly tokenRepo: IEmailVerificationTokenRepository,
    private readonly emailer: EmailVerificationEmailer,
    private readonly clock: Clock = systemClock,
  ) {}

  /** Returns true when an email was actually dispatched. */
  async execute(userId: string, appUrl: string): Promise<boolean> {
    const user = await this.userRepo.findById(userId);
    if (!user || !user._id) return false;
    if (user.disabledAt) return false;

    const hasPending = !!user.pendingEmail;
    const alreadyVerified = !!user.emailVerifiedAt;
    if (alreadyVerified && !hasPending) return false;

    const recent = await this.tokenRepo.countRecentByUserId(
      user._id,
      VERIFY_RATE_LIMIT_WINDOW_MS,
    );
    if (recent >= VERIFY_RATE_LIMIT_PER_USER) return false;

    await this.tokenRepo.deleteByUserId(user._id);

    const target = user.pendingEmail ?? user.email;
    const raw = generateRawToken();
    const tokenHash = sha256(raw);
    const expiresAt = new Date(this.clock.now() + VERIFY_TOKEN_TTL_MS);
    await this.tokenRepo.create({ userId: user._id, email: target, tokenHash, expiresAt });

    const link = `${appUrl.replace(/\/$/, "")}/verify-email?token=${raw}`;
    await this.emailer.sendEmailVerification(target, user.username, link);
    return true;
  }
}

export class RequestEmailChangeUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly tokenRepo: IEmailVerificationTokenRepository,
    private readonly emailer: EmailVerificationEmailer,
    private readonly clock: Clock = systemClock,
  ) {}

  async execute(userId: string, newEmail: string, appUrl: string): Promise<void> {
    const normalized = (newEmail ?? "").toLowerCase().trim();
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new Error("E-mail inválido.");
    }

    const user = await this.userRepo.findById(userId);
    if (!user || !user._id) throw new Error("Usuário não encontrado.");
    if (user.disabledAt) throw new Error("Conta desativada.");
    if (normalized === user.email) throw new Error("O novo e-mail é igual ao atual.");

    const conflict = await this.userRepo.findByEmailOrPendingEmail(normalized);
    if (conflict && conflict._id !== user._id) {
      // Never confirm whether an account exists — generic message.
      throw new Error("E-mail indisponível.");
    }

    await this.userRepo.setPendingEmail(user._id, normalized);

    // Issue token + send. (Don't reuse RequestEmailVerificationUseCase
    // because it would re-read the user and short-circuit on "no pending"
    // edge cases. Keep this flow explicit.)
    await this.tokenRepo.deleteByUserId(user._id);
    const raw = generateRawToken();
    const tokenHash = sha256(raw);
    const expiresAt = new Date(this.clock.now() + VERIFY_TOKEN_TTL_MS);
    await this.tokenRepo.create({ userId: user._id, email: normalized, tokenHash, expiresAt });

    const link = `${appUrl.replace(/\/$/, "")}/verify-email?token=${raw}`;
    await this.emailer.sendEmailVerification(normalized, user.username, link);
  }
}

export class ConfirmEmailVerificationUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly tokenRepo: IEmailVerificationTokenRepository,
    private readonly clock: Clock = systemClock,
  ) {}

  /**
   * Confirms a verification token.
   *
   * Returns an object with `newEmail` set to the promoted address when the
   * confirmation was for an email-change (pendingEmail → email). The caller
   * should update the client session with this value so subsequent API calls
   * use the correct email.  For a plain first-time verification, `newEmail`
   * is null.
   */
  async execute(rawToken: string): Promise<{ newEmail: string | null }> {
    if (!rawToken || typeof rawToken !== "string") {
      throw new Error("Token inválido ou expirado.");
    }

    const tokenHash = sha256(rawToken);
    const token = await this.tokenRepo.findActiveByHash(tokenHash);
    if (!token || !token._id) throw new Error("Token inválido ou expirado.");

    if (token.expiresAt.getTime() <= this.clock.now()) {
      await this.tokenRepo.deleteById(token._id);
      throw new Error("Token inválido ou expirado.");
    }

    const user = await this.userRepo.findById(token.userId);
    if (!user || !user._id || user.disabledAt) {
      await this.tokenRepo.deleteById(token._id);
      throw new Error("Conta desativada ou inexistente.");
    }

    const now = new Date(this.clock.now());
    let newEmail: string | null = null;

    if (token.email === user.email) {
      await this.userRepo.setEmailVerified(user._id, now);
    } else if (token.email === user.pendingEmail) {
      await this.userRepo.promotePendingEmail(user._id, now);
      newEmail = token.email;
    } else {
      // The user changed their pendingEmail again before clicking this link.
      await this.tokenRepo.deleteById(token._id);
      throw new Error("Token inválido ou expirado.");
    }

    await this.tokenRepo.deleteById(token._id);
    return { newEmail };
  }
}
