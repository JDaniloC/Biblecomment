import { Comment } from "../entities/Comment";

export interface ICommentRepository {
  findByVerseId(verseId: string): Promise<Comment[]>;
  findByUsername(username: string): Promise<Comment[]>;
  findById(id: string): Promise<Comment | null>;
  findAllPaginated(page: number, pageSize: number): Promise<Comment[]>;
  findFavoritesByUsername(username: string, page: number, pageSize: number): Promise<Comment[]>;
  create(comment: Omit<Comment, "_id" | "createdAt" | "updatedAt">): Promise<Comment>;
  createMany(comments: Omit<Comment, "_id" | "createdAt" | "updatedAt">[]): Promise<number>;
  update(id: string, data: Partial<Comment>): Promise<Comment | null>;
  delete(id: string): Promise<void>;
  addLike(id: string, username: string): Promise<Comment | null>;
  removeLike(id: string, username: string): Promise<Comment | null>;
  addReport(id: string, username: string): Promise<Comment | null>;
  findReported(page: number, pageSize: number): Promise<Comment[]>;
  clearReports(id: string): Promise<Comment | null>;
  findAll(): Promise<Comment[]>;
  searchByText(query: string): Promise<Comment[]>;
  anonymizeByUsername(oldUsername: string, replacement: string): Promise<number>;
  removeUserReferences(username: string): Promise<void>;
  /** Has the user given at least one like on any comment? Used by badge evaluator. */
  userHasGivenLike(username: string): Promise<boolean>;
}
