import { NextResponse } from "next/server";
import { MongoDiscussionRepository } from "@/infrastructure/repositories/MongoDiscussionRepository";
import { MongoBookRepository } from "@/infrastructure/repositories/MongoBookRepository";
import { MongoNotificationRepository } from "@/infrastructure/repositories/MongoNotificationRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import {
  GetDiscussionsUseCase,
  CreateDiscussionUseCase,
  AddAnswerUseCase,
  DeleteDiscussionUseCase,
} from "@/application/use-cases/DiscussionUseCases";
import { CreateNotificationUseCase } from "@/application/use-cases/NotificationUseCases";
import { NotifyMentionsUseCase } from "@/application/use-cases/NotifyMentionsUseCase";
import { getSessionUser, unauthorized, forbidden, notFound, serverError } from "@/lib/get-session";
import { parseBody } from "@/lib/parse-body";
import { CreateDiscussionSchema, AddAnswerSchema } from "@/lib/schemas";

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
    const parsed = await parseBody(req, AddAnswerSchema);
    if (!parsed.ok) return parsed.response;

    const repo = new MongoDiscussionRepository();
    const useCase = new AddAnswerUseCase(repo);
    const discussion = await useCase.execute(id, { name: user.username, text: parsed.data.text });

    const notifRepo = new MongoNotificationRepository();
    const userRepo = new MongoUserRepository();
    const url = `/discussion/${discussion.bookAbbrev}/${id}`;

    const notifyOwner = new CreateNotificationUseCase(notifRepo);
    await notifyOwner.execute({
      recipient: discussion.username,
      actor: user.username,
      type: "discussion_answer",
      resourceType: "discussion",
      resourceId: id,
      message: `@${user.username} respondeu sua discussão`,
      url,
    });

    const notifyMentions = new NotifyMentionsUseCase(userRepo, notifRepo);
    await notifyMentions.execute({
      text: parsed.data.text,
      actor: user.username,
      type: "answer_mention",
      resourceType: "discussion",
      resourceId: id,
      url,
    });

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
