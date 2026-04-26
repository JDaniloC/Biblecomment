import { NextResponse } from "next/server";
import { MongoVerseRepository } from "@/infrastructure/repositories/MongoVerseRepository";
import { GetVersesByChapterUseCase } from "@/application/use-cases/BookUseCases";
import { badRequest, serverError } from "@/lib/get-session";

type Params = { abbrev: string; chapter: string };

export async function GET(_req: Request, { params }: { params: Promise<Params> }) {
  try {
    const { abbrev, chapter } = await params;
    const chapterNum = parseInt(chapter, 10);
    if (isNaN(chapterNum)) return badRequest("Invalid chapter");
    const repo = new MongoVerseRepository();
    const useCase = new GetVersesByChapterUseCase(repo);
    const verses = await useCase.execute(abbrev, chapterNum);
    return NextResponse.json(verses);
  } catch (err) {
    return serverError(err);
  }
}
