import { NextResponse } from "next/server";
import { MongoDiscussionRepository } from "@/infrastructure/repositories/MongoDiscussionRepository";
import { MongoBookRepository } from "@/infrastructure/repositories/MongoBookRepository";
import {
  GetDiscussionsUseCase,
  CreateDiscussionUseCase,
  AddAnswerUseCase,
  DeleteDiscussionUseCase,
} from "@/application/use-cases/DiscussionUseCases";
import { getSessionUser, unauthorized, forbidden, badRequest, notFound, serverError } from "@/lib/get-session";

type Params = { abbrev: string };

export async function GET(req: Request, { params }: { params: Promise<Params> }) {
  try {
    const { abbrev } = await params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("pages") ?? "1", 10);
    const pageSize = 5;

    const bookRepo = new MongoBookRepository();
    const book = await bookRepo.findByAbbrev(abbrev.toLowerCase());
    if (!book) return NextResponse.json([]);

    const repo = new MongoDiscussionRepository();
    const useCase = new GetDiscussionsUseCase(repo);
    const all = await useCase.execute(abbrev.toLowerCase());
    return NextResponse.json(all.slice((page - 1) * pageSize, page * pageSize));
  } catch {
    return serverError();
  }
}

export async function POST(req: Request, { params }: { params: Promise<Params> }) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { abbrev } = await params;
    const body = (await req.json()) as {
      verseReference?: string;
      verseText?: string;
      commentText?: string;
      question?: string;
      commentId?: string;
    };
    const { verseReference, verseText = "", commentText = "", question, commentId } = body;

    if (!verseReference || !question) {
      return badRequest("Campos obrigatórios: verseReference, question");
    }

    const repo = new MongoDiscussionRepository();
    const useCase = new CreateDiscussionUseCase(repo);
    const discussion = await useCase.execute(
      abbrev.toLowerCase(),
      user.username,
      verseReference,
      verseText,
      commentText,
      question,
      commentId
    );

    return NextResponse.json(discussion, { status: 201 });
  } catch {
    return serverError();
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<Params> }) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { abbrev: id } = await params;
    const body = (await req.json()) as { text?: string };
    const { text } = body;
    if (!text) return badRequest("text é obrigatório");

    const repo = new MongoDiscussionRepository();
    const useCase = new AddAnswerUseCase(repo);
    const discussion = await useCase.execute(id, { name: user.username, text });
    return NextResponse.json(discussion);
  } catch (err) {
    if (err instanceof Error && err.message === "Discussion not found") {
      return notFound("Discussão não encontrada");
    }
    return serverError();
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<Params> }) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { abbrev: id } = await params;
    const repo = new MongoDiscussionRepository();
    const useCase = new DeleteDiscussionUseCase(repo);
    await useCase.execute(id, user.username, user.moderator);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthorized") return forbidden();
      if (err.message === "Discussion not found") return notFound("Discussão não encontrada");
    }
    return serverError();
  }
}
