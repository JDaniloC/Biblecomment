"use client";

import axios from "axios";
import type { Comment } from "@/domain/entities/Comment";
import type { Discussion } from "@/domain/entities/Discussion";

export interface FeedComment extends Comment {
  link: { abbrev: string; chapter: number; verseNumber: number } | null;
}

export interface DiscussionFeedItem extends Discussion {
  answerCount: number;
  /** ISO string from the wire — convert in the component if you need a Date. */
  lastAnswerAt: string;
}

export interface FeedCursor {
  createdAt: string;
  id: string;
}

export interface RecentFeedPage {
  items: FeedComment[];
  nextCursor: FeedCursor | null;
}

export const feedService = {
  async recent(opts: { cursor?: FeedCursor | null; limit?: number } = {}): Promise<RecentFeedPage> {
    const params = new URLSearchParams();
    if (opts.cursor) {
      params.set("cursorAt", opts.cursor.createdAt);
      params.set("cursorId", opts.cursor.id);
    }
    if (opts.limit) params.set("limit", String(opts.limit));
    const res = await axios.get<RecentFeedPage>(`/api/feed/recent?${params}`);
    return res.data;
  },

  async popular(opts: { windowDays?: number; limit?: number } = {}): Promise<{
    items: FeedComment[];
    windowDays: number;
  }> {
    const params = new URLSearchParams();
    if (opts.windowDays) params.set("days", String(opts.windowDays));
    if (opts.limit) params.set("limit", String(opts.limit));
    const res = await axios.get<{ items: FeedComment[]; windowDays: number }>(
      `/api/feed/popular?${params}`,
    );
    return res.data;
  },

  async discussions(opts: { limit?: number } = {}): Promise<{ items: DiscussionFeedItem[] }> {
    const params = new URLSearchParams();
    if (opts.limit) params.set("limit", String(opts.limit));
    const res = await axios.get<{ items: DiscussionFeedItem[] }>(
      `/api/feed/discussions?${params}`,
    );
    return res.data;
  },
};
