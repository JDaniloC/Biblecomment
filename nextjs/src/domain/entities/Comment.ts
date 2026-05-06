export interface Comment {
  _id?: string;
  verseId: string;
  username: string;
  onTitle: boolean;
  bookReference: string;
  text: string;
  tags: string[];
  reports: string[];
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
  createdAt?: Date;
  updatedAt?: Date;
}
