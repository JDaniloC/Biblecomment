import { NextResponse } from "next/server";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { MongoVerseRepository } from "@/infrastructure/repositories/MongoVerseRepository";
import { serverError } from "@/lib/get-session";
import { parseBookRef } from "@/lib/parse-book-ref";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? searchParams.get("text") ?? "").trim();
    if (!q || q.length < 2) return NextResponse.json({ verses: [], comments: [] });

    const [verseRepo, commentRepo] = [new MongoVerseRepository(), new MongoCommentRepository()];

    const [verses, comments] = await Promise.all([
      verseRepo.searchByText(q, 6),
      commentRepo.searchByText(q),
    ]);

    return NextResponse.json({
      verses: verses.slice(0, 6).map((v) => ({
        _id: String(v._id),
        reference: v.reference ?? `${v.abbrev} ${v.chapter}:${v.verseNumber}`,
        abbrev: v.abbrev,
        chapter: v.chapter,
        verseNumber: v.verseNumber,
        text: v.text,
      })),
      comments: comments.slice(0, 6).map((c) => {
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
