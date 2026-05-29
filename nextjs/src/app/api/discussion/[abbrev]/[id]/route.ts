import { NextResponse } from "next/server";
import { MongoDiscussionRepository } from "@/infrastructure/repositories/MongoDiscussionRepository";
import { MongoDiscussionAnswerRepository } from "@/infrastructure/repositories/MongoDiscussionAnswerRepository";
import { MongoNotificationRepository } from "@/infrastructure/repositories/MongoNotificationRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { MongoDiscussionLikeRepository } from "@/infrastructure/repositories/MongoDiscussionLikeRepository";
import {
  GetDiscussionByIdUseCase,
  AddAnswerUseCase,
  DeleteDiscussionUseCase,
} from "@/application/use-cases/DiscussionUseCases";
import { CreateNotificationUseCase } from "@/application/use-cases/NotificationUseCases";
import { NotifyMentionsUseCase } from "@/application/use-cases/NotifyMentionsUseCase";
import { getSessionUser, unauthorized, forbidden, notFound, serverError } from "@/lib/get-session";
import { parseBody } from "@/lib/parse-body";
import { toDiscussionWire } from "@/lib/discussion-wire";
import { AddAnswerSchema } from "@/lib/schemas";

type Params = { abbrev: string; id: string };

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<Params> }) {
  try {
    const { id } = await params;
    const viewer = await getSessionUser();
    // Hydrate answers from the new collection so the client gets the
    // historical { _id, name, text } shape on `discussion.answers`, plus
    // author verification and like stats (discussion + each answer).
    const useCase = new GetDiscussionByIdUseCase(
      new MongoDiscussionRepository(),
      new MongoDiscussionAnswerRepository(),
      new MongoUserRepository(),
      new MongoDiscussionLikeRepository(),
    );
    const discussion = await useCase.execute(id, viewer?.id);
    if (!discussion) return notFound("Discussão não encontrada");
    return NextResponse.json(toDiscussionWire(discussion));
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

    const userRepo = new MongoUserRepository();
    const useCase = new AddAnswerUseCase(
      new MongoDiscussionRepository(),
      new MongoDiscussionAnswerRepository(),
      userRepo,
    );
    const discussion = await useCase.execute(id, user.id, user.username, parsed.data.text);

    const notifRepo = new MongoNotificationRepository();
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

    return NextResponse.json(toDiscussionWire(discussion));
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
    const useCase = new DeleteDiscussionUseCase(
      new MongoDiscussionRepository(),
      new MongoDiscussionAnswerRepository(),
    );
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

