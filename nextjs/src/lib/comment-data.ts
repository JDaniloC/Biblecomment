// Wire-format view of a Comment for client components — Date fields come
// across the network as strings, and the persisted reports[] array isn't
// shipped to clients, so this shape diverges from domain/entities/Comment.
export interface CommentData {
  _id: string;
  text: string;
  tags: string[];
  username: string;
  bookReference: string;
  createdAt: string;
  likes: string[];
  verseId?: string;
  onTitle?: boolean;
}
