export interface DiscussionAnswer {
  _id?: string;
  discussionId: string;
  userId: string;
  /**
   * Username snapshot at answer time. Kept denormalized so the discussion
   * GET can render "bob respondeu" without a User join. On user delete the
   * cascade rewrites this to "[usuário removido]" — the answer text stays.
   */
  username: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
  /** Snapshot of the answerer's email-verification state. Optional for back-compat. */
  authorEmailVerified?: boolean;
  /** Aggregated like count — populated at read time, not stored. */
  likeCount?: number;
  /** Whether the viewing user liked this answer — populated at read time. */
  likedByMe?: boolean;
}
