"use client";

import axios from "axios";
import type { Comment } from "@/domain/entities/Comment";

export interface ReportsPage {
  page: number;
  pageSize: number;
  items: Comment[];
}

export const moderationService = {
  async listReports(page: number = 1): Promise<ReportsPage> {
    const res = await axios.get<ReportsPage>(`/api/moderation/reports?page=${page}`);
    return res.data;
  },

  async clearReports(commentId: string): Promise<{ _id: string; reports: string[] }> {
    const res = await axios.delete<{ _id: string; reports: string[] }>(
      `/api/moderation/reports/${commentId}`,
    );
    return res.data;
  },

  async setModerator(email: string, moderator: boolean): Promise<{ email: string; username: string; moderator: boolean }> {
    const res = await axios.patch<{ email: string; username: string; moderator: boolean }>(
      `/api/users/moderator`,
      { email, moderator },
    );
    return res.data;
  },
};
