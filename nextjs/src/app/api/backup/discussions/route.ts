import { NextResponse } from "next/server";
import { MongoDiscussionRepository } from "@/infrastructure/repositories/MongoDiscussionRepository";
import { BackupDiscussionsUseCase } from "@/application/use-cases/BackupUseCases";
import { getSessionUser, forbidden, serverError } from "@/lib/get-session";
import { Discussion } from "@/domain/entities/Discussion";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user?.moderator) return forbidden();

    const repo = new MongoDiscussionRepository();
    const useCase = new BackupDiscussionsUseCase(repo);
    return NextResponse.json(await useCase.execute());
  } catch {
    return serverError();
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user?.moderator) return forbidden();

    const body = (await req.json()) as { discussions?: Discussion[] };
    const { discussions = [] } = body;

    const repo = new MongoDiscussionRepository();
    for (const d of discussions) {
      await repo.create({
        bookAbbrev: d.bookAbbrev,
        commentId: d.commentId,
        username: d.username,
        verseReference: d.verseReference,
        verseText: d.verseText,
        commentText: d.commentText,
        question: d.question,
        answers: d.answers ?? [],
      });
    }

    return NextResponse.json({ imported: discussions.length }, { status: 201 });
  } catch {
    return serverError();
  }
}
