import { Comment } from "../entities/Comment";

export interface ICommentRepository {
  findByVerseId(verseId: string): Promise<Comment[]>;
  findByUsername(username: string): Promise<Comment[]>;
  findById(id: string): Promise<Comment | null>;
  findAllPaginated(page: number, pageSize: number): Promise<Comment[]>;
  /** Hydrate Comment docs by id. Order is not guaranteed — caller re-sorts. */
  findManyByIds(ids: string[]): Promise<Comment[]>;
  create(comment: Omit<Comment, "_id" | "createdAt" | "updatedAt">): Promise<Comment>;
  createMany(comments: Omit<Comment, "_id" | "createdAt" | "updatedAt">[]): Promise<number>;
  update(id: string, data: Partial<Comment>): Promise<Comment | null>;
  delete(id: string): Promise<void>;
  addReport(id: string, username: string): Promise<Comment | null>;
  findReported(page: number, pageSize: number): Promise<Comment[]>;
  clearReports(id: string): Promise<Comment | null>;
  findAll(): Promise<Comment[]>;
  searchByText(query: string): Promise<Comment[]>;
  anonymizeByUsername(oldUsername: string, replacement: string): Promise<number>;
  /**
   * Strip references to a deleted user from embedded arrays still held on
   * Comment (currently just `reports`; likes were extracted in Phase 9.1).
   */
  removeUserReferences(username: string): Promise<void>;
}
