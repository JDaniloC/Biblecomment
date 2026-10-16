import bcrypt from "bcryptjs";
import { IUserRepository } from "@/domain/repositories/IUserRepository";
import { IPushSubscriptionRepository } from "@/domain/repositories/IPushSubscriptionRepository";
import { IReadingReminderPreferenceRepository } from "@/domain/repositories/IReadingReminderPreferenceRepository";
import { INotificationRepository } from "@/domain/repositories/INotificationRepository";
import { IPasswordResetTokenRepository } from "@/domain/repositories/IPasswordResetTokenRepository";
import { User } from "@/domain/entities/User";
import { isActiveAccount } from "@/lib/auth-guards";
import {
  sanitizeUsername,
  isValidUsername,
  isReservedUsername,
  MIN_USERNAME_LEN,
} from "@/lib/sanitize-username";

/**
 * Try `base`, `base-2`, `base-3`, ... up to 50 attempts. Realistically
 * humans pick names with low collision; 50 is just a safety net so a
 * worst-case "felipe" never returns 409 to a brand-new user.
 */
async function disambiguate(
  base: string,
  isTaken: (slug: string) => Promise<boolean>,
): Promise<string> {
  if (!(await isTaken(base))) return base;
  for (let i = 2; i <= 50; i++) {
    const candidate = `${base}-${i}`;
    if (candidate.length > 40) {
      // Drop characters from the end of the base so the suffix fits.
      const trimmed = base.slice(0, 40 - String(i).length - 1);
      const fallback = `${trimmed}-${i}`;
      if (!(await isTaken(fallback))) return fallback;
      continue;
    }
    if (!(await isTaken(candidate))) return candidate;
  }
  throw new Error("Could not generate a unique username");
}

export interface RegisterUserInput {
  email: string;
  /** Free-form name typed by the user — sanitized into the slug. */
  displayName: string;
  /**
   * Optional explicit slug. When omitted, derived from displayName.
   * Validated against `[a-z0-9_-]{2,40}` either way.
   */
  username?: string;
  password: string;
}

/**
 * Records keyed by username rather than user id. A free slug has no live
 * owner, so whatever still sits under it was left by a deleted (or renamed)
 * account and must not be inherited by the new one — above all devices,
 * which would receive the new account's push notifications.
 */
export interface UsernameKeyedRepos {
  pushSubscription: IPushSubscriptionRepository;
  readingReminder: IReadingReminderPreferenceRepository;
  notification: INotificationRepository;
}

export class RegisterUserUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly usernameKeyed?: UsernameKeyedRepos,
  ) {}

  async execute(input: RegisterUserInput): Promise<User> {
    const { email, displayName, password } = input;

    const existingEmail = await this.userRepo.findByEmail(email);
    if (existingEmail) throw new Error("Email already registered");

    // Compute the slug. If the caller passed one, it must already be
    // canonical (and not a reserved sentinel); we do NOT silently rewrite
    // it. Sanitization is only applied to derive a slug from displayName.
    let slug: string;
    if (input.username) {
      if (!isValidUsername(input.username)) {
        throw new Error("Invalid username format");
      }
      slug = input.username;
    } else {
      const base = sanitizeUsername(displayName);
      if (base.length < MIN_USERNAME_LEN) {
        throw new Error("Could not derive a username from the given name");
      }
      slug = base;
    }

    // Disambiguate against existing usernames (best-effort 50 retries).
    // Reserved sentinels count as taken, so a display name like "System"
    // yields "system-2" instead of the badge-notification actor.
    // A slug still held as another account's `renameFrom` counts as taken.
    const finalUsername = await disambiguate(slug, async (s) => {
      if (isReservedUsername(s)) return true;
      return this.userRepo.isUsernameHeld(s);
    });

    if (input.username && finalUsername !== input.username) {
      // Caller provided an exact slug but it's taken — surface 409 instead
      // of silently renaming.
      throw new Error("Username already taken");
    }

    if (this.usernameKeyed) {
      await Promise.all([
        this.usernameKeyed.pushSubscription.deleteAllByUsername(finalUsername),
        this.usernameKeyed.readingReminder.deleteByUsername(finalUsername),
        this.usernameKeyed.notification.deleteForUser(finalUsername),
      ]);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    return this.userRepo.create({
      email: email.toLowerCase(),
      username: finalUsername,
      displayName: displayName.trim(),
      password: hashedPassword,
      moderator: false,
    });
  }
}

export class GetUserByEmailUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(email: string): Promise<User | null> {
    return this.userRepo.findByEmail(email);
  }
}

export class UpdateUserProfileUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(
    email: string,
    data: { state?: string; belief?: string }
  ): Promise<User> {
    const updated = await this.userRepo.update(email, data);
    if (!updated) throw new Error("User not found");
    return updated;
  }
}

/**
 * Run cleanup steps that follow a write that already committed. Every step
 * runs even if another fails, and a failure is returned instead of thrown:
 * the caller must not report the committed write as failed, so it logs it.
 * Returns undefined when every step succeeded.
 */
export async function settleCleanup(steps: Array<() => Promise<unknown>>): Promise<unknown> {
  const results = await Promise.allSettled(steps.map((step) => Promise.resolve().then(step)));
  const failures = results.flatMap((r) => (r.status === "rejected" ? [r.reason] : []));
  if (failures.length === 0) return undefined;
  return failures.length === 1
    ? failures[0]
    : new AggregateError(failures, "several cleanup steps failed");
}

/**
 * Revoke a pending e-mail change once the password was rotated (change or
 * reset). Its verification link is confirmed without a session, so a change
 * requested from a compromised session would otherwise still move the
 * account to the attacker's address after the owner locked them out, and
 * the account with it (through password recovery). Clearing `pendingEmail`
 * is enough: confirming a link requires the token's address to equal the
 * account's current or pending e-mail, so the change link fails from then
 * on. The verification tokens are left alone on purpose — a first-time
 * verification link (issued for the current address) must keep working.
 */
export async function revokePendingEmailChange(
  userRepo: Pick<IUserRepository, "clearPendingEmail">,
  userId: string,
): Promise<void> {
  await userRepo.clearPendingEmail(userId);
}

/** What a password change revokes besides the sessions and the pending e-mail change. */
export interface PasswordChangeTokenRepos {
  /** Outstanding reset links die with the old password. */
  passwordReset: Pick<IPasswordResetTokenRepository, "deleteByUserId">;
}

export interface ChangePasswordResult {
  userId: string;
  sessionVersion: number;
  /**
   * Set when revoking the reset links or the pending e-mail change failed
   * after the new password was stored. The change itself succeeded, so the
   * caller logs this instead of reporting an error.
   */
  cleanupError?: unknown;
}

export class ChangePasswordUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly tokens: PasswordChangeTokenRepos,
  ) {}

  /**
   * Rotate the password and bump the account's session version, which
   * revokes every existing session (the caller re-signs the current one),
   * then revoke the reset links and any pending e-mail change. Returns the
   * new version.
   */
  async execute(
    email: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<ChangePasswordResult> {
    const user = await this.userRepo.findByEmail(email);
    if (!user || !user._id) throw new Error("User not found");
    // A disabled or deleting account can't sign in, so it can't change
    // its password either (the session may be up to a cache TTL stale).
    if (!isActiveAccount(user)) throw new Error("Unauthorized");

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new Error("Invalid current password");

    const hashed = await bcrypt.hash(newPassword, 12);
    // Compare-and-set on the hash we just verified: if a reset (or another
    // change) landed in between, the password typed as "current" no longer
    // is, and the reset must win.
    const userId = user._id;
    const sessionVersion = await this.userRepo.updatePasswordById(userId, hashed, {
      expectedHash: user.password,
    });
    if (sessionVersion === null) throw new Error("Invalid current password");

    // After the write: from then on the revoked sessions can't request an
    // e-mail change (that action re-checks the session version), so this
    // catches every earlier request except one still in flight.
    const cleanupError = await settleCleanup([
      () => this.tokens.passwordReset.deleteByUserId(userId),
      () => revokePendingEmailChange(this.userRepo, userId),
    ]);
    return cleanupError === undefined
      ? { userId, sessionVersion }
      : { userId, sessionVersion, cleanupError };
  }
}
