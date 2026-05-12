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
  createdAt?: Date;
  updatedAt?: Date;
}
