import { Discussion } from "../entities/Discussion";

export interface IDiscussionRepository {
  findByBookAbbrev(bookAbbrev: string): Promise<Discussion[]>;
  findById(id: string): Promise<Discussion | null>;
  /** Hydrate discussion docs by id list. Order is not preserved — caller re-sorts. */
  findManyByIds(ids: string[]): Promise<Discussion[]>;
  findAllPaginated(page: number, pageSize: number): Promise<Discussion[]>;
  create(discussion: Omit<Discussion, "_id" | "createdAt" | "updatedAt" | "answers" | "answersCount">): Promise<Discussion>;
  createMany(discussions: Omit<Discussion, "_id" | "createdAt" | "updatedAt" | "answers" | "answersCount">[]): Promise<number>;
  delete(id: string): Promise<void>;
  findAll(): Promise<Discussion[]>;
  /** Anonymize the top-level discussion author. Answers cascade via DiscussionAnswerRepository. */
  anonymizeByUsername(oldUsername: string, replacement: string): Promise<number>;
  /** Has the user opened (authored) at least one discussion? */
  userHasOpenedDiscussion(username: string): Promise<boolean>;
}
