import { NextResponse } from "next/server";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { MongoVerseRepository } from "@/infrastructure/repositories/MongoVerseRepository";
import {
  CreateCommentUseCase,
  UpdateCommentUseCase,
  DeleteCommentUseCase,
  ToggleLikeUseCase,
  ReportCommentUseCase,
} from "@/application/use-cases/CommentUseCases";
import { getSessionUser, unauthorized, forbidden, badRequest, notFound, serverError } from "@/lib/get-session";

type Params = { id: string };

export async function POST(req: Request, { params }: { params: Promise<Params> }) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { id: verseId } = await params;
    const body = (await req.json()) as { text?: string; tags?: string[]; on_title?: boolean };
    const { text, tags = [], on_title = false } = body;

    if (!text) return badRequest("Campos obrigatórios: text");

    const commentRepo = new MongoCommentRepository();
    const verseRepo = new MongoVerseRepository();
    const useCase = new CreateCommentUseCase(commentRepo, verseRepo);

    const comment = await useCase.execute(verseId, user.username, text, tags, on_title);
    return NextResponse.json(comment, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Verse not found") {
      return badRequest("Versículo não encontrado");
    }
    return serverError();
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<Params> }) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { id } = await params;
    const body = (await req.json()) as {
      text?: string;
      tags?: string[];
      action?: "like" | "report";
    };
    const { text, tags = [], action } = body;

    const repo = new MongoCommentRepository();

    if (action === "like") {
      const useCase = new ToggleLikeUseCase(repo);
      return NextResponse.json(await useCase.execute(id, user.username));
    }

    if (action === "report") {
      const useCase = new ReportCommentUseCase(repo);
      return NextResponse.json(await useCase.execute(id, user.username));
    }

    if (!text) return badRequest("text é obrigatório");
    const useCase = new UpdateCommentUseCase(repo);
    return NextResponse.json(await useCase.execute(id, user.username, text, tags));
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthorized") return forbidden();
      if (err.message === "Comment not found") return notFound("Comentário não encontrado");
    }
    return serverError();
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<Params> }) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { id } = await params;
    const repo = new MongoCommentRepository();
    const useCase = new DeleteCommentUseCase(repo);
    await useCase.execute(id, user.username, user.moderator);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthorized") return forbidden();
      if (err.message === "Comment not found") return notFound("Comentário não encontrado");
    }
    return serverError();
  }
}
