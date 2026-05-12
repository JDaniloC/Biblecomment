import { NextResponse } from "next/server";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { MongoVerseRepository } from "@/infrastructure/repositories/MongoVerseRepository";
import { GetVerseCommentsUseCase } from "@/application/use-cases/CommentUseCases";
import { notFound, serverError } from "@/lib/get-session";

type Params = { id: string; chapter: string; verse: string };

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<Params> }) {
  try {
    const { id: abbrev, chapter, verse } = await params;
    const verseRepo = new MongoVerseRepository();
    const verseDoc = await verseRepo.findByAbbrevChapterVerse(
      abbrev,
      parseInt(chapter, 10),
      parseInt(verse, 10)
    );

    if (!verseDoc) return notFound("Versículo não encontrado");

    const commentRepo = new MongoCommentRepository();
    const useCase = new GetVerseCommentsUseCase(commentRepo);
    const comments = await useCase.execute(verseDoc._id!);

    const titleComments = comments.filter((c) => c.onTitle);
    const verseComments = comments.filter((c) => !c.onTitle);

    return NextResponse.json({ titleComments, verseComments });
  } catch (err) {
    return serverError(err);
  }
}
