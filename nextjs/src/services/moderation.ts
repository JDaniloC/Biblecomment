"use client";

import axios from "axios";
import type { Comment } from "@/domain/entities/Comment";
import type { AdminUserDTO } from "@/domain/dto/AdminUserDTO";
import {
  clearReportsAction,
  toggleCommentVerifiedAction,
  setCommentHiddenAction,
} from "@/app/actions/moderation";
import {
  setModeratorAction,
  setUserDisabledAction,
  deleteUserAction,
} from "@/app/actions/users";
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

/** Dates arrive as ISO strings over the wire; consumer converts when needed. */
export interface AdminUserRow
  extends Omit<AdminUserDTO, "createdAt" | "disabledAt"> {
  createdAt: string;
}

export interface AllUsersPage {
  items: AdminUserRow[];
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

  async setCommentHidden(commentId: string, hidden: boolean): Promise<Comment> {
    const result = await setCommentHiddenAction(commentId, hidden);
    if (!result.ok) actionError(result.error);
    return result.data;
  },

  async setModerator(email: string, moderator: boolean): Promise<{ email: string; username: string; moderator: boolean }> {
    const result = await setModeratorAction(email, moderator);
    if (!result.ok) actionError(result.error);
    return result.data;
  },

  async setUserDisabled(
    email: string,
    disabled: boolean,
  ): Promise<{ email: string; username: string; disabled: boolean }> {
    const result = await setUserDisabledAction(email, disabled);
    if (!result.ok) actionError(result.error);
    return result.data;
  },

  async deleteUser(email: string): Promise<void> {
    const result = await deleteUserAction(email);
    if (!result.ok) actionError(result.error);
  },

  async listUsers(opts: {
    q?: string;
    cursor?: ModerationCursor | null;
    limit?: number;
  } = {}): Promise<AllUsersPage> {
    const params = new URLSearchParams();
    if (opts.q && opts.q.trim()) params.set("q", opts.q.trim());
    if (opts.cursor) {
      params.set("cursorAt", opts.cursor.createdAt);
      params.set("cursorId", opts.cursor.id);
    }
    if (opts.limit) params.set("limit", String(opts.limit));
    const res = await axios.get<AllUsersPage>(`/api/moderation/users?${params}`);
    return res.data;
  },
};
