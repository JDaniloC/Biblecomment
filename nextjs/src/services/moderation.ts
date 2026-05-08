"use client";

import axios from "axios";
import type { Comment } from "@/domain/entities/Comment";
import {
  clearReportsAction,
  toggleCommentVerifiedAction,
} from "@/app/actions/moderation";
import { setModeratorAction } from "@/app/actions/users";
import { actionError } from "./_action-error";

export interface ReportsPage {
  page: number;
  pageSize: number;
  items: Comment[];
}

/** Server returns ISO string; client converts when needed. */
export interface ModerationCursor {
  createdAt: string;
  id: string;
}

export interface AllCommentsPage {
  items: Comment[];
  nextCursor: ModerationCursor | null;
  limit: number;
}

export const moderationService = {
  async listReports(page: number = 1): Promise<ReportsPage> {
    const res = await axios.get<ReportsPage>(`/api/moderation/reports?page=${page}`);
    return res.data;
  },

  async listAllComments(opts: {
    q?: string;
    cursor?: ModerationCursor | null;
    limit?: number;
  } = {}): Promise<AllCommentsPage> {
    const params = new URLSearchParams();
    if (opts.q && opts.q.trim()) params.set("q", opts.q.trim());
    if (opts.cursor) {
      params.set("cursorAt", opts.cursor.createdAt);
      params.set("cursorId", opts.cursor.id);
    }
    if (opts.limit) params.set("limit", String(opts.limit));
    const res = await axios.get<AllCommentsPage>(`/api/moderation/comments?${params}`);
    return res.data;
  },

  async clearReports(commentId: string): Promise<{ _id: string; cleared: number }> {
    const result = await clearReportsAction(commentId);
    if (!result.ok) actionError(result.error);
    return result.data;
  },

  async toggleVerified(commentId: string): Promise<Comment> {
    const result = await toggleCommentVerifiedAction(commentId);
    if (!result.ok) actionError(result.error);
    return result.data;
  },

  async setModerator(email: string, moderator: boolean): Promise<{ email: string; username: string; moderator: boolean }> {
    const result = await setModeratorAction(email, moderator);
    if (!result.ok) actionError(result.error);
    return result.data;
  },
};
