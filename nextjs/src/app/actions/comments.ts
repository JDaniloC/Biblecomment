"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { MongoCommentLikeRepository } from "@/infrastructure/repositories/MongoCommentLikeRepository";
import { MongoCommentReportRepository } from "@/infrastructure/repositories/MongoCommentReportRepository";
import { MongoVerseRepository } from "@/infrastructure/repositories/MongoVerseRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { MongoNotificationRepository } from "@/infrastructure/repositories/MongoNotificationRepository";
import {
  ToggleLikeUseCase,
  ReportCommentUseCase,
  DeleteCommentUseCase,
  CreateCommentUseCase,
  UpdateCommentUseCase,
  type ToggleLikeResult,
  type ReportCommentResult,
} from "@/application/use-cases/CommentUseCases";
import { NotifyMentionsUseCase } from "@/application/use-cases/NotifyMentionsUseCase";
import type { Comment } from "@/domain/entities/Comment";
import { logger } from "@/lib/logger";
import { evaluateBadges } from "./_badge-evaluator";

const MENTION_REGEX = /@[A-Za-z0-9_]+/;

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
 * Toggle the current user's like on a comment via the CommentLike collection.
 * Returns the post-toggle stats — { likeCount, likedByMe } — so the caller
 * can update the UI without a re-fetch.
 */
export async function toggleLikeAction(
  commentId: string,
): Promise<ActionResult<ToggleLikeResult>> {
  const session = await auth();
  if (!session?.user) return authError();

  try {
    const useCase = new ToggleLikeUseCase(
      new MongoCommentRepository(),
      new MongoCommentLikeRepository(),
    );
    const result = await useCase.execute(commentId, session.user.id);
    // Only fire the badge evaluator when this toggle ADDED a like — toggling
    // off doesn't progress the user toward `first-like`.
    if (result.likedByMe) {
      await evaluateBadges({
        userId: session.user.id,
        username: session.user.username,
        axes: ["interaction"],
        hints: { hasGivenLike: true },
      });
    }
    // Chapter pages render the like count server-side; revalidate so the
    // server-rendered HTML reflects the new state on next navigation.
    revalidatePath("/verses/[abbrev]/[number]", "page");
    return { ok: true, data: result };
  } catch (err) {
    logger.error({ err, action: "toggleLikeAction", commentId }, "toggle like failed");
    return appError(err, "Erro ao curtir.");
  }
}

/**
 * Insert the current user's report on a comment. Idempotent — the
 * CommentReport collection has a unique (userId, commentId) index, so
 * reporting twice is a no-op.
 */
export async function reportCommentAction(
  commentId: string,
): Promise<ActionResult<ReportCommentResult>> {
  const session = await auth();
  if (!session?.user) return authError();

  try {
    const useCase = new ReportCommentUseCase(
      new MongoCommentRepository(),
      new MongoCommentReportRepository(),
    );
    const result = await useCase.execute(
      commentId,
      session.user.id,
      session.user.username,
    );
    revalidatePath("/verses/[abbrev]/[number]", "page");
    return { ok: true, data: result };
  } catch (err) {
    logger.error({ err, action: "reportCommentAction", commentId }, "report failed");
    return appError(err, "Erro ao reportar.");
  }
}

/**
 * Create a comment on a verse (or chapter title).
 * Replaces axios.post(/api/comments/verse/:slug). The slug may be:
 *   - "<abbrev>/<chapter>/<verse>" — comment on a specific verse
 *   - "<abbrev>/<chapter>"         — title comment (uses first verse of chapter)
 *
 * Mirrors the API route in /api/comments/verse/[abbrev]/[chapter][/[verse]]
 * including NotifyMentionsUseCase wiring.
 */
export async function createCommentAction(
  verseId: string,
  draft: { text: string; tags?: string[]; onTitle?: boolean },
): Promise<ActionResult<Comment>> {
  const session = await auth();
  if (!session?.user) return authError();

  if (!draft.text || !draft.text.trim()) {
    return { ok: false, error: "text é obrigatório" };
  }

  try {
    const parts = verseId.split("/").filter(Boolean);
    if (parts.length < 2 || parts.length > 3) {
      return { ok: false, error: "Invalid verse slug" };
    }

    const abbrev = parts[0].toLowerCase();
    const chapter = parseInt(parts[1], 10);
    const verseNum = parts.length === 3 ? parseInt(parts[2], 10) : null;
    if (isNaN(chapter) || (verseNum !== null && isNaN(verseNum))) {
      return { ok: false, error: "Invalid verse slug" };
    }

    const verseRepo = new MongoVerseRepository();
    const titleSlug = parts.length === 2;
    let verse;
    if (titleSlug) {
      const verses = await verseRepo.findByAbbrevAndChapter(abbrev, chapter);
      verse = verses[0] ?? null;
    } else {
      verse = await verseRepo.findByAbbrevChapterVerse(abbrev, chapter, verseNum!);
    }
    if (!verse || !verse._id) {
      return { ok: false, error: "Verse not found" };
    }

    // Title slug forces onTitle=true (matches the chapter-level POST route).
    const onTitle = titleSlug ? true : (draft.onTitle ?? false);
    const tags = draft.tags ?? [];

    const commentRepo = new MongoCommentRepository();
    const useCase = new CreateCommentUseCase(commentRepo, verseRepo);
    const comment = await useCase.execute(
      verse._id,
      session.user.username,
      draft.text,
      tags,
      onTitle,
    );

    if (comment._id) {
      const notifyMentions = new NotifyMentionsUseCase(
        new MongoUserRepository(),
        new MongoNotificationRepository(),
      );
      await notifyMentions.execute({
        text: draft.text,
        actor: session.user.username,
        type: "comment_mention",
        resourceType: "comment",
        resourceId: comment._id,
        url: `/verses/${verse.abbrev}/${verse.chapter}#${verse.verseNumber}`,
      });
    }

    await evaluateBadges({
      userId: session.user.id,
      username: session.user.username,
      axes: ["commenter-volume", "commenter-diversity", "commenter-tags", "interaction"],
      hints: {
        hasMentioned: MENTION_REGEX.test(draft.text) || undefined,
      },
    });

    revalidatePath("/verses/[abbrev]/[number]", "page");
    // Fresh comments have no like rows — return well-formed stats so the
    // client doesn't render `Útil · ` (undefined) on the optimistic insert.
    return { ok: true, data: { ...comment, likeCount: 0, likedByMe: false } };
  } catch (err) {
    logger.error({ err, action: "createCommentAction", verseId }, "create comment failed");
    return appError(err, "Erro ao criar comentário.");
  }
}

/**
 * Update a comment's text/tags. Owner only — UpdateCommentUseCase enforces.
 */
export async function updateCommentAction(
  commentId: string,
  draft: { text: string; tags?: string[] },
): Promise<ActionResult<Comment>> {
  const session = await auth();
  if (!session?.user) return authError();

  if (!draft.text || !draft.text.trim()) {
    return { ok: false, error: "text é obrigatório" };
  }

  try {
    const repo = new MongoCommentRepository();
    const useCase = new UpdateCommentUseCase(repo);
    const updated = await useCase.execute(
      commentId,
      session.user.username,
      draft.text,
      draft.tags ?? [],
    );
    // Re-enrich so the client keeps a consistent { likeCount, likedByMe }
    // contract across create / update / read paths.
    const likeRepo = new MongoCommentLikeRepository();
    const [counts, liked] = await Promise.all([
      likeRepo.countByComment([commentId]),
      likeRepo.whichLiked(session.user.id, [commentId]),
    ]);
    revalidatePath("/verses/[abbrev]/[number]", "page");
    return {
      ok: true,
      data: {
        ...updated,
        likeCount: counts.get(commentId) ?? 0,
        likedByMe: liked.has(commentId),
      },
    };
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthorized") return { ok: false, error: "Forbidden" };
      if (err.message === "Comment not found") return { ok: false, error: "NotFound" };
    }
    logger.error({ err, action: "updateCommentAction", commentId }, "update comment failed");
    return appError(err, "Erro ao atualizar comentário.");
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
    const useCase = new DeleteCommentUseCase(
      new MongoCommentRepository(),
      new MongoCommentLikeRepository(),
      new MongoCommentReportRepository(),
    );
    await useCase.execute(commentId, session.user.username, session.user.moderator);
    revalidatePath("/verses/[abbrev]/[number]", "page");
    return { ok: true, data: { deleted: true } };
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthorized") return { ok: false, error: "Forbidden" };
      if (err.message === "Comment not found") return { ok: false, error: "NotFound" };
    }
    logger.error({ err, action: "deleteCommentAction", commentId }, "delete failed");
    return appError(err, "Erro ao excluir.");
  }
}
