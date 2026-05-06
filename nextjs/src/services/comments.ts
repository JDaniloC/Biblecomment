"use client";

import axios from "axios";
import type { Comment } from "@/domain/entities/Comment";
import type { ToggleLikeResult } from "@/application/use-cases/CommentUseCases";
import {
  toggleLikeAction,
  reportCommentAction,
  deleteCommentAction,
  createCommentAction,
  updateCommentAction,
} from "@/app/actions/comments";
import { actionError } from "./_action-error";

export interface CommentDraft {
  text: string;
  tags?: string[];
  onTitle?: boolean;
}

export interface ChapterCommentsResponse {
  titleComments: Comment[];
  verseComments: Comment[];
}

/**
 * Single source of truth for /api/comments/* HTTP calls.
 *
 * Mutations now invoke Server Actions (Phase 5). Reads stay on axios for
 * now since they often run under cache:"no-store" in client effects.
 *
 * Error semantics: actions return a discriminated union; we re-throw a
 * synthetic `Error & { response: { status } }` so existing catch blocks
 * that read `(err as { response?: { status?: number } })?.response?.status`
 * continue to work unchanged.
 */
export const commentsService = {
  async createForVerse(verseId: string, draft: CommentDraft): Promise<Comment> {
    const result = await createCommentAction(verseId, {
      text: draft.text,
      tags: draft.tags ?? [],
      onTitle: draft.onTitle,
    });
    if (!result.ok) actionError(result.error);
    return result.data;
  },

  async update(id: string, draft: { text: string; tags?: string[] }): Promise<Comment> {
    const result = await updateCommentAction(id, {
      text: draft.text,
      tags: draft.tags ?? [],
    });
    if (!result.ok) actionError(result.error);
    return result.data;
  },

  async toggleLike(id: string): Promise<ToggleLikeResult> {
    const result = await toggleLikeAction(id);
    if (!result.ok) actionError(result.error);
    return result.data;
  },

  async report(id: string): Promise<Comment> {
    const result = await reportCommentAction(id);
    if (!result.ok) actionError(result.error);
    return result.data;
  },

  async delete(id: string): Promise<void> {
    const result = await deleteCommentAction(id);
    if (!result.ok) actionError(result.error);
  },

  async getForChapter(abbrev: string, chapter: number): Promise<ChapterCommentsResponse> {
    const res = await axios.get<ChapterCommentsResponse>(
      `/api/comments/chapter/${abbrev}/${chapter}`,
    );
    return res.data;
  },

  async getForVerse(
    abbrev: string,
    chapter: number,
    verse: number,
  ): Promise<ChapterCommentsResponse> {
    const res = await axios.get<ChapterCommentsResponse>(
      `/api/comments/chapter/${abbrev}/${chapter}/${verse}`,
    );
    return res.data;
  },
};
