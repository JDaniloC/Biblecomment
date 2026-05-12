import { UserChapterRead } from "../entities/UserChapterRead";

export interface IUserChapterReadRepository {
  /**
   * Idempotently mark a (userId, abbrev, chapter) tuple as read.
   * Returns true if a new doc was inserted, false if it already existed.
   */
  markRead(userId: string, abbrev: string, chapter: number): Promise<boolean>;

  /** Remove the read mark. No-op if it wasn't there. */
  unmarkRead(userId: string, abbrev: string, chapter: number): Promise<void>;

  /** Total chapters the user has marked as read across the whole Bible. */
  countByUser(userId: string): Promise<number>;

  /** Chapter numbers the user has marked as read in a specific book. */
  findChaptersForBook(userId: string, abbrev: string): Promise<number[]>;

  /** Per-book read count for the user — used by section/book completion checks. */
  countByUserPerBook(userId: string): Promise<Record<string, number>>;

  /** Bulk introspection (test/admin). */
  findAllForUser(userId: string): Promise<UserChapterRead[]>;
}
