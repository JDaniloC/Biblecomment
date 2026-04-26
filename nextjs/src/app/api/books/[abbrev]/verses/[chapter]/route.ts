import { NextResponse } from "next/server";
import { MongoVerseRepository } from "@/infrastructure/repositories/MongoVerseRepository";
import { GetVersesByChapterUseCase } from "@/application/use-cases/BookUseCases";

type Params = { abbrev: string; chapter: string };

export async function GET(_req: Request, { params }: { params: Promise<Params> }) {
  try {
    const { abbrev, chapter } = await params;
    const chapterNum = parseInt(chapter, 10);
    if (isNaN(chapterNum)) {
      return NextResponse.json({ error: "Invalid chapter" }, { status: 400 });
    }
    const repo = new MongoVerseRepository();
    const useCase = new GetVersesByChapterUseCase(repo);
    const verses = await useCase.execute(abbrev, chapterNum);
    return NextResponse.json(verses);
  } catch (err) {
    console.error("GET /api/books/[abbrev]/verses/[chapter] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
