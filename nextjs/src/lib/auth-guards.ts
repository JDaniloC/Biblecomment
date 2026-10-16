import type { User } from "@/domain/entities/User";

export function isEmailVerified(user: User | null | undefined): boolean {
  return !!user?.emailVerifiedAt;
}

/**
 * False for accounts a moderator disabled or whose deletion is in progress.
 * Write paths check it as well as the session: a session can outlive the
 * account by up to the revalidation cache TTL (lib/session-revalidation.ts),
 * and anything written under a deleting account would escape its cascade.
 */
export function isActiveAccount(user: User | null | undefined): boolean {
  return !!user && !user.disabledAt && !user.deletion;
}

export class EmailNotVerifiedError extends Error {
  readonly code = "EMAIL_NOT_VERIFIED" as const;
  constructor(message = "Verifique seu e-mail para participar.") {
    super(message);
    this.name = "EmailNotVerifiedError";
  }
}
