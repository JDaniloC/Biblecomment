import { NextResponse } from "next/server";
import { MongoVerseRepository } from "@/infrastructure/repositories/MongoVerseRepository";
import { serverError } from "@/lib/get-session";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    if (!q || q.length < 2) return NextResponse.json([]);

    const repo = new MongoVerseRepository();
    const verses = await repo.searchByText(q, 15);

    return NextResponse.json(
      verses.map((v) => ({
        _id: v._id,
        reference: v.reference ?? `${v.abbrev} ${v.chapter}:${v.verseNumber}`,
        abbrev: v.abbrev,
        chapter: v.chapter,
        verseNumber: v.verseNumber,
        text: v.text,
      }))
    );
  } catch (err) {
    return serverError(err);
  }
}
