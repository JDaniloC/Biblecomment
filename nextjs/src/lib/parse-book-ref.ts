/**
 * Parse a book reference like "Gn 1:1" or "Gênesis 1:1" into its parts.
 * Returns null if the input doesn't parse into abbrev + chapter:verse.
 */

const SPECIAL: Record<string, string> = { jó: "job", jn: "jn" };

export interface ParsedBookRef {
  abbrev: string;
  chapter: number;
  verse: number;
}

export function parseBookRef(ref: string): ParsedBookRef | null {
  const tokens = ref.trim().split(/\s+/);
  if (tokens.length < 2) return null;
  const chv = tokens[tokens.length - 1];
  const abbrevRaw = tokens.slice(0, -1).join("").toLowerCase();
  const abbrev = SPECIAL[abbrevRaw] ?? abbrevRaw;
  const [chStr, vStr] = chv.split(":");
  const chapter = parseInt(chStr, 10);
  const verse = parseInt(vStr, 10);
  if (!abbrev || Number.isNaN(chapter) || Number.isNaN(verse)) return null;
  return { abbrev, chapter, verse };
}
