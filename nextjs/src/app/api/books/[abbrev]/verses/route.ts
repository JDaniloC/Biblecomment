import { MongoVerseRepository } from "@/infrastructure/repositories/MongoVerseRepository";
import { IVerseRepository } from "@/domain/repositories/IVerseRepository";
import { Verse } from "@/domain/entities/Verse";
import { serverError } from "@/lib/get-session";
import { buildBookVersesResponse } from "./buildResponse";

type Params = { abbrev: string };

export const dynamic = "force-dynamic";

// Fetch every chapter of a book. Reuses the per-chapter repository call across
// all of the book's chapters — there is no whole-book read on the repo, and
// adding one for a once-per-book offline download isn't worth the surface area.
async function fetchAllVerses(
  repo: IVerseRepository,
  abbrev: string,
): Promise<Verse[]> {
  // Books top out at 150 chapters (Psalms); most are far fewer. We probe
  // chapters sequentially until a chapter returns empty, which marks the end
  // of the book. findByAbbrevAndChapter is Data-Cache memoized, so repeated
  // offline downloads are cheap.
  const all: Verse[] = [];
  let chapter = 1;
  // Hard ceiling guards against a malformed abbrev never terminating.
  const MAX_CHAPTERS = 160;
  while (chapter <= MAX_CHAPTERS) {
    const verses = await repo.findByAbbrevAndChapter(abbrev, chapter);
    if (verses.length === 0) break;
    all.push(...verses);
    chapter++;
  }
  return all;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<Params> },
) {
  try {
    const { abbrev } = await params;
    const repo = new MongoVerseRepository();
    const verses = await fetchAllVerses(repo, abbrev);
    return buildBookVersesResponse(abbrev, verses);
  } catch (err) {
    return serverError(err);
  }
}
