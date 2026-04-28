"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { ClearReportsUseCase } from "@/application/use-cases/CommentUseCases";
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
 */
export async function clearReportsAction(
  commentId: string,
): Promise<ActionResult<{ _id: string; reports: string[] }>> {
  const session = await auth();
  if (!session?.user) return authError();
  if (!session.user.moderator) return { ok: false, error: "Forbidden" };

  try {
    const repo = new MongoCommentRepository();
    const useCase = new ClearReportsUseCase(repo);
    const updated = await useCase.execute(commentId);

    logger.info(
      { actor: session.user.email, commentId, action: "clear_reports" },
      "comment reports cleared",
    );

    revalidatePath("/admin/moderation", "page");
    return {
      ok: true,
      data: { _id: updated._id ?? commentId, reports: updated.reports },
    };
  } catch (err) {
    if (err instanceof Error && err.message === "Comment not found") {
      return { ok: false, error: "NotFound" };
    }
    logger.error({ err, action: "clearReportsAction", commentId }, "clear reports failed");
    return appError(err, "Erro ao limpar relatórios.");
  }
}
