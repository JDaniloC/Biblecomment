// Wire-format view of a Comment for client components — Date fields come
// across the network as strings, and the persisted reports[] array isn't
// shipped to clients, so this shape diverges from domain/entities/Comment.
// Like data is delivered as { likeCount, likedByMe } pre-aggregated from the
// CommentLike collection (Phase 9.1) — the client never sees the raw join rows.
export interface CommentData {
  _id: string;
  text: string;
  tags: string[];
  username: string;
  bookReference: string;
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
  verseId?: string;
  onTitle?: boolean;
  /** Admin-verified flag (Phase 8 / ux-review #8). Optional for back-compat with stale caches. */
  verified?: boolean;
  /** Snapshot username of the moderator who verified. */
  verifiedBy?: string;
  /** Slug of the community the comment was posted in. Absent for "general feed" comments. */
  communitySlug?: string;
  /**
   * Set when the comment is soft-hidden by moderation. Only the author sees
   * their own hidden comments (in /profile) — flagged with an indicator.
   * Comes across as an ISO string. Absent = visible.
   */
  hiddenAt?: string;
  /** Why the comment is hidden — see the Comment entity. */
  hiddenReason?: "moderator" | "account-disabled";
}
