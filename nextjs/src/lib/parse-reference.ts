/**
 * Reference parser for the search bar — accepts "Gn 1:1", "Gênesis 1:1",
 * "1 Co 13", "1 Coríntios 13:5", and chapter-only forms like "Gn 1".
 *
 * Returns null when the query doesn't look like a reference, so the caller
 * can fall back to text search. Book matching is accent-insensitive against
 * `name` and case-insensitive against `abbrev`.
 *
 * Intentionally permissive: a leading or trailing extra space, lowercase
 * abbrev, or accented name should all resolve. Hard requirements are the
 * trailing chapter (and optional `:verse`) plus a non-empty book token.
 */

interface BookLike {
  name: string;
  abbrev: string;
}

export interface ParsedReference {
  abbrev: string;
  chapter: number;
  /** Undefined when the user typed only "Gn 1" (chapter-level lookup). */
  verse?: number;
}

const TAIL_RE = /\s+(\d+)(?::(\d+))?\s*$/;

function strip(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

// Comparison key for book tokens: strip diacritics + lowercase + drop
// internal whitespace so "1 Co" matches abbrev "1co" and "1 Coríntios"
// matches the canonical name "1 Coríntios".
function key(s: string): string {
  return strip(s).replace(/\s+/g, "");
}

export function tryParseReference(query: string, books: BookLike[]): ParsedReference | null {
  const normalized = query.replace(/\s+/g, " ").trim();
  if (!normalized) return null;

  const match = normalized.match(TAIL_RE);
  if (!match) return null;

  const chapter = parseInt(match[1], 10);
  if (Number.isNaN(chapter) || chapter < 1) return null;

  const verseStr = match[2];
  const verse = verseStr === undefined ? undefined : parseInt(verseStr, 10);
  if (verse !== undefined && (Number.isNaN(verse) || verse < 1)) return null;

  const bookToken = key(normalized.slice(0, match.index));
  if (!bookToken) return null;

  for (const book of books) {
    if (key(book.abbrev) === bookToken) return { abbrev: book.abbrev, chapter, verse };
    if (key(book.name) === bookToken) return { abbrev: book.abbrev, chapter, verse };
  }

  return null;
}
