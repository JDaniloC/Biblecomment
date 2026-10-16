export interface User {
  _id?: string;
  email: string;
  /**
   * Unique URL/login slug — sanitized to `[a-z0-9_-]{2,40}`. Used in URLs,
   * mentions (@username), and as a login identifier alongside email.
   * For pre-existing users with non-conformant usernames, the slug remains
   * grandfathered until they explicitly rename.
   */
  username: string;
  /**
   * Free-form display name shown on cards, profile headers, and
   * notifications. Falls back to `username` when absent (legacy users).
   * Allowed to contain spaces and accents — never appears in URLs.
   */
  displayName?: string;
  password: string;
  state?: string;
  belief?: string;
  /**
   * Opt-in flag controlling whether `belief` is surfaced on the public
   * profile (`/u/[username]`). Default `false` — the field is private
   * until the user explicitly toggles it on in /profile.
   */
  showBelief?: boolean;
  moderator?: boolean;
  /**
   * Onboarding tutorials the user has finished or skipped.
   * Versioned identifiers (e.g. "chapter-v1") so a future tour bump
   * can reuse the same field without re-prompting older completions.
   */
  tutorialsCompleted?: string[];
  /**
   * Badge IDs the user has unlocked (catalog ids from src/lib/badges/catalog.ts).
   * Append-only via $addToSet — concurrent grants converge.
   */
  badges?: string[];
  /**
   * Set when a moderator disables the account. While present, the user is
   * blocked from logging in (see lib/auth.ts) and all of their comments are
   * cascade-hidden. Cleared on re-enable. Absent = active account.
   */
  disabledAt?: Date;
  /** Username of the moderator who disabled the account. */
  disabledBy?: string;
  /**
   * Timestamp of the most recent successful email confirmation. Absent =
   * email not verified. Set by the email-verification flow on first
   * confirmation; reset to a new `Date` when the user confirms a
   * `pendingEmail` change. Preserved unchanged across disable / re-enable.
   * Never written by any other flow.
   */
  emailVerifiedAt?: Date;
  /**
   * Pending email-address change awaiting confirmation. While present, the
   * current `email` field is still the canonical address for login and
   * displays the existing verified indicator (if `emailVerifiedAt` is set). On
   * confirmation, `pendingEmail` is promoted to `email` and `emailVerifiedAt`
   * is set to the confirmation time.
   */
  pendingEmail?: string;
  /**
   * Previous username while a rename's cascade (comments, notifications,
   * devices…) hasn't completed. The old slug can't be taken by anyone
   * until it clears, and a retry of the rename finishes the cascade.
   */
  renameFrom?: string;
  /**
   * Present while an account deletion is in progress (DeleteUserUseCase).
   * The snapshot lists the communities and discussions whose denormalized
   * counters must be recomputed once the user's rows are gone, so a retry
   * after a partial failure can still finish the job. While present the
   * account can't sign in and existing sessions are rejected (lib/auth.ts).
   */
  deletion?: UserDeletion;
  /**
   * Revocation counter for sessions. Bumped atomically with every password
   * change or reset and on disable; a session token minted at a different
   * version is rejected (lib/auth.ts). Absent = 0 (accounts that predate it).
   * A backup restore re-creates an account at a random version (backups
   * don't carry it), so no token minted before the data loss matches it.
   */
  sessionVersion?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserDeletion {
  requestedAt: Date;
  communityIds: string[];
  discussionIds: string[];
}
