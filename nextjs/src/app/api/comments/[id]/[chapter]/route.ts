import { NextResponse } from "next/server";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { MongoVerseRepository } from "@/infrastructure/repositories/MongoVerseRepository";
import { GetVerseCommentsUseCase } from "@/application/use-cases/CommentUseCases";
import { serverError } from "@/lib/get-session";

type Params = { id: string; chapter: string };

export async function GET(_req: Request, { params }: { params: Promise<Params> }) {
  try {
    const { id: abbrev, chapter } = await params;
    const verseRepo = new MongoVerseRepository();
    const verses = await verseRepo.findByAbbrevAndChapter(abbrev, parseInt(chapter, 10));

    const commentRepo = new MongoCommentRepository();
    const useCase = new GetVerseCommentsUseCase(commentRepo);

    const titleComments: object[] = [];
    const verseComments: object[] = [];

    for (const verse of verses) {
      const comments = await useCase.execute(verse._id!);
      for (const c of comments) {
        if (c.onTitle) {
          titleComments.push(c);
        } else {
          verseComments.push(c);
        }
      }
    }

    return NextResponse.json({ titleComments, verseComments });
  } catch (err) {
    return serverError(err);
  }
}
