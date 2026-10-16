/**
 * Convert any free-form name into a URL-safe, login-safe slug.
 *
 * Rules (in order):
 *  1. NFD normalize + strip combining diacritics ("João" → "Joao").
 *  2. Lowercase.
 *  3. Replace any run of non-[a-z0-9_-] with a single "-".
 *  4. Trim leading/trailing "-" or "_".
 *  5. Truncate to 40 characters (max we accept).
 *
 * Returns the resulting slug, which may be empty if the input was entirely
 * non-alphanumeric. Callers must check the result against MIN_USERNAME_LEN
 * and refuse to create the account if it's too short.
 */

export const MIN_USERNAME_LEN = 2;
export const MAX_USERNAME_LEN = 40;

export const USERNAME_PATTERN = /^[a-z0-9_-]{2,40}$/;

export function sanitizeUsername(input: string): string {
  if (!input) return "";
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, MAX_USERNAME_LEN);
}

/**
 * Slugs no account may hold because the app writes them as sentinels:
 *  - "system" is the actor of badge notifications; an account by that name
 *    would be credited with them (and deleting it would wipe them all).
 *  - "deleted-user" is written to DiscussionAnswer.userId when the author
 *    deletes their account (DELETED_USER_ID).
 * Other sentinels ("alguém", "[usuário removido]") can't pass
 * USERNAME_PATTERN, so they need no entry here.
 */
export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  "system",
  "deleted-user",
]);

export function isReservedUsername(slug: string): boolean {
  return RESERVED_USERNAMES.has(slug.toLowerCase());
}

/** Canonical pattern AND not a reserved sentinel. */
export function isValidUsername(slug: string): boolean {
  return USERNAME_PATTERN.test(slug) && !isReservedUsername(slug);
}
