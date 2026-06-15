import type { Verse } from "@/domain/entities/Verse";

// Pure response builder, kept in its own module (no Next/next-auth imports) so
// it can be unit-tested in Vitest's node env without dragging in `next/server`
// via the route's `serverError` helper. Returns a standard Web `Response`,
// which App Router route handlers accept directly.
//
// Groups a flat verse list into the compact per-chapter shape
// `{ abbrev, chapters: { "1": [{ n, t }] } }` and stamps the immutable cache
// headers. An empty list means the book/abbrev is unknown → 404.
export function buildBookVersesResponse(abbrev: string, verses: Verse[]): Response {
  if (verses.length === 0) {
    return new Response(JSON.stringify({ error: "Book not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  const chapters: Record<string, { n: number; t: string }[]> = {};
  for (const v of verses) {
    const key = String(v.chapter);
    (chapters[key] ??= []).push({ n: v.verseNumber, t: v.text });
  }
  // Verse text is immutable seeded data; let clients and the SW cache it for a
  // day and treat it as never-revalidating within that window.
  return new Response(JSON.stringify({ abbrev, chapters }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
