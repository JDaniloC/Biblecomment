export interface Comment {
  _id?: string;
  verseId: string;
  username: string;
  onTitle: boolean;
  bookReference: string;
  text: string;
  tags: string[];
  /**
   * Optional community this comment belongs to. `undefined` = posted to the
   * general feed. Stored as the community slug (not _id) so the chapter
   * read-path can filter without an extra join.
   */
  communitySlug?: string;
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
  /**
   * Admin-verified flag. When true, the chapter UI shows a small badge
   * beside the username. Toggled by moderators in /admin/moderation.
   */
  verified?: boolean;
  /** Username of the moderator who toggled `verified` last. */
  verifiedBy?: string;
  /** Timestamp of the last verified-state change. */
  verifiedAt?: Date;
  /**
   * Set when the comment is soft-hidden: it stays stored but is invisible to
   * other readers (the author still sees it in their own profile). Absent =
   * visible. Toggled by moderators in /admin/moderation.
   */
  hiddenAt?: Date;
  /** Username of the moderator whose action last hid the comment. */
  hiddenBy?: string;
  /**
   * Why the comment is hidden. `"moderator"` = hidden individually;
   * `"account-disabled"` = cascade-hidden because the author's account was
   * disabled. Re-enabling an account only un-hides the `"account-disabled"`
   * ones, so a separately moderator-hidden comment survives the cycle.
   */
  hiddenReason?: "moderator" | "account-disabled";
  createdAt?: Date;
  updatedAt?: Date;
}
