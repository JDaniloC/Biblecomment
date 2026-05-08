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

export interface AllCommentsPage {
  page: number;
  pageSize: number;
  total: number;
  items: Comment[];
}

export const moderationService = {
  async listReports(page: number = 1): Promise<ReportsPage> {
    const res = await axios.get<ReportsPage>(`/api/moderation/reports?page=${page}`);
    return res.data;
  },

  async listAllComments(page: number = 1, q?: string): Promise<AllCommentsPage> {
    const params = new URLSearchParams({ page: String(page) });
    if (q && q.trim()) params.set("q", q.trim());
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
