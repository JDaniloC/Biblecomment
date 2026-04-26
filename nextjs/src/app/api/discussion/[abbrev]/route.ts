import { NextResponse } from "next/server";
import { MongoDiscussionRepository } from "@/infrastructure/repositories/MongoDiscussionRepository";
import { MongoBookRepository } from "@/infrastructure/repositories/MongoBookRepository";
import {
  GetDiscussionsUseCase,
  CreateDiscussionUseCase,
} from "@/application/use-cases/DiscussionUseCases";
import { getSessionUser, unauthorized, serverError } from "@/lib/get-session";
import { parseBody } from "@/lib/parse-body";
import { CreateDiscussionSchema } from "@/lib/schemas";

type Params = { abbrev: string };

export const dynamic = "force-dynamic";

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
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request, { params }: { params: Promise<Params> }) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { abbrev } = await params;
    const parsed = await parseBody(req, CreateDiscussionSchema);
    if (!parsed.ok) return parsed.response;
    const { verseReference, verseText, commentText, question, commentId } = parsed.data;

    const repo = new MongoDiscussionRepository();
    const useCase = new CreateDiscussionUseCase(repo);
    const discussion = await useCase.execute(
      abbrev.toLowerCase(),
      user.username,
      verseReference,
      verseText,
      commentText,
      question,
      commentId,
    );

    return NextResponse.json(discussion, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}
