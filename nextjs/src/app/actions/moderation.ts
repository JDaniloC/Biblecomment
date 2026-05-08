"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { MongoCommentReportRepository } from "@/infrastructure/repositories/MongoCommentReportRepository";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import {
  ClearReportsUseCase,
  ToggleCommentVerifiedUseCase,
} from "@/application/use-cases/CommentUseCases";
import type { Comment } from "@/domain/entities/Comment";
import { logger } from "@/lib/logger";
import type { ActionResult } from "./comments";

function authError(): ActionResult<never> {
  return { ok: false, error: "Unauthorized" };
}

function appError(err: unknown, fallback: string): ActionResult<never> {
  if (err instanceof Error) return { ok: false, error: err.message };
  return { ok: false, error: fallback };
}

/**
 * Drop all reports on a flagged comment. Moderator-only.
 * Replaces axios.delete(/api/moderation/reports/:id).
 *
 * Reports live in the CommentReport collection (Phase 9.2) — clearing is
 * a deleteMany on commentId, no parent doc mutation required.
 */
export async function clearReportsAction(
  commentId: string,
): Promise<ActionResult<{ _id: string; cleared: number }>> {
  const session = await auth();
  if (!session?.user) return authError();
  if (!session.user.moderator) return { ok: false, error: "Forbidden" };

  try {
    const useCase = new ClearReportsUseCase(new MongoCommentReportRepository());
    const result = await useCase.execute(commentId);

    logger.info(
      { actor: session.user.email, commentId, cleared: result.cleared, action: "clear_reports" },
      "comment reports cleared",
    );

    revalidatePath("/admin/moderation", "page");
    return { ok: true, data: { _id: result.commentId, cleared: result.cleared } };
  } catch (err) {
    logger.error({ err, action: "clearReportsAction", commentId }, "clear reports failed");
    return appError(err, "Erro ao limpar relatórios.");
  }
}

/**
 * Flip the admin-verified flag on a comment. Toggles based on the current
 * value — caller doesn't need to know the prior state. Records the
 * moderator's username + timestamp when verifying; clears them on unverify.
 */
export async function toggleCommentVerifiedAction(
  commentId: string,
): Promise<ActionResult<Comment>> {
  const session = await auth();
  if (!session?.user) return authError();
  if (!session.user.moderator) return { ok: false, error: "Forbidden" };

  try {
    const useCase = new ToggleCommentVerifiedUseCase(new MongoCommentRepository());
    const updated = await useCase.execute(commentId, session.user.username);

    logger.info(
      {
        actor: session.user.email,
        commentId,
        verified: updated.verified,
        action: "toggle_comment_verified",
      },
      "comment verified state toggled",
    );

    revalidatePath("/admin/moderation", "page");
    return { ok: true, data: updated };
  } catch (err) {
    logger.error(
      { err, action: "toggleCommentVerifiedAction", commentId },
      "toggle verified failed",
    );
    return appError(err, "Erro ao atualizar verificação.");
  }
}
