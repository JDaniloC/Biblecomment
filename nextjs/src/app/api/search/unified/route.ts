import { NextResponse } from "next/server";
import { MongoBookRepository } from "@/infrastructure/repositories/MongoBookRepository";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { MongoVerseRepository } from "@/infrastructure/repositories/MongoVerseRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { serverError } from "@/lib/get-session";
import { parseBookRef } from "@/lib/parse-book-ref";
import { tryParseReference } from "@/lib/parse-reference";
import type { Verse } from "@/domain/entities/Verse";

export const dynamic = "force-dynamic";

const VERSE_LIMIT = 6;
const COMMENT_LIMIT = 6;
const USER_LIMIT = 6;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? searchParams.get("text") ?? "").trim();
    if (!q || q.length < 2) {
      return NextResponse.json({ verses: [], comments: [], users: [] });
    }

    // `@foo` switches the search into user-lookup mode: prefix match on
    // username, no verse/comment search. Empty `@` alone (just the sigil)
    // is treated as not-yet-typed.
    if (q.startsWith("@")) {
      const prefix = q.slice(1).toLowerCase();
      if (!prefix) return NextResponse.json({ verses: [], comments: [], users: [] });
      const userRepo = new MongoUserRepository();
      const users = await userRepo.searchByUsernamePrefix(prefix, USER_LIMIT);
      return NextResponse.json({ verses: [], comments: [], users });
    }

    const verseRepo = new MongoVerseRepository();
    const commentRepo = new MongoCommentRepository();
    const bookRepo = new MongoBookRepository();

    // Reference detection runs first — if the query parses as "Gn 1:1" or
    // "Gênesis 1", we resolve it from the book/verse table. Reference hits
    // are prepended to verses; text search fills the rest of the budget so
    // typing a reference doesn't blow away the textual results.
    const books = await bookRepo.findAll();
    const reference = tryParseReference(q, books);

    let referenceVerses: Verse[] = [];
    if (reference) {
      if (reference.verse !== undefined) {
        const v = await verseRepo.findByAbbrevChapterVerse(
          reference.abbrev,
          reference.chapter,
          reference.verse,
        );
        if (v) referenceVerses = [v];
      } else {
        referenceVerses = (await verseRepo.findByAbbrevAndChapter(reference.abbrev, reference.chapter)).slice(0, VERSE_LIMIT);
      }
    }

    const remainingTextVerseBudget = Math.max(0, VERSE_LIMIT - referenceVerses.length);
    const [textVerses, comments] = await Promise.all([
      remainingTextVerseBudget > 0 ? verseRepo.searchByText(q, remainingTextVerseBudget) : Promise.resolve<Verse[]>([]),
      commentRepo.searchByText(q),
    ]);

    // Dedup textVerses against reference hits so the same verse doesn't
    // appear twice when text inside it also matches the query.
    const refIds = new Set(referenceVerses.map((v) => String(v._id)));
    const mergedVerses = [
      ...referenceVerses,
      ...textVerses.filter((v) => !refIds.has(String(v._id))),
    ].slice(0, VERSE_LIMIT);

    return NextResponse.json({
      users: [] as Array<{ username: string; displayName?: string }>,
      verses: mergedVerses.map((v) => ({
        _id: String(v._id),
        reference: v.reference ?? `${v.abbrev} ${v.chapter}:${v.verseNumber}`,
        abbrev: v.abbrev,
        chapter: v.chapter,
        verseNumber: v.verseNumber,
        text: v.text,
      })),
      comments: comments.slice(0, COMMENT_LIMIT).map((c) => {
        const nav = parseBookRef(c.bookReference ?? "");
        return {
          _id: String(c._id),
          bookReference: c.bookReference,
          text: c.text,
          username: c.username,
          abbrev: nav?.abbrev ?? "",
          chapter: nav?.chapter ?? 0,
          verse: nav?.verse ?? 0,
        };
      }),
    });
  } catch (err) {
    return serverError(err);
  }
}
