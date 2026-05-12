import { Comment } from "../entities/Comment";

export interface ICommentRepository {
  findByVerseId(verseId: string): Promise<Comment[]>;
  findByUsername(username: string): Promise<Comment[]>;
  /**
   * DB-paginated variant of `findByUsername`. Used by the profile comments
   * tab so we don't pull the user's entire history into memory just to slice.
   * Page is 1-indexed; pageSize is clamped by the caller.
   */
  findByUsernamePaginated(username: string, page: number, pageSize: number): Promise<Comment[]>;
  findById(id: string): Promise<Comment | null>;
  findAllPaginated(page: number, pageSize: number): Promise<Comment[]>;
  /** Hydrate Comment docs by id. Order is not guaranteed — caller re-sorts. */
  findManyByIds(ids: string[]): Promise<Comment[]>;
  create(comment: Omit<Comment, "_id" | "createdAt" | "updatedAt">): Promise<Comment>;
  createMany(comments: Omit<Comment, "_id" | "createdAt" | "updatedAt">[]): Promise<number>;
  update(id: string, data: Partial<Comment>): Promise<Comment | null>;
  delete(id: string): Promise<void>;
  findAll(): Promise<Comment[]>;
  searchByText(query: string): Promise<Comment[]>;
  anonymizeByUsername(oldUsername: string, replacement: string): Promise<number>;
  /**
   * Cursor-paginated all-comments query for the moderation panel. The
   * cursor is `(createdAt, id)` of the last item returned by the previous
   * page, so the next page filters with `createdAt < cursor.createdAt OR
   * (createdAt = cursor.createdAt AND _id < cursor.id)` — deterministic
   * tiebreak when timestamps collide.
   *
   * Search uses MongoDB full-text on `text` (Portuguese stemming) merged
   * with case-insensitive regex against `username` and `bookReference`.
   * Both sides are indexed; nothing scans the collection. There is no
   * `total` — totals are O(N) and pointless for a feed.
   */
  findForModeration(opts: {
    q?: string;
    cursor?: { createdAt: Date; id: string } | null;
    limit: number;
  }): Promise<{ items: Comment[]; nextCursor: { createdAt: Date; id: string } | null }>;
  /** Set the admin-verified state. `by` is the moderator's username (snapshot). */
  setVerified(id: string, verified: boolean, by: string | null): Promise<Comment | null>;
  /**
   * Aggregate counts for a chapter in a single round-trip. Used by the server
   * component that renders ChapterClient so the verse-comment badges and
   * title-comment counter paint on first byte instead of after a client fetch.
   */
  countsForChapter(verseIds: string[]): Promise<{ countMap: Record<string, number>; titleCount: number }>;
}
