"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { MongoDiscussionRepository } from "@/infrastructure/repositories/MongoDiscussionRepository";
import { MongoDiscussionAnswerRepository } from "@/infrastructure/repositories/MongoDiscussionAnswerRepository";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { MongoDiscussionLikeRepository } from "@/infrastructure/repositories/MongoDiscussionLikeRepository";
import { MongoNotificationRepository } from "@/infrastructure/repositories/MongoNotificationRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import {
	CreateDiscussionUseCase,
	GetDiscussionByIdUseCase,
	AddAnswerUseCase,
	UpdateAnswerUseCase,
	UpdateDiscussionUseCase,
	DeleteDiscussionUseCase,
} from "@/application/use-cases/DiscussionUseCases";
import {
	ToggleDiscussionLikeUseCase,
	type ToggleDiscussionLikeResult,
} from "@/application/use-cases/DiscussionLikeUseCases";
import type { DiscussionLikeTarget } from "@/domain/repositories/IDiscussionLikeRepository";
import { CreateNotificationUseCase } from "@/application/use-cases/NotificationUseCases";
import { NotifyMentionsUseCase } from "@/application/use-cases/NotifyMentionsUseCase";
import type { Discussion } from "@/domain/entities/Discussion";
import { toDiscussionWire, type DiscussionWire } from "@/lib/discussion-wire";
import type { DiscussionDraft } from "@/services/discussions";
import { logger } from "@/lib/logger";
import type { ActionResult } from "./comments";
import { evaluateBadges } from "./_badge-evaluator";

const MENTION_REGEX = /@[A-Za-z0-9_]+/;

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
): Promise<ActionResult<DiscussionWire>> {
	const session = await auth();
	if (!session?.user) return authError();

	if (!draft.commentId || !draft.title?.trim() || !draft.body?.trim()) {
		return { ok: false, error: "commentId, title e body são obrigatórios" };
	}

	try {
		const useCase = new CreateDiscussionUseCase(
			new MongoDiscussionRepository(),
			new MongoCommentRepository(),
			new MongoUserRepository(),
		);
		const discussion = await useCase.execute({
			bookAbbrev: bookAbbrev.toLowerCase(),
			username: session.user.username,
			commentId: draft.commentId,
			title: draft.title,
			body: draft.body,
			quoteStart: draft.quoteStart,
			quoteEnd: draft.quoteEnd,
		});

		await evaluateBadges({
			userId: session.user.id,
			username: session.user.username,
			axes: ["interaction"],
			hints: { hasOpenedDiscussion: true },
		});

		revalidateDiscussionPaths();
		return { ok: true, data: toDiscussionWire(discussion) };
	} catch (err) {
		logger.error(
			{ err, action: "createDiscussionAction", bookAbbrev },
			"create discussion failed",
		);
		return appError(err, "Erro ao criar discussão.");
	}
}

/**
 * Toggle the current user's like on a discussion or one of its answers.
 * Returns the post-toggle stats so the client can update without a re-fetch.
 */
export async function toggleDiscussionLikeAction(
	targetType: DiscussionLikeTarget,
	targetId: string,
): Promise<ActionResult<ToggleDiscussionLikeResult>> {
	const session = await auth();
	if (!session?.user) return authError();
	if (targetType !== "discussion" && targetType !== "answer") {
		return { ok: false, error: "targetType inválido" };
	}

	try {
		const useCase = new ToggleDiscussionLikeUseCase(
			new MongoDiscussionLikeRepository(),
		);
		const result = await useCase.execute(targetType, targetId, session.user.id);
		revalidateDiscussionPaths();
		return { ok: true, data: result };
	} catch (err) {
		logger.error(
			{ err, action: "toggleDiscussionLikeAction", targetType, targetId },
			"toggle discussion like failed",
		);
		return appError(err, "Erro ao curtir.");
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
): Promise<ActionResult<DiscussionWire>> {
	const session = await auth();
	if (!session?.user) return authError();

	if (!text || !text.trim()) {
		return { ok: false, error: "text é obrigatório" };
	}

	try {
		const useCase = new AddAnswerUseCase(
			new MongoDiscussionRepository(),
			new MongoDiscussionAnswerRepository(),
			new MongoUserRepository(),
		);
		const discussion = await useCase.execute(
			discussionId,
			session.user.id,
			session.user.username,
			text,
		);

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

		await evaluateBadges({
			userId: session.user.id,
			username: session.user.username,
			axes: ["interaction"],
			hints: {
				hasAnsweredDiscussion: true,
				hasMentioned: MENTION_REGEX.test(text) || undefined,
			},
		});

		revalidateDiscussionPaths();
		return { ok: true, data: toDiscussionWire(discussion) };
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
): Promise<ActionResult<DiscussionWire>> {
	const session = await auth();
	if (!session?.user) return authError();

	if (!text || !text.trim()) {
		return { ok: false, error: "text é obrigatório" };
	}

	try {
		const useCase = new UpdateAnswerUseCase(
			new MongoDiscussionRepository(),
			new MongoDiscussionAnswerRepository(),
		);
		const discussion = await useCase.execute(
			discussionId,
			answerId,
			session.user.id,
			session.user.username,
			session.user.moderator,
			text,
		);

		revalidateDiscussionPaths();
		return { ok: true, data: toDiscussionWire(discussion) };
	} catch (err) {
		if (err instanceof Error) {
			if (err.message === "Unauthorized")
				return { ok: false, error: "Forbidden" };
			if (
				err.message === "Discussion not found" ||
				err.message === "Answer not found"
			) {
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
 * Edit a discussion's title + body. Owner OR moderator — UpdateDiscussionUseCase
 * enforces. The comment snapshot/quote stay immutable.
 */
export async function updateDiscussionAction(
  bookAbbrev: string,
  discussionId: string,
  draft: { title: string; body: string },
): Promise<ActionResult<DiscussionWire>> {
  const session = await auth();
  if (!session?.user) return authError();

  if (!draft.title?.trim() || !draft.body?.trim()) {
    return { ok: false, error: "title e body são obrigatórios" };
  }

  try {
    const useCase = new UpdateDiscussionUseCase(new MongoDiscussionRepository());
    const discussion = await useCase.execute(
      discussionId,
      session.user.username,
      session.user.moderator,
      { title: draft.title, body: draft.body },
    );

    // Re-hydrate answers + like stats so the client gets the full detail shape
    // back (update() returns the bare discussion). Cheapest correct path: read
    // it through the detail use case as the current viewer.
    const detail = await new GetDiscussionByIdUseCase(
      new MongoDiscussionRepository(),
      new MongoDiscussionAnswerRepository(),
      new MongoUserRepository(),
      new MongoDiscussionLikeRepository(),
    ).execute(discussionId, session.user.id);

    revalidateDiscussionPaths();
    return { ok: true, data: toDiscussionWire(detail ?? discussion) };
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthorized") return { ok: false, error: "Forbidden" };
      if (err.message === "Discussion not found") return { ok: false, error: "NotFound" };
    }
    logger.error(
      { err, action: "updateDiscussionAction", bookAbbrev, discussionId },
      "update discussion failed",
    );
    return appError(err, "Erro ao editar discussão.");
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
		const useCase = new DeleteDiscussionUseCase(
			new MongoDiscussionRepository(),
			new MongoDiscussionAnswerRepository(),
		);
		await useCase.execute(
			discussionId,
			session.user.username,
			session.user.moderator,
		);
		revalidateDiscussionPaths();
		return { ok: true, data: { deleted: true } };
	} catch (err) {
		if (err instanceof Error) {
			if (err.message === "Unauthorized")
				return { ok: false, error: "Forbidden" };
			if (err.message === "Discussion not found")
				return { ok: false, error: "NotFound" };
		}
		logger.error(
			{ err, action: "deleteDiscussionAction", bookAbbrev, discussionId },
			"delete discussion failed",
		);
		return appError(err, "Erro ao excluir discussão.");
	}
}
