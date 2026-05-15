/**
 * "Reavivados Por Sua Palavra" daily reading plan.
 *
 * Cycles every chapter of the Bible at a rate of one per day. Order is
 * canonical (Gênesis → Apocalipse), restarting at Gênesis 1 after Apocalipse 22.
 *
 * Anchored on the date a Gênesis 1 day falls in the current cycle so the
 * constant reads naturally ("the cycle starts here"). Derived from the
 * user-confirmed pairing 2026-05-14 → 2 Crônicas 26 (canonical index 393),
 * which places day 1 of the current cycle on 2025-04-17.
 */

export interface ReadingPlanBook {
  abbrev: string;
  name: string;
  chapters: number;
}

/**
 * 66 books in canonical order with their chapter counts. Used both for the
 * cumulative-index walk and as a fallback display name when the Book lookup
 * in Mongo doesn't return a row for `abbrev`.
 */
export const CANONICAL_BOOKS: readonly ReadingPlanBook[] = [
  // Antigo Testamento — Pentateuco
  { abbrev: "gn", name: "Gênesis",       chapters: 50 },
  { abbrev: "ex", name: "Êxodo",         chapters: 40 },
  { abbrev: "lv", name: "Levítico",      chapters: 27 },
  { abbrev: "nm", name: "Números",       chapters: 36 },
  { abbrev: "dt", name: "Deuteronômio",  chapters: 34 },
  // Históricos
  { abbrev: "js",  name: "Josué",        chapters: 24 },
  { abbrev: "jz",  name: "Juízes",       chapters: 21 },
  { abbrev: "rt",  name: "Rute",         chapters: 4 },
  { abbrev: "1sm", name: "1 Samuel",     chapters: 31 },
  { abbrev: "2sm", name: "2 Samuel",     chapters: 24 },
  { abbrev: "1rs", name: "1 Reis",       chapters: 22 },
  { abbrev: "2rs", name: "2 Reis",       chapters: 25 },
  { abbrev: "1cr", name: "1 Crônicas",   chapters: 29 },
  { abbrev: "2cr", name: "2 Crônicas",   chapters: 36 },
  { abbrev: "ed",  name: "Esdras",       chapters: 10 },
  { abbrev: "ne",  name: "Neemias",      chapters: 13 },
  { abbrev: "et",  name: "Ester",        chapters: 10 },
  // Poéticos
  { abbrev: "jó", name: "Jó",            chapters: 42 },
  { abbrev: "sl", name: "Salmos",        chapters: 150 },
  { abbrev: "pv", name: "Provérbios",    chapters: 31 },
  { abbrev: "ec", name: "Eclesiastes",   chapters: 12 },
  { abbrev: "ct", name: "Cânticos",      chapters: 8 },
  // Profetas Maiores
  { abbrev: "is", name: "Isaías",        chapters: 66 },
  { abbrev: "jr", name: "Jeremias",      chapters: 52 },
  { abbrev: "lm", name: "Lamentações",   chapters: 5 },
  { abbrev: "ez", name: "Ezequiel",      chapters: 48 },
  { abbrev: "dn", name: "Daniel",        chapters: 12 },
  // Profetas Menores
  { abbrev: "os", name: "Oseias",        chapters: 14 },
  { abbrev: "jl", name: "Joel",          chapters: 3 },
  { abbrev: "am", name: "Amós",          chapters: 9 },
  { abbrev: "ob", name: "Obadias",       chapters: 1 },
  { abbrev: "jn", name: "Jonas",         chapters: 4 },
  { abbrev: "mq", name: "Miqueias",      chapters: 7 },
  { abbrev: "na", name: "Naum",          chapters: 3 },
  { abbrev: "hc", name: "Habacuque",     chapters: 3 },
  { abbrev: "sf", name: "Sofonias",      chapters: 3 },
  { abbrev: "ag", name: "Ageu",          chapters: 2 },
  { abbrev: "zc", name: "Zacarias",      chapters: 14 },
  { abbrev: "ml", name: "Malaquias",     chapters: 4 },
  // Novo Testamento — Evangelhos e Atos
  { abbrev: "mt", name: "Mateus",        chapters: 28 },
  { abbrev: "mc", name: "Marcos",        chapters: 16 },
  { abbrev: "lc", name: "Lucas",         chapters: 24 },
  { abbrev: "jo", name: "João",          chapters: 21 },
  { abbrev: "at", name: "Atos",          chapters: 28 },
  // Cartas Paulinas
  { abbrev: "rm",  name: "Romanos",      chapters: 16 },
  { abbrev: "1co", name: "1 Coríntios",  chapters: 16 },
  { abbrev: "2co", name: "2 Coríntios",  chapters: 13 },
  { abbrev: "gl",  name: "Gálatas",      chapters: 6 },
  { abbrev: "ef",  name: "Efésios",      chapters: 6 },
  { abbrev: "fp",  name: "Filipenses",   chapters: 4 },
  { abbrev: "cl",  name: "Colossenses",  chapters: 4 },
  { abbrev: "1ts", name: "1 Tessalonicenses", chapters: 5 },
  { abbrev: "2ts", name: "2 Tessalonicenses", chapters: 3 },
  { abbrev: "1tm", name: "1 Timóteo",    chapters: 6 },
  { abbrev: "2tm", name: "2 Timóteo",    chapters: 4 },
  { abbrev: "tt",  name: "Tito",         chapters: 3 },
  { abbrev: "fm",  name: "Filemom",      chapters: 1 },
  // Cartas Gerais
  { abbrev: "hb",  name: "Hebreus",      chapters: 13 },
  { abbrev: "tg",  name: "Tiago",        chapters: 5 },
  { abbrev: "1pe", name: "1 Pedro",      chapters: 5 },
  { abbrev: "2pe", name: "2 Pedro",      chapters: 3 },
  { abbrev: "1jo", name: "1 João",       chapters: 5 },
  { abbrev: "2jo", name: "2 João",       chapters: 1 },
  { abbrev: "3jo", name: "3 João",       chapters: 1 },
  { abbrev: "jd",  name: "Judas",        chapters: 1 },
  // Apocalipse
  { abbrev: "ap", name: "Apocalipse",    chapters: 22 },
];

/** Total chapters in the cycle. The plan loops every TOTAL_CHAPTERS days. */
export const TOTAL_CHAPTERS = CANONICAL_BOOKS.reduce((acc, b) => acc + b.chapters, 0);
// Compile-time check that the data above sums to 1189 — the canonical
// chapter count of the protestant Bible. If anyone edits a row above the
// next assertion catches the typo.
if (TOTAL_CHAPTERS !== 1189) {
  throw new Error(
    `reading-plan: CANONICAL_BOOKS sums to ${TOTAL_CHAPTERS}, expected 1189`,
  );
}

/**
 * Default anchor: 2025-04-17 (UTC) = Gênesis 1 in the current cycle.
 * Used as a fallback when the runtime override (stored in AppConfig) is
 * absent or malformed. Updating this in code is a deploy; updating the
 * AppConfig row is a hot edit a moderator can do via the API.
 */
export const DEFAULT_ANCHOR_DATE_UTC = Date.UTC(2025, 3, 17);
export const DEFAULT_ANCHOR_INDEX = 1;

export interface ReadingPlanAnchor {
  /** UTC midnight (milliseconds since epoch) for the anchor date. */
  anchorDateUtc: number;
  /** 1-based canonical chapter index that the anchor date lands on. */
  anchorIndex: number;
}

const DEFAULT_ANCHOR: ReadingPlanAnchor = {
  anchorDateUtc: DEFAULT_ANCHOR_DATE_UTC,
  anchorIndex: DEFAULT_ANCHOR_INDEX,
};

const MS_PER_DAY = 86_400_000;

/**
 * Convert a (book abbrev, chapter) pair into its 1-based canonical index.
 * Returns null when the abbrev is unknown or the chapter is out of range —
 * callers should treat that as "config malformed, fall back to default".
 */
export function bookChapterToIndex(abbrev: string, chapter: number): number | null {
  const normalized = abbrev.trim().toLowerCase();
  let acc = 0;
  for (const book of CANONICAL_BOOKS) {
    if (book.abbrev === normalized) {
      if (chapter < 1 || chapter > book.chapters) return null;
      return acc + chapter;
    }
    acc += book.chapters;
  }
  return null;
}

/**
 * Floor a date to UTC midnight. Using UTC (not local) keeps the result
 * stable across the user's timezone — every reader of the world sees the
 * same "today" for the plan, just like a physical wall calendar.
 */
function toUtcMidnight(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * 1-based canonical index for the given date (1..1189). Wraps with modulo
 * so dates before the anchor and dates past one full cycle resolve too.
 * Accepts an optional `anchor` override — useful when the configured
 * anchor differs from the compiled default (RPSP schedule slip, etc.).
 */
export function indexForDate(date: Date, anchor: ReadingPlanAnchor = DEFAULT_ANCHOR): number {
  const days = Math.round((toUtcMidnight(date) - anchor.anchorDateUtc) / MS_PER_DAY);
  // JS `%` keeps the sign of the dividend; the double-modulo dance forces
  // a non-negative result so dates before the anchor still resolve.
  return ((((anchor.anchorIndex - 1 + days) % TOTAL_CHAPTERS) + TOTAL_CHAPTERS) % TOTAL_CHAPTERS) + 1;
}

export interface DailyReading {
  abbrev: string;
  bookName: string;
  chapter: number;
  /** 1-based position in the canonical cycle (1..1189). */
  cycleIndex: number;
  /** Day-of-cycle written like "Dia 393 / 1189". */
  cycleLabel: string;
}

/** Resolve `indexForDate` back to a concrete book + chapter. */
export function getReadingForDate(
  date: Date,
  anchor: ReadingPlanAnchor = DEFAULT_ANCHOR,
): DailyReading {
  const idx = indexForDate(date, anchor);
  let remaining = idx;
  for (const book of CANONICAL_BOOKS) {
    if (remaining <= book.chapters) {
      return {
        abbrev: book.abbrev,
        bookName: book.name,
        chapter: remaining,
        cycleIndex: idx,
        cycleLabel: `Dia ${idx} de ${TOTAL_CHAPTERS}`,
      };
    }
    remaining -= book.chapters;
  }
  // Unreachable when TOTAL_CHAPTERS is correct (the assertion above guards it).
  const last = CANONICAL_BOOKS[CANONICAL_BOOKS.length - 1];
  return {
    abbrev: last.abbrev,
    bookName: last.name,
    chapter: last.chapters,
    cycleIndex: idx,
    cycleLabel: `Dia ${idx} de ${TOTAL_CHAPTERS}`,
  };
}
