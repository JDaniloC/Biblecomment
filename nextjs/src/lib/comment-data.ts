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
}
