import { User } from "../entities/User";
import { PublicUserDTO } from "../dto/PublicUserDTO";
import { AdminUserDTO } from "../dto/AdminUserDTO";

export interface AdminUserCursor {
  createdAt: Date;
  id: string;
}

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
  /** Bulk lookup by `_id`. Useful for resolving follow lists, likes, etc. */
  findManyByIds(userIds: string[]): Promise<User[]>;
  findAll(): Promise<User[]>;
  findAllPaginated(page: number, pageSize: number): Promise<User[]>;
  /**
   * Cursor-paginated user listing for the admin moderation panel. Cursor
   * is `(createdAt, _id)` of the last item returned — strict-less-than on
   * the next page (deterministic tiebreak when timestamps collide). Search
   * is a case-insensitive regex on `username` and `email`. Returns the
   * `AdminUserDTO` projection (password and tutorial progress excluded).
   */
  findForModeration(opts: {
    q?: string;
    cursor?: AdminUserCursor | null;
    limit: number;
  }): Promise<{
    items: AdminUserDTO[];
    nextCursor: AdminUserCursor | null;
  }>;
  create(user: Omit<User, "_id">): Promise<User>;
  updatePassword(email: string, password: string): Promise<void>;
  /**
   * Update password by user id. Used by the password-recovery flow where
   * the lookup happens via reset-token (not email) so we already have the id.
   */
  updatePasswordById(userId: string, password: string): Promise<void>;
  update(email: string, data: Partial<Omit<User, "_id" | "email">>): Promise<User | null>;
  /**
   * Disable / re-enable an account. On disable, stamps `disabledAt` and
   * `disabledBy`; on re-enable, clears both (a plain `update` only `$set`s, so
   * it cannot clear fields). `by` is the moderator's username (snapshot).
   */
  setDisabled(email: string, disabled: boolean, by: string | null): Promise<User | null>;
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
