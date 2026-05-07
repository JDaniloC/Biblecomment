/**
 * Aggregated row returned to the moderation panel.
 * `reporters` is the deduped list of usernames that reported a comment.
 */
export interface ReportedCommentAggregate {
  commentId: string;
  reportCount: number;
  reporters: string[];
}

export interface ICommentReportRepository {
  /**
   * Idempotently insert a report row for (userId, commentId).
   * Returns true if a new row was inserted.
   */
  report(userId: string, username: string, commentId: string): Promise<boolean>;

  /** Wipe every report on a single comment (mod "marcar resolvido"). */
  clearReportsForComment(commentId: string): Promise<number>;

  /**
   * Reported comments ordered by report count desc, paginated.
   * Each entry carries the count + reporter usernames so the admin panel
   * can hydrate the comment doc and render reporters in one round-trip.
   */
  findReportedCommentIds(page: number, pageSize: number): Promise<ReportedCommentAggregate[]>;

  /** Batch count for chapter-listing enrichment when viewer is a mod. */
  countByComment(commentIds: string[]): Promise<Map<string, number>>;

  /** Did the viewing user already report any of these comments? */
  whichReported(userId: string, commentIds: string[]): Promise<Set<string>>;

  /** Cascade on user deletion. */
  deleteAllByUser(userId: string): Promise<number>;

  /** Cascade when a comment is hard-deleted. */
  deleteAllByComment(commentId: string): Promise<number>;
}
