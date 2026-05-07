import type { DiscussionAnswer } from "./DiscussionAnswer";

export interface Discussion {
  _id?: string;
  bookAbbrev: string;
  commentId?: string;
  username: string;
  verseReference: string;
  verseText: string;
  commentText: string;
  question: string;
  /**
   * Populated only by detail GETs (single discussion). The list endpoint
   * leaves it undefined and ships `answersCount` instead — answers live
   * in the DiscussionAnswer collection (Phase 9.3).
   */
  answers?: DiscussionAnswer[];
  /** Populated by the list endpoint via batch aggregation. */
  answersCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
