export interface ICommentLikeRepository {
  /**
   * Idempotently insert a like row for (userId, commentId).
   * Returns true if a new row was inserted, false if it already existed.
   */
  like(userId: string, commentId: string): Promise<boolean>;

  /** No-op if the row didn't exist. */
  unlike(userId: string, commentId: string): Promise<void>;

  hasLiked(userId: string, commentId: string): Promise<boolean>;

  /**
   * Batch count — Map keyed by commentId string. Comments with zero likes
   * are absent from the map (callers default to 0).
   */
  countByComment(commentIds: string[]): Promise<Map<string, number>>;

  /**
   * Batch "viewer has liked" lookup — Set of commentId strings that the
   * given viewer has liked. Used to flip likedByMe on chapter listings.
   */
  whichLiked(userId: string, commentIds: string[]): Promise<Set<string>>;

  /**
   * Comment IDs the user has liked, ordered by like createdAt desc.
   * Used by the favorites tab — caller hydrates the actual Comment docs.
   */
  findCommentIdsLikedBy(userId: string, page: number, pageSize: number): Promise<string[]>;

  /** Has the user given any like? Used by the badge evaluator (first-like). */
  userHasGivenAnyLike(userId: string): Promise<boolean>;

  /**
   * Top-N comments by like count where the like itself was created on or
   * after `since`. Returns `[{ commentId, likeCount }]` sorted desc.
   * Used by the /home "Populares" feed.
   */
  topLikedSince(since: Date, limit: number): Promise<Array<{ commentId: string; likeCount: number }>>;

  /** Cascade on user deletion. */
  deleteAllByUser(userId: string): Promise<number>;

  /** Cascade when a comment is hard-deleted. */
  deleteAllByComment(commentId: string): Promise<number>;
}
