/**
 * Admin backup and restore (moderators only, /api/backup/*).
 *
 * Restore is meant for recovery after data loss, from the latest export.
 * Disaster-recovery order: erasures, users, comments, discussions. The
 * tombstones go in first so erased accounts stay erased, and accounts go
 * in before content so restored rows resolve to their authors.
 *
 * An account deleted after the export was taken has its tombstone only in
 * the lost database, so before restoring users, also re-post to
 * /api/backup/erasures every `account_erased` log entry newer than that
 * export (MongoAccountErasureRepository.record logs each one with just
 * `userId` and `erasedAt`). Otherwise the users restore re-creates those
 * accounts.
 *
 * Rows that already exist (same `_id`) are skipped, so a re-run is
 * harmless; an account with a deletion tombstone is never re-created, and
 * content whose author has no live account is stored anonymized. But a
 * comment or discussion deletion leaves no trace, so a content restore
 * can't tell a lost row from one deleted on purpose: it re-inserts every
 * row deleted since the export was taken. Hence only after a loss, and
 * only from the latest export.
 */
import { randomInt } from "crypto";
import { IUserRepository } from "@/domain/repositories/IUserRepository";
import { ICommentRepository } from "@/domain/repositories/ICommentRepository";
import { IDiscussionRepository } from "@/domain/repositories/IDiscussionRepository";
import {
  AccountErasure,
  IAccountErasureRepository,
} from "@/domain/repositories/IAccountErasureRepository";
import { User } from "@/domain/entities/User";
import { Comment } from "@/domain/entities/Comment";
import { Discussion } from "@/domain/entities/Discussion";
import {
  BackupUserEmailSchema,
  type BackupCommentItem,
  type BackupDiscussionItem,
  type BackupUserItem,
} from "@/lib/schemas";
import {
  isReservedUsername,
  sanitizeUsername,
  MIN_USERNAME_LEN,
} from "@/lib/sanitize-username";
import type { UsernameKeyedRepos } from "./AuthUseCases";
import { ANONYMIZED_USERNAME } from "./UserUseCases";

const OBJECT_ID = /^[0-9a-f]{24}$/i;

/** A backup row's original id, normalized, when it is an ObjectId. */
function objectId(id: string | undefined): string | undefined {
  return id && OBJECT_ID.test(id) ? id.toLowerCase() : undefined;
}

/** Creation time encoded in an ObjectId (its first 4 bytes, in seconds). */
function objectIdTime(id: string): Date {
  return new Date(parseInt(id.slice(0, 8), 16) * 1000);
}

/**
 * Session version of a restored account: a random positive 31-bit integer,
 * so no token minted before the loss (at the account's old, small version)
 * matches it. See RestoreUsersUseCase.
 */
function randomSessionVersion(): number {
  return randomInt(1, 2 ** 31);
}

/** Names the app writes as placeholders; no account may hold them. */
const SENTINEL_USERNAMES: ReadonlySet<string> = new Set([
  ANONYMIZED_USERNAME,
  "alguém",
]);

function isSentinelUsername(name: string): boolean {
  return SENTINEL_USERNAMES.has(name.normalize("NFC").toLowerCase());
}

// ── Users ──────────────────────────────────────────────────────────────

/**
 * The account fields a users backup carries. No credentials (password)
 * and nothing transient (pendingEmail, renameFrom, deletion,
 * sessionVersion).
 */
export type BackupUser = Pick<
  User,
  | "_id"
  | "email"
  | "username"
  | "displayName"
  | "state"
  | "belief"
  | "showBelief"
  | "moderator"
  | "badges"
  | "tutorialsCompleted"
  | "emailVerifiedAt"
  | "disabledAt"
  | "disabledBy"
  | "createdAt"
>;

function toBackupUser(u: User): BackupUser {
  return {
    _id: u._id,
    email: u.email,
    username: u.username,
    displayName: u.displayName,
    state: u.state,
    belief: u.belief,
    showBelief: u.showBelief,
    moderator: u.moderator,
    badges: u.badges,
    tutorialsCompleted: u.tutorialsCompleted,
    emailVerifiedAt: u.emailVerifiedAt,
    disabledAt: u.disabledAt,
    disabledBy: u.disabledBy,
    createdAt: u.createdAt,
  };
}

export class BackupUsersUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  /** Accounts mid-deletion are left out: they are about to be erased. */
  async execute(): Promise<BackupUser[]> {
    const users = await this.userRepo.findAll();
    return users.filter((u) => !u.deletion).map(toBackupUser);
  }
}

export type RestoreUserSkipReason =
  | "invalidEmail"
  | "duplicateInBatch"
  | "pendingDeletion"
  | "erased"
  | "exists"
  | "sentinelUsername"
  | "reservedUsername"
  | "invalidUsername"
  | "usernameTaken";

export interface RestoreUsersReport {
  received: number;
  created: number;
  /** Deprecated alias of `created` (the endpoint's former response). */
  imported: number;
  /** Why every other row was skipped; with `created` it sums to `received`. */
  skipped: Record<RestoreUserSkipReason, number>;
}

export interface RestoreUsersDeps {
  user: IUserRepository;
  erasures: IAccountErasureRepository;
  usernameKeyed: UsernameKeyedRepos;
  /**
   * Hash of a secret nobody knows, so a restored account can only be
   * reached through password recovery, which proves control of the
   * e-mail. Called at most once per restore (bcrypt is slow).
   */
  placeholderHash: () => Promise<string>;
}

/**
 * Re-create accounts from a users backup (disaster recovery).
 *
 * Every row is either created or skipped with a reason; one bad row never
 * fails the batch:
 * - erased: the row's `_id` has a deletion tombstone, so an account its
 *   owner deleted (LGPD Art. 18 VI) is never re-created from an old backup;
 * - pendingDeletion: it was being deleted when the backup was taken;
 * - exists: its e-mail (or a pending e-mail change to it) or its `_id`
 *   belongs to a live account. A restore never overwrites;
 * - username: placeholder names, reserved slugs, names that can't make a
 *   slug, and names already held (case-insensitive, pending renames
 *   included) are skipped, never renamed. Restored content is matched to
 *   its author by name, so a renamed account would lose it. Grandfathered
 *   names ("JDaniloC", "João Silva") are kept verbatim, as prod keeps them.
 *
 * A restored account keeps its original `_id` (when the row has a valid
 * one) and `createdAt`: its tombstone stays linked if it is deleted again,
 * and records keyed by user id (answers, follows, memberships) stay its
 * own. Sessions are revalidated by id, so it gets a random session version
 * instead of 0: a token minted before the loss carries a small version and
 * is rejected (barring a 1-in-2^31 match). It is never a moderator, its
 * password is a placeholder, and a disabled account stays disabled.
 * Whatever a former holder of the username left behind (devices, reminder,
 * notifications) is purged first, as on registration.
 */
export class RestoreUsersUseCase {
  constructor(private readonly r: RestoreUsersDeps) {}

  async execute(rows: readonly BackupUserItem[]): Promise<RestoreUsersReport> {
    const skipped: Record<RestoreUserSkipReason, number> = {
      invalidEmail: 0,
      duplicateInBatch: 0,
      pendingDeletion: 0,
      erased: 0,
      exists: 0,
      sentinelUsername: 0,
      reservedUsername: 0,
      invalidUsername: 0,
      usernameTaken: 0,
    };
    const ids = rows.flatMap((row) => objectId(row._id) ?? []);
    const erased = ids.length > 0 ? await this.r.erasures.findErased(ids) : new Set<string>();
    const seen = new Set<string>();
    let placeholder: Promise<string> | undefined;
    const password = () => (placeholder ??= this.r.placeholderHash());

    let created = 0;
    for (const row of rows) {
      const outcome = await this.restoreOne(row, erased, seen, password);
      if (outcome === "created") created++;
      else skipped[outcome]++;
    }
    return { received: rows.length, created, imported: created, skipped };
  }

  private async restoreOne(
    row: BackupUserItem,
    erased: ReadonlySet<string>,
    seen: Set<string>,
    password: () => Promise<string>,
  ): Promise<RestoreUserSkipReason | "created"> {
    const email = row.email.trim().toLowerCase();
    if (!BackupUserEmailSchema.safeParse(email).success) return "invalidEmail";
    if (seen.has(email)) return "duplicateInBatch";
    seen.add(email);

    if (row.deletion !== undefined) return "pendingDeletion";
    const id = objectId(row._id);
    if (id && erased.has(id)) return "erased";
    if (await this.r.user.findByEmailOrPendingEmail(email)) return "exists";
    // Same person under an e-mail changed after the backup was taken.
    if (id && (await this.r.user.findById(id))) return "exists";

    const username = row.username.trim();
    const nameProblem = await this.usernameProblem(username);
    if (nameProblem) return nameProblem;

    await Promise.all([
      this.r.usernameKeyed.pushSubscription.deleteAllByUsername(username),
      this.r.usernameKeyed.readingReminder.deleteByUsername(username),
      this.r.usernameKeyed.notification.deleteForUser(username),
    ]);

    try {
      await this.r.user.create({
        ...(id ? { _id: id } : {}),
        email,
        username,
        displayName: row.displayName?.trim() || undefined,
        password: await password(),
        state: row.state,
        belief: row.belief,
        showBelief: row.showBelief,
        moderator: false,
        badges: row.badges,
        tutorialsCompleted: row.tutorialsCompleted,
        emailVerifiedAt: row.emailVerifiedAt,
        // Re-applied so a restore can't be used to lift a ban.
        disabledAt: row.disabledAt,
        disabledBy: row.disabledAt ? await this.moderatorName(row.disabledBy) : undefined,
        createdAt: row.createdAt ?? (id ? objectIdTime(id) : undefined),
        sessionVersion: randomSessionVersion(),
      });
    } catch (err) {
      // Lost a race with another write between the checks and the insert.
      if (err instanceof Error) {
        if (err.message === "Email already registered") return "exists";
        if (err.message === "User id already taken") return "exists";
        if (err.message === "Username already taken") return "usernameTaken";
      }
      throw err;
    }
    return "created";
  }

  private async usernameProblem(username: string): Promise<RestoreUserSkipReason | null> {
    if (isSentinelUsername(username)) return "sentinelUsername";
    if (isReservedUsername(username)) return "reservedUsername";
    if (sanitizeUsername(username).length < MIN_USERNAME_LEN) return "invalidUsername";
    if (await this.r.user.isUsernameHeld(username)) return "usernameTaken";
    return null;
  }

  /**
   * A moderator snapshot: kept when a live account has exactly that name
   * (findByUsername ignores case, which could credit someone else),
   * anonymized otherwise.
   */
  private async moderatorName(name: string | undefined): Promise<string> {
    if (!name || isSentinelUsername(name)) return ANONYMIZED_USERNAME;
    const mod = await this.r.user.findByUsername(name);
    return mod && !mod.deletion && mod.username === name ? name : ANONYMIZED_USERNAME;
  }
}

// ── Content ────────────────────────────────────────────────────────────

/**
 * Live accounts by username, loaded once per restore, to attribute restored
 * content the way the live system has it.
 *
 * Names match exactly, never case-insensitively: content is stored under
 * the exact name, and a looser match could hand a deleted author's rows to
 * a different person whose name differs only in case (or who registered
 * the name after the erasure). A name still held as an account's
 * `renameFrom` (rename cascade not finished) resolves to that account's new
 * name, as the cascade would have moved those rows.
 */
class LiveAuthors {
  private readonly byName = new Map<string, User>();
  private readonly byPendingRename = new Map<string, User>();

  private constructor(users: User[]) {
    for (const u of users) {
      this.byName.set(u.username, u);
      if (u.renameFrom) this.byPendingRename.set(u.renameFrom, u);
    }
  }

  static async load(userRepo: IUserRepository): Promise<LiveAuthors> {
    return new LiveAuthors(await userRepo.findAll());
  }

  private find(name: string): User | undefined {
    return this.byName.get(name) ?? this.byPendingRename.get(name);
  }

  /**
   * Author of a restored row:
   * - already anonymized: kept;
   * - a live account that isn't being deleted: its current stored name;
   * - anything else (no account because it was deleted or never existed, a
   *   reserved sentinel, or an account mid-deletion): anonymized, as the
   *   deletion cascade does. Content left under a free name would go to
   *   whoever registers it next.
   */
  author(name: string): { username: string; anonymized: boolean; account?: User } {
    if (name === ANONYMIZED_USERNAME) return { username: name, anonymized: false };
    const account = isReservedUsername(name) ? undefined : this.find(name);
    if (!account || account.deletion) {
      return { username: ANONYMIZED_USERNAME, anonymized: true };
    }
    return { username: account.username, anonymized: false, account };
  }

  /** Moderator snapshot (verifiedBy, hiddenBy): a live name, or anonymized. */
  moderator(name: string | undefined): string | undefined {
    if (name === undefined) return undefined;
    const account = this.find(name);
    return account && !account.deletion ? account.username : ANONYMIZED_USERNAME;
  }
}

export interface CommentRestoreReport {
  received: number;
  /**
   * Rows inserted. The others already existed (same `_id`, e.g. a re-run)
   * or pointed at a verse id that isn't valid.
   */
  created: number;
  /** Rows whose author has no live account, stored anonymized. */
  anonymized: number;
  /** Visible rows by a disabled author, hidden as the disable cascade does. */
  rehidden: number;
}

type CommentRow = Parameters<ICommentRepository["createMany"]>[0][number];

/** Hidden state of a restored comment, given its author's live account. */
function hiddenState(
  item: BackupCommentItem,
  account: User | undefined,
  authors: LiveAuthors,
): Pick<Comment, "hiddenAt" | "hiddenBy" | "hiddenReason"> & { rehidden: boolean } {
  if (account?.disabledAt && !item.hiddenAt) {
    return {
      hiddenAt: account.disabledAt,
      hiddenBy: account.disabledBy,
      hiddenReason: "account-disabled",
      rehidden: true,
    };
  }
  if (account && !account.disabledAt && item.hiddenReason === "account-disabled") {
    // The author was re-enabled since; the live cascade un-hid these.
    return { rehidden: false };
  }
  return {
    hiddenAt: item.hiddenAt,
    hiddenBy: authors.moderator(item.hiddenBy),
    hiddenReason: item.hiddenReason,
    rehidden: false,
  };
}

export class ImportCommentsUseCase {
  constructor(
    private readonly r: { comment: ICommentRepository; user: IUserRepository },
  ) {}

  async execute(items: readonly BackupCommentItem[]): Promise<CommentRestoreReport> {
    if (items.length === 0) return { received: 0, created: 0, anonymized: 0, rehidden: 0 };
    const authors = await LiveAuthors.load(this.r.user);
    let anonymized = 0;
    let rehidden = 0;

    const rows = items.map((item): CommentRow => {
      const author = authors.author(item.username);
      if (author.anonymized) anonymized++;
      const { rehidden: hiddenNow, ...hidden } = hiddenState(item, author.account, authors);
      if (hiddenNow) rehidden++;
      return {
        _id: item._id,
        verseId: item.verseId,
        username: author.username,
        onTitle: item.onTitle,
        bookReference: item.bookReference,
        text: item.text,
        tags: item.tags,
        communitySlug: item.communitySlug,
        verified: item.verified,
        verifiedBy: authors.moderator(item.verifiedBy),
        verifiedAt: item.verifiedAt,
        ...hidden,
        createdAt: item.createdAt,
      };
    });

    const created = await this.r.comment.createMany(rows);
    return { received: items.length, created, anonymized, rehidden };
  }
}

export interface DiscussionRestoreReport {
  received: number;
  /** Rows inserted; the others already existed (same `_id`) or were invalid. */
  created: number;
  /** Rows whose author has no live account, stored anonymized. */
  anonymized: number;
}

type DiscussionRow = Parameters<IDiscussionRepository["createMany"]>[0][number];

// Answers live in their own collection (Phase 9.3) and aren't restored
// through this path.
export class ImportDiscussionsUseCase {
  constructor(
    private readonly r: { discussion: IDiscussionRepository; user: IUserRepository },
  ) {}

  async execute(items: readonly BackupDiscussionItem[]): Promise<DiscussionRestoreReport> {
    if (items.length === 0) return { received: 0, created: 0, anonymized: 0 };
    const authors = await LiveAuthors.load(this.r.user);
    let anonymized = 0;

    const rows = items.map((item): DiscussionRow => {
      const author = authors.author(item.username);
      if (author.anonymized) anonymized++;
      return {
        _id: item._id,
        bookAbbrev: item.bookAbbrev,
        commentId: item.commentId,
        username: author.username,
        verseReference: item.verseReference,
        verseText: item.verseText,
        commentText: item.commentText,
        title: item.title,
        quoteStart: item.quoteStart,
        quoteEnd: item.quoteEnd,
        question: item.question,
        createdAt: item.createdAt,
      };
    });

    const created = await this.r.discussion.createMany(rows);
    return { received: items.length, created, anonymized };
  }
}

export class BackupCommentsUseCase {
  constructor(private readonly commentRepo: ICommentRepository) {}

  async execute(): Promise<Comment[]> {
    return this.commentRepo.findAll();
  }
}

export class BackupDiscussionsUseCase {
  constructor(private readonly discussionRepo: IDiscussionRepository) {}

  async execute(): Promise<Discussion[]> {
    return this.discussionRepo.findAll();
  }
}

// ── Deletion tombstones ────────────────────────────────────────────────

/**
 * Tombstones live in the same database, so a total loss would take them
 * along: they are exported with the rest and restored first.
 */
export class BackupErasuresUseCase {
  constructor(private readonly erasures: IAccountErasureRepository) {}

  execute(): Promise<AccountErasure[]> {
    return this.erasures.list();
  }
}

export interface ErasureRestoreReport {
  received: number;
  /** New tombstones; the others were already recorded. */
  created: number;
}

export class RestoreErasuresUseCase {
  constructor(private readonly erasures: IAccountErasureRepository) {}

  async execute(rows: readonly AccountErasure[]): Promise<ErasureRestoreReport> {
    const created = rows.length > 0 ? await this.erasures.upsertMany([...rows]) : 0;
    return { received: rows.length, created };
  }
}
