"use client";

import axios from "axios";
import type { Discussion } from "@/domain/entities/Discussion";

export interface DiscussionDraft {
  verseReference: string;
  verseText?: string;
  commentText?: string;
  question: string;
  commentId?: string;
}

export interface DiscussionSummary {
  _id: string;
  username: string;
  question: string;
  verseReference: string;
  bookAbbrev: string;
  answers: Array<{ name: string; text: string }>;
  createdAt?: string;
  updatedAt?: string;
}

export const discussionsService = {
  async createForBook(bookAbbrev: string, draft: DiscussionDraft): Promise<Discussion> {
    const res = await axios.post<Discussion>(`/api/discussion/${bookAbbrev}`, draft);
    return res.data;
  },

  async getForBook(bookAbbrev: string, page: number = 1): Promise<Discussion[]> {
    const res = await axios.get<Discussion[]>(`/api/discussion/${bookAbbrev}?pages=${page}`);
    return res.data;
  },

  async getById(bookAbbrev: string, id: string): Promise<Discussion> {
    const res = await axios.get<Discussion>(`/api/discussion/${bookAbbrev}/${id}`);
    return res.data;
  },

  async addAnswer(bookAbbrev: string, id: string, text: string): Promise<Discussion> {
    const res = await axios.patch<Discussion>(`/api/discussion/${bookAbbrev}/${id}`, { text });
    return res.data;
  },

  async updateAnswer(
    bookAbbrev: string,
    discussionId: string,
    answerId: string,
    text: string,
  ): Promise<Discussion> {
    const res = await axios.patch<Discussion>(
      `/api/discussion/${bookAbbrev}/${discussionId}/answers/${answerId}`,
      { text },
    );
    return res.data;
  },

  async delete(bookAbbrev: string, id: string): Promise<void> {
    await axios.delete(`/api/discussion/${bookAbbrev}/${id}`);
  },

  async listAll(page: number = 1): Promise<DiscussionSummary[]> {
    const res = await axios.get<DiscussionSummary[]>(`/api/discussions?pages=${page}`);
    return res.data;
  },
};
