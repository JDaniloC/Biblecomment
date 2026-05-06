"use client";

import {
  markChapterReadAction,
  unmarkChapterReadAction,
  getReadChaptersForBookAction,
  type MarkReadResult,
} from "@/app/actions/chapter-progress";
import { actionError } from "./_action-error";

export const chapterProgressService = {
  async markRead(abbrev: string, chapter: number): Promise<MarkReadResult> {
    const r = await markChapterReadAction(abbrev, chapter);
    if (!r.ok) actionError(r.error);
    return r.data;
  },
  async unmarkRead(abbrev: string, chapter: number): Promise<void> {
    const r = await unmarkChapterReadAction(abbrev, chapter);
    if (!r.ok) actionError(r.error);
  },
  async getReadChapters(abbrev: string): Promise<number[]> {
    const r = await getReadChaptersForBookAction(abbrev);
    if (!r.ok) actionError(r.error);
    return r.data.chapters;
  },
};
