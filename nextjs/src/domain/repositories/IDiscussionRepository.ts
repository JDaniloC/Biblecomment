import { Discussion, DiscussionAnswer } from "../entities/Discussion";

export interface IDiscussionRepository {
  findByBookAbbrev(bookAbbrev: string): Promise<Discussion[]>;
  findById(id: string): Promise<Discussion | null>;
  findAllPaginated(page: number, pageSize: number): Promise<Discussion[]>;
  create(discussion: Omit<Discussion, "_id" | "createdAt" | "updatedAt">): Promise<Discussion>;
  createMany(discussions: Omit<Discussion, "_id" | "createdAt" | "updatedAt">[]): Promise<number>;
  addAnswer(id: string, answer: DiscussionAnswer): Promise<Discussion | null>;
  updateAnswer(discussionId: string, answerId: string, text: string): Promise<Discussion | null>;
  delete(id: string): Promise<void>;
  findAll(): Promise<Discussion[]>;
}
