"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { MongoDiscussionRepository } from "@/infrastructure/repositories/MongoDiscussionRepository";
import { MongoNotificationRepository } from "@/infrastructure/repositories/MongoNotificationRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import {
  CreateDiscussionUseCase,
  AddAnswerUseCase,
  UpdateAnswerUseCase,
  DeleteDiscussionUseCase,
} from "@/application/use-cases/DiscussionUseCases";
import { CreateNotificationUseCase } from "@/application/use-cases/NotificationUseCases";
import { NotifyMentionsUseCase } from "@/application/use-cases/NotifyMentionsUseCase";
import type { Discussion } from "@/domain/entities/Discussion";
import type { DiscussionDraft } from "@/services/discussions";
import { logger } from "@/lib/logger";
import type { ActionResult } from "./comments";

function authError(): ActionResult<never> {
  return { ok: false, error: "Unauthorized" };
}

function appError(err: unknown, fallback: string): ActionResult<never> {
  if (err instanceof Error) return { ok: false, error: err.message };
  return { ok: false, error: fallback };
}

function revalidateDiscussionPaths() {
  revalidatePath("/discussion/[abbrev]/[id]", "page");
  revalidatePath("/discussions", "page");
}

/**
 * Create a discussion under a book.
 * Replaces axios.post(/api/discussion/:abbrev).
 */
export async function createDiscussionAction(
  bookAbbrev: string,
  draft: DiscussionDraft,
): Promise<ActionResult<Discussion>> {
  const session = await auth();
  if (!session?.user) return authError();

  if (!draft.verseReference || !draft.question) {
    return { ok: false, error: "verseReference e question são obrigatórios" };
  }

  try {
    const repo = new MongoDiscussionRepository();
    const useCase = new CreateDiscussionUseCase(repo);
    const discussion = await useCase.execute(
      bookAbbrev.toLowerCase(),
      session.user.username,
      draft.verseReference,
      draft.verseText ?? "",
      draft.commentText ?? "",
      draft.question,
      draft.commentId,
    );

    revalidateDiscussionPaths();
    return { ok: true, data: discussion };
  } catch (err) {
    logger.error({ err, action: "createDiscussionAction", bookAbbrev }, "create discussion failed");
    return appError(err, "Erro ao criar discussão.");
  }
}

/**
 * Add an answer to a discussion. Notifies the discussion owner and any
 * @-mentioned users. Replaces axios.patch(/api/discussion/:abbrev/:id).
 */
export async function addAnswerAction(
  bookAbbrev: string,
  discussionId: string,
  text: string,
): Promise<ActionResult<Discussion>> {
  const session = await auth();
  if (!session?.user) return authError();

  if (!text || !text.trim()) {
    return { ok: false, error: "text é obrigatório" };
  }

  try {
    const repo = new MongoDiscussionRepository();
    const useCase = new AddAnswerUseCase(repo);
    const discussion = await useCase.execute(discussionId, {
      name: session.user.username,
      text,
    });

    const notifRepo = new MongoNotificationRepository();
    const userRepo = new MongoUserRepository();
    const url = `/discussion/${discussion.bookAbbrev}/${discussionId}`;

    const notifyOwner = new CreateNotificationUseCase(notifRepo);
    await notifyOwner.execute({
      recipient: discussion.username,
      actor: session.user.username,
      type: "discussion_answer",
      resourceType: "discussion",
      resourceId: discussionId,
      message: `@${session.user.username} respondeu sua discussão`,
      url,
    });

    const notifyMentions = new NotifyMentionsUseCase(userRepo, notifRepo);
    await notifyMentions.execute({
      text,
      actor: session.user.username,
      type: "answer_mention",
      resourceType: "discussion",
      resourceId: discussionId,
      url,
    });

    revalidateDiscussionPaths();
    return { ok: true, data: discussion };
  } catch (err) {
    if (err instanceof Error && err.message === "Discussion not found") {
      return { ok: false, error: "NotFound" };
    }
    logger.error(
      { err, action: "addAnswerAction", bookAbbrev, discussionId },
      "add answer failed",
    );
    return appError(err, "Erro ao adicionar resposta.");
  }
}

/**
 * Edit an existing answer. Owner OR moderator — UpdateAnswerUseCase enforces.
 */
export async function updateAnswerAction(
  bookAbbrev: string,
  discussionId: string,
  answerId: string,
  text: string,
): Promise<ActionResult<Discussion>> {
  const session = await auth();
  if (!session?.user) return authError();

  if (!text || !text.trim()) {
    return { ok: false, error: "text é obrigatório" };
  }

  try {
    const repo = new MongoDiscussionRepository();
    const useCase = new UpdateAnswerUseCase(repo);
    const discussion = await useCase.execute(
      discussionId,
      answerId,
      session.user.username,
      session.user.moderator,
      text,
    );

    revalidateDiscussionPaths();
    return { ok: true, data: discussion };
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthorized") return { ok: false, error: "Forbidden" };
      if (err.message === "Discussion not found" || err.message === "Answer not found") {
        return { ok: false, error: "NotFound" };
      }
    }
    logger.error(
      { err, action: "updateAnswerAction", bookAbbrev, discussionId, answerId },
      "update answer failed",
    );
    return appError(err, "Erro ao atualizar resposta.");
  }
}

/**
 * Delete a discussion. Owner OR moderator only — DeleteDiscussionUseCase enforces.
 */
export async function deleteDiscussionAction(
  bookAbbrev: string,
  discussionId: string,
): Promise<ActionResult<{ deleted: true }>> {
  const session = await auth();
  if (!session?.user) return authError();

  try {
    const repo = new MongoDiscussionRepository();
    const useCase = new DeleteDiscussionUseCase(repo);
    await useCase.execute(discussionId, session.user.username, session.user.moderator);
    revalidateDiscussionPaths();
    return { ok: true, data: { deleted: true } };
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthorized") return { ok: false, error: "Forbidden" };
      if (err.message === "Discussion not found") return { ok: false, error: "NotFound" };
    }
    logger.error(
      { err, action: "deleteDiscussionAction", bookAbbrev, discussionId },
      "delete discussion failed",
    );
    return appError(err, "Erro ao excluir discussão.");
  }
}
