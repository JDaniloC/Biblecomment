import bcrypt from "bcryptjs";
import crypto from "crypto";
import { IUserRepository } from "@/domain/repositories/IUserRepository";
import { IPasswordResetTokenRepository } from "@/domain/repositories/IPasswordResetTokenRepository";
import { revokePendingEmailChange, settleCleanup } from "./AuthUseCases";

export interface Clock {
  now(): number;
}

export const systemClock: Clock = { now: () => Date.now() };

export interface PasswordResetEmailer {
  sendPasswordReset(to: string, username: string, link: string): Promise<void>;
}

export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 min
export const RESET_RATE_LIMIT_PER_USER = 3;
export const RESET_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function generateRawToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export class RequestPasswordResetUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly tokenRepo: IPasswordResetTokenRepository,
    private readonly emailer: PasswordResetEmailer,
    private readonly clock: Clock = systemClock,
  ) {}

  /**
   * Always resolves successfully — never reveals whether `email` exists.
   * Returns `true` when an email was actually dispatched (caller can use
   * this for internal logging only; do NOT pipe to the HTTP response).
   */
  async execute(email: string, appUrl: string): Promise<boolean> {
    const normalized = email.toLowerCase().trim();
    const user = await this.userRepo.findByEmail(normalized);
    if (!user || !user._id) return false;

    const recent = await this.tokenRepo.countRecentByUserId(
      user._id,
      RESET_RATE_LIMIT_WINDOW_MS,
    );
    if (recent >= RESET_RATE_LIMIT_PER_USER) return false;

    await this.tokenRepo.deleteByUserId(user._id);

    const raw = generateRawToken();
    const tokenHash = sha256(raw);
    const expiresAt = new Date(this.clock.now() + RESET_TOKEN_TTL_MS);
    await this.tokenRepo.create({ userId: user._id, tokenHash, expiresAt });

    const link = `${appUrl.replace(/\/$/, "")}/reset-password?token=${raw}`;
    await this.emailer.sendPasswordReset(user.email, user.username, link);
    return true;
  }
}

export interface CompletePasswordResetResult {
  userId: string;
  /**
   * Set when revoking a pending e-mail change failed after the new password
   * was stored. The reset itself succeeded, so the caller logs this instead
   * of reporting an error.
   */
  cleanupError?: unknown;
}

export class CompletePasswordResetUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly tokenRepo: IPasswordResetTokenRepository,
    private readonly clock: Clock = systemClock,
  ) {}

  /**
   * Rotate the password of the token's owner and burn the token. The write
   * also bumps the account's session version, ending every session — the
   * caller drops its cached session state for the returned id — and any
   * pending e-mail change is revoked (see revokePendingEmailChange).
   */
  async execute(rawToken: string, newPassword: string): Promise<CompletePasswordResetResult> {
    if (!rawToken || typeof rawToken !== "string") {
      throw new Error("Token inválido ou expirado.");
    }
    if (!newPassword || newPassword.length < 6) {
      throw new Error("Senha inválida (mínimo 6 caracteres).");
    }

    const tokenHash = sha256(rawToken);
    const tk = await this.tokenRepo.findActiveByHash(tokenHash);
    if (!tk || !tk._id) {
      throw new Error("Token inválido ou expirado.");
    }
    if (tk.expiresAt.getTime() <= this.clock.now()) {
      await this.tokenRepo.deleteById(tk._id);
      throw new Error("Token inválido ou expirado.");
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    // Unconditional (no expectedHash): a reset always beats a racing change.
    const version = await this.userRepo.updatePasswordById(tk.userId, hashed);
    await this.tokenRepo.deleteById(tk._id);
    // The account is gone (deleted after the link was sent).
    if (version === null) throw new Error("Token inválido ou expirado.");

    const userId = tk.userId;
    const cleanupError = await settleCleanup([
      () => revokePendingEmailChange(this.userRepo, userId),
    ]);
    return cleanupError === undefined ? { userId } : { userId, cleanupError };
  }
}
