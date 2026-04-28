"use client";

import axios from "axios";
import type { Discussion } from "@/domain/entities/Discussion";
import {
  createDiscussionAction,
  addAnswerAction,
  updateAnswerAction,
  deleteDiscussionAction,
} from "@/app/actions/discussions";
import { actionError } from "./_action-error";

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
    const result = await createDiscussionAction(bookAbbrev, draft);
    if (!result.ok) actionError(result.error);
    return result.data;
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
    const result = await addAnswerAction(bookAbbrev, id, text);
    if (!result.ok) actionError(result.error);
    return result.data;
  },

  async updateAnswer(
    bookAbbrev: string,
    discussionId: string,
    answerId: string,
    text: string,
  ): Promise<Discussion> {
    const result = await updateAnswerAction(bookAbbrev, discussionId, answerId, text);
    if (!result.ok) actionError(result.error);
    return result.data;
  },

  async delete(bookAbbrev: string, id: string): Promise<void> {
    const result = await deleteDiscussionAction(bookAbbrev, id);
    if (!result.ok) actionError(result.error);
  },

  async listAll(page: number = 1): Promise<DiscussionSummary[]> {
    const res = await axios.get<DiscussionSummary[]>(`/api/discussions?pages=${page}`);
    return res.data;
  },
};
