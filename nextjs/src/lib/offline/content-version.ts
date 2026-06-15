import type { Book } from "@/domain/entities/Book";

// Bump this when verse TEXT is corrected without changing any book's
// chapter count (computeContentVersion below can't see that edit on its
// own). On the next online start, a changed salt produces a new content
// version → the offline dataset re-syncs. Format: "vN".
export const CONTENT_VERSION_SALT = "v1";

// Deterministic, dependency-free 32-bit FNV-1a hash → hex string. We only
// need a stable fingerprint, not crypto strength, and the SW/runtime here
// can't assume `crypto.subtle` (sync, no async needed at call sites).
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // 32-bit FNV prime multiply via shifts (keeps it in int range).
    hash = Math.imul(hash, 0x01000193);
  }
  // >>> 0 coerces to an unsigned 32-bit int before hex-encoding.
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * A stable content version for the offline Bible dataset. Changes when the
 * corpus shape changes (book added/removed, or a book's chapter count
 * changes) or when CONTENT_VERSION_SALT is bumped. Order-independent: the
 * book list is sorted by abbrev before hashing so `/api/books` ordering
 * doesn't perturb the value.
 */
export function computeContentVersion(books: Book[]): string {
  const shape = [...books]
    .map((b) => `${b.abbrev}:${b.chapters}`)
    .sort()
    .join("|");
  return `${CONTENT_VERSION_SALT}.${fnv1a(shape)}`;
}
