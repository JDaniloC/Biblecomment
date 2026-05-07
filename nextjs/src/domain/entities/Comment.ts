export interface Comment {
  _id?: string;
  verseId: string;
  username: string;
  onTitle: boolean;
  bookReference: string;
  text: string;
  tags: string[];
  /**
   * Aggregated like count from the CommentLike collection.
   * Populated at read time by enrichment helpers; absent on freshly-created
   * documents and on test fixtures that don't go through the read path.
   */
  likeCount?: number;
  /**
   * Whether the viewing user has liked this comment. Populated only when
   * the viewer's userId is known at read time (anonymous reads leave it false).
   */
  likedByMe?: boolean;
  /**
   * Aggregated report count from the CommentReport collection. Mod-only
   * fields — the public chapter API doesn't ship these. Populated by the
   * moderation panel and by reportCommentAction's response.
   */
  reportCount?: number;
  /** Whether the viewing user has reported this comment (typically a mod). */
  reportedByMe?: boolean;
  /**
   * Distinct usernames that reported this comment. Mod-only — populated
   * by ListReportedCommentsUseCase for the admin moderation queue.
   */
  reporters?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}
