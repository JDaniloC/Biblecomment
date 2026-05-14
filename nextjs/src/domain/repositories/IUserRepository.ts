import { User } from "../entities/User";
import { PublicUserDTO } from "../dto/PublicUserDTO";

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  /**
   * Public-profile projection — only fields safe to expose anonymously. Belief
   * is gated on the user's `showBelief` opt-in flag. Returns null for unknown users.
   */
  findByUsernamePublic(username: string): Promise<PublicUserDTO | null>;
  /**
   * Case-insensitive prefix match on `username`, sorted by username ascending.
   * Used by the @-prefix search shortcut to jump to a user's public profile.
   * Returns only the public-safe identity fields.
   */
  searchByUsernamePrefix(prefix: string, limit: number): Promise<Array<{ username: string; displayName?: string }>>;
  findByUsernames(usernames: string[]): Promise<User[]>;
  findAll(): Promise<User[]>;
  findAllPaginated(page: number, pageSize: number): Promise<User[]>;
  create(user: Omit<User, "_id">): Promise<User>;
  updatePassword(email: string, password: string): Promise<void>;
  /**
   * Update password by user id. Used by the password-recovery flow where
   * the lookup happens via reset-token (not email) so we already have the id.
   */
  updatePasswordById(userId: string, password: string): Promise<void>;
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
