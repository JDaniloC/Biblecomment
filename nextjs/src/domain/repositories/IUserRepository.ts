import { User, UserDeletion } from "../entities/User";
import { PublicUserDTO } from "../dto/PublicUserDTO";
import { AdminUserDTO } from "../dto/AdminUserDTO";

export interface AdminUserCursor {
  createdAt: Date;
  id: string;
}

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  /** Lookup by primary id. Mirrors `findByEmail` / `findByUsername`. */
  findById(userId: string): Promise<User | null>;
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
  /**
   * Insert a new account. An explicit `_id` (a 24-hex ObjectId) and
   * `createdAt` are kept (backup restore). Throws "Email already
   * registered" / "Username already taken" / "User id already taken" when
   * a unique index rejects it (a race the caller's availability check lost).
   */
  create(user: Omit<User, "_id"> & { _id?: string }): Promise<User>;
  /**
   * Store a new password hash and bump `sessionVersion` in the same atomic
   * write, revoking every session minted before it. With `expectedHash` it
   * is a compare-and-set: the write only lands while the stored hash is
   * still that one. Returns the new `sessionVersion`, or null when the user
   * doesn't exist or the compare-and-set lost.
   */
  updatePasswordById(
    userId: string,
    password: string,
    opts?: { expectedHash?: string },
  ): Promise<number | null>;
  update(email: string, data: Partial<Omit<User, "_id" | "email">>): Promise<User | null>;
  /**
   * Disable / re-enable an account. On disable, stamps `disabledAt` and
   * `disabledBy` and bumps `sessionVersion` (so re-enabling doesn't revive
   * old sessions); on re-enable, clears both (a plain `update` only `$set`s,
   * so it cannot clear fields). `by` is the moderator's username (snapshot).
   */
  setDisabled(email: string, disabled: boolean, by: string | null): Promise<User | null>;
  /** Stamp the verification timestamp on the user. */
  setEmailVerified(userId: string, when: Date): Promise<void>;
  /** Store a pending email-change address; idempotent. */
  setPendingEmail(userId: string, newEmail: string): Promise<void>;
  /** Drop any pending email change. */
  clearPendingEmail(userId: string): Promise<void>;
  /**
   * Atomically move `pendingEmail` into `email`, stamp `emailVerifiedAt`, and
   * clear `pendingEmail`. Used by the verification flow on confirmation of an
   * email change. The new email must not be in use by another account
   * (callers MUST check via `findByEmailOrPendingEmail` first — this method
   * does not enforce uniqueness on its own to keep the contract narrow).
   */
  promotePendingEmail(userId: string, when: Date): Promise<void>;
  /**
   * Find a user whose `email` OR `pendingEmail` equals the given address.
   * Used to reject duplicate addresses during email-change requests without
   * leaking existence to the caller of the action.
   */
  findByEmailOrPendingEmail(email: string): Promise<User | null>;
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
  /** Hard-delete by primary id. Returns `true` if a row was removed. */
  deleteById(userId: string): Promise<boolean>;
  /**
   * Mark the account as being deleted and merge `snapshot` into the stored
   * deletion snapshot (first `requestedAt` wins, id lists are unioned).
   * Returns the merged snapshot, or null when the user no longer exists.
   * See [[DeleteUserUseCase]].
   */
  beginDeletion(
    userId: string,
    snapshot: { communityIds: string[]; discussionIds: string[] },
  ): Promise<UserDeletion | null>;
  /**
   * Rewrite the `disabledBy` moderator snapshot on every user — used when
   * that moderator is renamed or deleted. Returns the number of users updated.
   */
  replaceDisabledBy(from: string, to: string): Promise<number>;
  /**
   * Accounts whose deletion started at or before `requestedBefore` and never
   * finished, oldest first — the account-maintenance cron resumes them.
   */
  findPendingDeletions(requestedBefore: Date, limit: number): Promise<User[]>;
  /**
   * Whether a username is unavailable: some account holds it, or still
   * holds it as `renameFrom` while its rename cascade is unfinished.
   * Case-insensitive, like findByUsername.
   */
  isUsernameHeld(username: string): Promise<boolean>;
  /** Drop the `renameFrom` marker once the rename cascade completed. */
  clearRenameFrom(userId: string): Promise<void>;
  /**
   * Compare-and-set rename: switch `from` → `to` and store `renameFrom`
   * only if the account still has username `from`, no pending rename and is
   * neither disabled nor being deleted. Returns the updated user, or null
   * when something else changed the account first. Throws "Username already
   * taken" when another account claimed `to` meanwhile.
   */
  beginRename(userId: string, from: string, to: string): Promise<User | null>;
  /**
   * Active accounts with an unfinished rename cascade (`renameFrom` set),
   * in a stable order.
   */
  findPendingRenames(limit: number): Promise<User[]>;
}
