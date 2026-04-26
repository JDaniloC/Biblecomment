import { NextResponse } from "next/server";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { MongoVerseRepository } from "@/infrastructure/repositories/MongoVerseRepository";
import { serverError } from "@/lib/get-session";

const SPECIAL: Record<string, string> = { jó: "job", jn: "jn" };

function parseBookRef(bookRef: string): { abbrev: string; chapter: number; verse: number } | null {
  const tokens = bookRef.trim().split(" ");
  if (tokens.length < 2) return null;
  const ref = tokens[tokens.length - 1];
  const abbrevRaw = tokens.slice(0, -1).join("").toLowerCase();
  const abbrev = SPECIAL[abbrevRaw] ?? abbrevRaw;
  const [chStr, vStr] = ref.split(":");
  const chapter = parseInt(chStr, 10);
  const verse = parseInt(vStr, 10);
  if (!abbrev || isNaN(chapter) || isNaN(verse)) return null;
  return { abbrev, chapter, verse };
}

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
