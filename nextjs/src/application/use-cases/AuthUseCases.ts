import bcrypt from "bcryptjs";
import crypto from "crypto";
import { IUserRepository } from "@/domain/repositories/IUserRepository";
import { User } from "@/domain/entities/User";
import {
  sanitizeUsername,
  isValidUsername,
  MIN_USERNAME_LEN,
} from "@/lib/sanitize-username";

function md5(str: string): string {
  return crypto.createHash("md5").update(str).digest("hex");
}

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

export class RegisterUserUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(input: RegisterUserInput): Promise<User> {
    const { email, displayName, password } = input;

    const existingEmail = await this.userRepo.findByEmail(email);
    if (existingEmail) throw new Error("Email already registered");

    // Compute the slug. If the caller passed one, it must already be
    // canonical; we do NOT silently rewrite it. Sanitization is only
    // applied to derive a slug from displayName.
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
    const finalUsername = await disambiguate(slug, async (s) => {
      const hit = await this.userRepo.findByUsername(s);
      return hit !== null;
    });

    if (input.username && finalUsername !== input.username) {
      // Caller provided an exact slug but it's taken — surface 409 instead
      // of silently renaming.
      throw new Error("Username already taken");
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    return this.userRepo.create({
      email: email.toLowerCase(),
      username: finalUsername,
      displayName: displayName.trim(),
      password: hashedPassword,
      passwordType: "bcrypt",
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

export class ChangePasswordUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(
    email: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) throw new Error("User not found");

    // Match the verification flow used by the NextAuth Credentials
    // provider so legacy MD5 accounts can change their password without
    // logging in twice.
    let valid = false;
    if (user.passwordType === "md5") {
      valid = user.password === md5(currentPassword);
    } else {
      valid = await bcrypt.compare(currentPassword, user.password);
    }
    if (!valid) throw new Error("Invalid current password");

    const hashed = await bcrypt.hash(newPassword, 12);
    // Always promotes legacy MD5 users to bcrypt at this point.
    await this.userRepo.updatePassword(email, hashed, "bcrypt");
  }
}
