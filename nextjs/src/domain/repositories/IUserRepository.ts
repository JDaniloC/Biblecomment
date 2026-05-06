import { User } from "../entities/User";

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findByUsernames(usernames: string[]): Promise<User[]>;
  findAll(): Promise<User[]>;
  findAllPaginated(page: number, pageSize: number): Promise<User[]>;
  create(user: Omit<User, "_id">): Promise<User>;
  updatePassword(email: string, password: string, passwordType: "bcrypt"): Promise<void>;
  /**
   * Update password by user id. Used by the password-recovery flow where
   * the lookup happens via reset-token (not email) so we already have the id.
   */
  updatePasswordById(userId: string, password: string, passwordType: "bcrypt"): Promise<void>;
  update(email: string, data: Partial<Omit<User, "_id" | "email">>): Promise<User | null>;
  /**
   * Idempotently mark a tutorial as completed for the user. Uses $addToSet
   * under the hood so concurrent calls converge.
   */
  markTutorialCompleted(email: string, name: string): Promise<void>;
  /**
   * Append one or more badge IDs to the user, idempotently.
   * Returns the IDs that were actually new (i.e., not previously present).
   */
  addBadges(userId: string, badgeIds: string[]): Promise<string[]>;
  delete(email: string): Promise<void>;
}
