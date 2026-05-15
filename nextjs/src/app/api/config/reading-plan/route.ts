import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { MongoAppConfigRepository } from "@/infrastructure/repositories/MongoAppConfigRepository";
import {
  bookChapterToIndex,
  CANONICAL_BOOKS,
  DEFAULT_ANCHOR_DATE_UTC,
  DEFAULT_ANCHOR_INDEX,
} from "@/lib/reading-plan";

export const dynamic = "force-dynamic";

const CONFIG_KEY = "reading-plan";

/** Human-readable form a moderator types in. */
interface StoredAnchor {
  anchorDate: string; // YYYY-MM-DD
  anchorBook: string;
  anchorChapter: number;
}

const PutSchema = z.object({
  anchorDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data deve ser YYYY-MM-DD"),
  anchorBook: z.string().min(1).max(10),
  anchorChapter: z.number().int().positive().max(200),
});

/**
 * Resolve a stored anchor into the wire shape the BooksIndex consumer needs:
 * UTC midnight + the 1-based canonical index. Returns null when the stored
 * value is malformed so callers can fall through to the compiled default.
 */
function resolve(stored: StoredAnchor | null) {
  if (!stored) return null;
  const idx = bookChapterToIndex(stored.anchorBook, stored.anchorChapter);
  if (idx === null) return null;
  const [y, m, d] = stored.anchorDate.split("-").map((n) => parseInt(n, 10));
  if ([y, m, d].some((n) => Number.isNaN(n))) return null;
  return {
    anchorDateUtc: Date.UTC(y, m - 1, d),
    anchorIndex: idx,
  };
}

// Default-anchor view formatted the same way GET returns when no custom row
// exists. Computing it once keeps the response shape consistent.
function defaultPayload() {
  // Reverse the compiled default index back into a book+chapter for the
  // human-readable fields. Index 1 → Gn 1; this loop handles any future
  // change to DEFAULT_ANCHOR_INDEX.
  let remaining = DEFAULT_ANCHOR_INDEX;
  let book = CANONICAL_BOOKS[0];
  let chapter = 1;
  for (const b of CANONICAL_BOOKS) {
    if (remaining <= b.chapters) {
      book = b;
      chapter = remaining;
      break;
    }
    remaining -= b.chapters;
  }
  const d = new Date(DEFAULT_ANCHOR_DATE_UTC);
  const iso = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  return {
    anchorDate: iso,
    anchorBook: book.abbrev,
    anchorChapter: chapter,
    anchorDateUtc: DEFAULT_ANCHOR_DATE_UTC,
    anchorIndex: DEFAULT_ANCHOR_INDEX,
    isDefault: true,
  };
}

/** Public — every reader needs the anchor to render today's chapter banner. */
export async function GET() {
  try {
    const stored = await new MongoAppConfigRepository().get<StoredAnchor>(CONFIG_KEY);
    const resolved = resolve(stored);
    if (!stored || !resolved) return NextResponse.json(defaultPayload());
    return NextResponse.json({
      anchorDate: stored.anchorDate,
      anchorBook: stored.anchorBook,
      anchorChapter: stored.anchorChapter,
      anchorDateUtc: resolved.anchorDateUtc,
      anchorIndex: resolved.anchorIndex,
      isDefault: false,
    });
  } catch {
    // DB hiccup shouldn't kill the home page — fall back to defaults.
    return NextResponse.json(defaultPayload());
  }
}

/** Moderator-only. Validates abbrev + chapter against CANONICAL_BOOKS. */
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.moderator) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = PutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }

  const stored: StoredAnchor = {
    anchorDate: parsed.data.anchorDate,
    anchorBook: parsed.data.anchorBook.toLowerCase(),
    anchorChapter: parsed.data.anchorChapter,
  };
  const resolved = resolve(stored);
  if (!resolved) {
    return NextResponse.json(
      { error: "Livro ou capítulo fora do cânon (gn..ap)." },
      { status: 400 },
    );
  }

  await new MongoAppConfigRepository().set<StoredAnchor>(CONFIG_KEY, stored);

  return NextResponse.json({
    anchorDate: stored.anchorDate,
    anchorBook: stored.anchorBook,
    anchorChapter: stored.anchorChapter,
    anchorDateUtc: resolved.anchorDateUtc,
    anchorIndex: resolved.anchorIndex,
    isDefault: false,
  });
}
