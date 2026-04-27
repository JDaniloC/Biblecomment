"use client";

import axios from "axios";
import type { Comment } from "@/domain/entities/Comment";

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
 * Why not call axios directly from components?
 *  - Centralized URL / payload shape; renaming a field touches one file.
 *  - Typed end-to-end with the domain entity.
 *  - Drop-in replacement target when these become Server Actions.
 *
 * Implementation note: stays on axios for now to match the rest of the
 * client. A future Phase 5 round flips internals to Server Actions
 * without changing the call sites.
 */
export const commentsService = {
  async createForVerse(verseId: string, draft: CommentDraft): Promise<Comment> {
    const res = await axios.post<Comment>(`/api/comments/verse/${verseId}`, {
      text: draft.text,
      tags: draft.tags ?? [],
      onTitle: draft.onTitle,
    });
    return res.data;
  },

  async update(id: string, draft: { text: string; tags?: string[] }): Promise<Comment> {
    const res = await axios.patch<Comment>(`/api/comments/${id}`, {
      text: draft.text,
      tags: draft.tags ?? [],
    });
    return res.data;
  },

  async toggleLike(id: string): Promise<Comment> {
    const res = await axios.patch<Comment>(`/api/comments/${id}`, { action: "like" });
    return res.data;
  },

  async report(id: string): Promise<Comment> {
    const res = await axios.patch<Comment>(`/api/comments/${id}`, { action: "report" });
    return res.data;
  },

  async delete(id: string): Promise<void> {
    await axios.delete(`/api/comments/${id}`);
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
