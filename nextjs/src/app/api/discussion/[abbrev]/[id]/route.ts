import { NextResponse } from "next/server";
import { MongoDiscussionRepository } from "@/infrastructure/repositories/MongoDiscussionRepository";
import { MongoNotificationRepository } from "@/infrastructure/repositories/MongoNotificationRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import {
  GetDiscussionByIdUseCase,
  AddAnswerUseCase,
  DeleteDiscussionUseCase,
} from "@/application/use-cases/DiscussionUseCases";
import { CreateNotificationUseCase } from "@/application/use-cases/NotificationUseCases";
import { NotifyMentionsUseCase } from "@/application/use-cases/NotifyMentionsUseCase";
import { getSessionUser, unauthorized, forbidden, notFound, serverError } from "@/lib/get-session";
import { parseBody } from "@/lib/parse-body";
import { AddAnswerSchema } from "@/lib/schemas";

type Params = { abbrev: string; id: string };

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<Params> }) {
  try {
    const { id } = await params;
    const repo = new MongoDiscussionRepository();
    const useCase = new GetDiscussionByIdUseCase(repo);
    const discussion = await useCase.execute(id);
    if (!discussion) return notFound("Discussão não encontrada");
    return NextResponse.json(discussion);
  } catch (err) {
    return serverError(err);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<Params> }) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { id } = await params;
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
    return serverError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<Params> }) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { id } = await params;
    const repo = new MongoDiscussionRepository();
    const useCase = new DeleteDiscussionUseCase(repo);
    await useCase.execute(id, user.username, user.moderator);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthorized") return forbidden();
      if (err.message === "Discussion not found") return notFound("Discussão não encontrada");
    }
    return serverError(err);
  }
}
