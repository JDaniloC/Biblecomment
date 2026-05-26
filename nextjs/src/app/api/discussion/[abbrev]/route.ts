import { NextResponse } from "next/server";
import { MongoDiscussionRepository } from "@/infrastructure/repositories/MongoDiscussionRepository";
import { MongoBookRepository } from "@/infrastructure/repositories/MongoBookRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
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
    const parsed = parseInt(searchParams.get("pages") ?? "1", 10);
    const page = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    const pageSize = 5;

    const bookRepo = new MongoBookRepository();
    const book = await bookRepo.findByAbbrev(abbrev.toLowerCase());
    if (!book) return NextResponse.json([]);

    const repo = new MongoDiscussionRepository();
    const useCase = new GetDiscussionsUseCase(repo);
    const items = await useCase.execute(abbrev.toLowerCase(), { page, pageSize });
    return NextResponse.json(items);
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
    const useCase = new CreateDiscussionUseCase(repo, new MongoUserRepository());
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
