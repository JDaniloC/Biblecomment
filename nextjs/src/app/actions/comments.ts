"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import {
  ToggleLikeUseCase,
  ReportCommentUseCase,
  DeleteCommentUseCase,
} from "@/application/use-cases/CommentUseCases";
import type { Comment } from "@/domain/entities/Comment";
import { logger } from "@/lib/logger";

/**
 * Discriminated-union return type lets callers pattern-match on `ok`
 * without throwing/catching across the network boundary. Server Actions
 * serialize this directly to the client.
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function authError(): ActionResult<never> {
  return { ok: false, error: "Unauthorized" };
}

function appError(err: unknown, fallback: string): ActionResult<never> {
  if (err instanceof Error) return { ok: false, error: err.message };
  return { ok: false, error: fallback };
}

/**
 * Toggle the current user in/out of the comment's `likes` array.
 * Server Action — replaces axios.patch(/api/comments/[id], { action: "like" }).
 */
export async function toggleLikeAction(
  commentId: string,
): Promise<ActionResult<Comment>> {
  const session = await auth();
  if (!session?.user) return authError();

  try {
    const repo = new MongoCommentRepository();
    const useCase = new ToggleLikeUseCase(repo);
    const updated = await useCase.execute(commentId, session.user.username);
    // Chapter pages render the like count server-side; revalidate so the
    // server-rendered HTML reflects the new state on next navigation.
    revalidatePath("/verses/[abbrev]/[number]", "page");
    return { ok: true, data: updated };
  } catch (err) {
    logger.error({ err, action: "toggleLikeAction", commentId }, "toggle like failed");
    return appError(err, "Erro ao curtir.");
  }
}

/**
 * Add the current user to the comment's `reports` array. Idempotent —
 * Mongo's $addToSet means reporting twice has no effect.
 */
export async function reportCommentAction(
  commentId: string,
): Promise<ActionResult<Comment>> {
  const session = await auth();
  if (!session?.user) return authError();

  try {
    const repo = new MongoCommentRepository();
    const useCase = new ReportCommentUseCase(repo);
    const updated = await useCase.execute(commentId, session.user.username);
    revalidatePath("/verses/[abbrev]/[number]", "page");
    return { ok: true, data: updated };
  } catch (err) {
    logger.error({ err, action: "reportCommentAction", commentId }, "report failed");
    return appError(err, "Erro ao reportar.");
  }
}

/**
 * Delete a comment. Owner OR moderator only — the use case enforces.
 */
export async function deleteCommentAction(
  commentId: string,
): Promise<ActionResult<{ deleted: true }>> {
  const session = await auth();
  if (!session?.user) return authError();

  try {
    const repo = new MongoCommentRepository();
    const useCase = new DeleteCommentUseCase(repo);
    await useCase.execute(commentId, session.user.username, session.user.moderator);
    revalidatePath("/verses/[abbrev]/[number]", "page");
    return { ok: true, data: { deleted: true } };
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return { ok: false, error: "Forbidden" };
    }
    logger.error({ err, action: "deleteCommentAction", commentId }, "delete failed");
    return appError(err, "Erro ao excluir.");
  }
}
