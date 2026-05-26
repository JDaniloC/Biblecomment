/**
 * Single-use token confirming ownership of an email address. The token is
 * invalidated by deletion (no `used` / `consumedAt` flag) — callers MUST
 * call `deleteById` after a successful confirmation, and the repository's
 * TTL index handles abandoned tokens.
 */
export interface EmailVerificationToken {
  _id?: string;
  userId: string;
  /**
   * The email address this token confirms. Stored on the token (not just
   * derived from the user) so that if the user changes pendingEmail again
   * before clicking the link, we can detect and reject the stale token
   * rather than silently moving the wrong address.
   */
  email: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt?: Date;
}
