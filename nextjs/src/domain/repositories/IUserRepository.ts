import { User } from "../entities/User";

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findByUsernames(usernames: string[]): Promise<User[]>;
  findAll(): Promise<User[]>;
  findAllPaginated(page: number, pageSize: number): Promise<User[]>;
  create(user: Omit<User, "_id">): Promise<User>;
  updatePassword(email: string, password: string, passwordType: "bcrypt"): Promise<void>;
  update(email: string, data: Partial<Omit<User, "_id" | "email">>): Promise<User | null>;
  /**
   * Idempotently mark a tutorial as completed for the user. Uses $addToSet
   * under the hood so concurrent calls converge.
   */
  markTutorialCompleted(email: string, name: string): Promise<void>;
  delete(email: string): Promise<void>;
}
