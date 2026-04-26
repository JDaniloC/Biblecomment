import { NextResponse } from "next/server";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { GetAllCommentsUseCase } from "@/application/use-cases/CommentUseCases";
import { BackupCommentsUseCase } from "@/application/use-cases/BackupUseCases";
import { getSessionUser, forbidden, serverError } from "@/lib/get-session";
import { Comment } from "@/domain/entities/Comment";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user?.moderator) return forbidden();

    const repo = new MongoCommentRepository();
    const useCase = new GetAllCommentsUseCase(repo);
    return NextResponse.json(await useCase.execute());
  } catch {
    return serverError();
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user?.moderator) return forbidden();

    const body = (await req.json()) as { comments?: Comment[] };
    const { comments = [] } = body;

    const repo = new MongoCommentRepository();
    for (const comment of comments) {
      await repo.create({
        verseId: comment.verseId,
        username: comment.username,
        onTitle: comment.onTitle,
        bookReference: comment.bookReference,
        text: comment.text,
        tags: comment.tags ?? [],
        reports: comment.reports ?? [],
        likes: comment.likes ?? [],
      });
    }

    return NextResponse.json({ imported: comments.length }, { status: 201 });
  } catch {
    return serverError();
  }
}

