import type { IFollowRepository } from "@/domain/repositories/IFollowRepository";
import type { IUserRepository } from "@/domain/repositories/IUserRepository";
import type { INotificationRepository } from "@/domain/repositories/INotificationRepository";
import type { ICommentRepository } from "@/domain/repositories/ICommentRepository";
import type { ICommentLikeRepository } from "@/domain/repositories/ICommentLikeRepository";
import type { IVerseRepository } from "@/domain/repositories/IVerseRepository";
import type { Comment } from "@/domain/entities/Comment";
import type { FeedComment, FeedCursor } from "./FeedUseCases";

export class FollowUserUseCase {
  constructor(
    private readonly followRepo: IFollowRepository,
    private readonly userRepo: IUserRepository,
    private readonly notificationRepo?: INotificationRepository,
  ) {}

  /**
   * `actorEmail` resolves to the follower; `targetUsername` to the followee.
   * Throws on self-follow or unknown target. Idempotent: re-following yields
   * `created: false` and emits no duplicate notification.
   */
  async execute(actorEmail: string, targetUsername: string): Promise<{ created: boolean }> {
    const [actor, target] = await Promise.all([
      this.userRepo.findByEmail(actorEmail),
      this.userRepo.findByUsername(targetUsername),
    ]);
    if (!actor || !actor._id) throw new Error("Actor not found");
    if (!target || !target._id) throw new Error("Target not found");
    if (actor._id === target._id) throw new Error("Cannot follow yourself");
    const created = await this.followRepo.follow(actor._id, target._id);

    // Notify the target on the first follow only. `created=false` short-
    // circuits when the row already exists (idempotent re-follow). When the
    // user toggled off then on again, the row was deleted then re-upserted —
    // `created=true` again — so we additionally check whether a prior
    // notification of this (recipient, actor, "new_follower") already exists.
    // Re-following someone shouldn't spam the bell with duplicate alerts.
    if (created && this.notificationRepo) {
      const alreadyNotified = await this.notificationRepo.existsFor(
        target.username,
        actor.username,
        "new_follower",
      );
      if (!alreadyNotified) {
        await this.notificationRepo.create({
          recipient: target.username,
          actor: actor.username,
          type: "new_follower",
          resourceType: "user",
          resourceId: actor.username,
          message: `@${actor.username} começou a te seguir`,
          url: `/u/${actor.username}`,
        });
      }
    }
    return { created };
  }
}

export class UnfollowUserUseCase {
  constructor(
    private readonly followRepo: IFollowRepository,
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(actorEmail: string, targetUsername: string): Promise<void> {
    const [actor, target] = await Promise.all([
      this.userRepo.findByEmail(actorEmail),
      this.userRepo.findByUsername(targetUsername),
    ]);
    if (!actor || !actor._id) throw new Error("Actor not found");
    if (!target || !target._id) throw new Error("Target not found");
    await this.followRepo.unfollow(actor._id, target._id);
  }
}

export interface PublicFollowState {
  followers: number;
  following: number;
  isFollowing: boolean;
}

export interface FollowListEntry {
  username: string;
  displayName?: string;
  /**
   * Whether the viewer (the logged-in user) follows this row's user.
   * Always `false` for anonymous viewers and for the viewer's own row.
   */
  isFollowing: boolean;
  /** True iff the row is the viewer themselves — drives "Hide Seguir button" in the UI. */
  isMe: boolean;
}

/**
 * Public-safe list of users that follow `username`, or that `username` follows,
 * paginated newest-first. Returns null when the target user does not exist.
 */
export class ListFollowConnectionsUseCase {
  constructor(
    private readonly followRepo: IFollowRepository,
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(opts: {
    targetUsername: string;
    direction: "followers" | "following";
    page: number;
    pageSize: number;
    /** Logged-in viewer email — enables per-row `isFollowing` decoration. */
    viewerEmail?: string | null;
  }): Promise<{ items: FollowListEntry[]; total: number } | null> {
    const target = await this.userRepo.findByUsername(opts.targetUsername);
    if (!target || !target._id) return null;

    const ids =
      opts.direction === "followers"
        ? await this.followRepo.listFollowerIds(target._id)
        : await this.followRepo.listFollowingIds(target._id);
    const total = ids.length;
    if (total === 0) return { items: [], total: 0 };

    // Paginate over the id list before joining to users — keeps the user
    // lookup bounded by pageSize regardless of how big the follow list grows.
    const page = Math.max(1, opts.page);
    const pageSize = Math.max(1, Math.min(opts.pageSize, 100));
    const start = (page - 1) * pageSize;
    const slice = ids.slice(start, start + pageSize);
    if (slice.length === 0) return { items: [], total };

    const users = await this.userRepo.findManyByIds(slice);
    // Preserve the chronological order from listFollower*Ids (already sorted
    // by createdAt desc) when re-joining — findManyByIds returns by _id order.
    const byId = new Map(users.map((u) => [u._id ?? "", u]));

    // Resolve viewer + their follow set in one shot so the per-row decoration
    // is a Set membership lookup rather than N round-trips.
    let viewerId: string | null = null;
    let viewerFollowingSet: Set<string> = new Set();
    if (opts.viewerEmail) {
      const viewer = await this.userRepo.findByEmail(opts.viewerEmail);
      if (viewer?._id) {
        viewerId = viewer._id;
        viewerFollowingSet = new Set(await this.followRepo.listFollowingIds(viewer._id));
      }
    }

    const items: FollowListEntry[] = slice
      .map((id) => ({ id, user: byId.get(id) }))
      .filter((x): x is { id: string; user: NonNullable<typeof x.user> } => Boolean(x.user))
      .map(({ id, user }) => ({
        username: user.username,
        displayName: user.displayName,
        isFollowing: viewerFollowingSet.has(id),
        isMe: viewerId === id,
      }));
    return { items, total };
  }
}

export class GetFollowStateUseCase {
  constructor(
    private readonly followRepo: IFollowRepository,
    private readonly userRepo: IUserRepository,
  ) {}

  /**
   * Aggregated counters for a target user plus, when `viewerEmail` is set,
   * whether the viewer follows the target. Anonymous viewers always get
   * `isFollowing: false`.
   */
  async execute(
    targetUsername: string,
    viewerEmail: string | null,
  ): Promise<PublicFollowState | null> {
    const target = await this.userRepo.findByUsername(targetUsername);
    if (!target || !target._id) return null;
    const [followers, following, isFollowing] = await Promise.all([
      this.followRepo.countFollowers(target._id),
      this.followRepo.countFollowing(target._id),
      viewerEmail
        ? this.userRepo
            .findByEmail(viewerEmail)
            .then((u) => (u?._id ? this.followRepo.isFollowing(u._id, target._id!) : false))
        : Promise.resolve(false),
    ]);
    return { followers, following, isFollowing };
  }
}

/**
 * Comments authored by users the viewer follows, paginated newest-first.
 * Empty when the viewer follows nobody.
 */
export class GetFollowingFeedUseCase {
  constructor(
    private readonly followRepo: IFollowRepository,
    private readonly userRepo: IUserRepository,
    private readonly commentRepo: ICommentRepository,
    private readonly likeRepo: ICommentLikeRepository,
    private readonly verseRepo: IVerseRepository,
  ) {}

  async execute(opts: {
    viewerEmail: string;
    cursor?: FeedCursor | null;
    limit: number;
  }): Promise<{ items: FeedComment[]; nextCursor: FeedCursor | null }> {
    const viewer = await this.userRepo.findByEmail(opts.viewerEmail);
    if (!viewer || !viewer._id) return { items: [], nextCursor: null };

    const followingIds = await this.followRepo.listFollowingIds(viewer._id);
    if (followingIds.length === 0) return { items: [], nextCursor: null };

    // Resolve usernames so the comment query can hit its compound index
    // `{ username, createdAt }` directly — avoids a $lookup join across
    // collections in the hot path.
    const followed = await this.userRepo.findManyByIds(followingIds);
    const usernames = followed.map((u) => u.username);
    if (usernames.length === 0) return { items: [], nextCursor: null };

    const { items, nextCursor } = await this.commentRepo.findForModeration({
      cursor: opts.cursor,
      limit: opts.limit,
      usernamesIn: usernames,
    });
    if (items.length === 0) return { items: [], nextCursor };

    const enriched = await this.enrich(items);
    return { items: enriched, nextCursor };
  }

  private async enrich(items: Comment[]): Promise<FeedComment[]> {
    if (items.length === 0) return [];
    const ids = items.map((c) => c._id ?? "").filter(Boolean);
    const verseIds = items.map((c) => c.verseId).filter(Boolean);
    const [counts, verses] = await Promise.all([
      this.likeRepo.countByComment(ids),
      this.verseRepo.findManyByIds(verseIds),
    ]);
    const verseById = new Map(verses.map((v) => [v._id ?? "", v]));
    return items.map((c) => {
      const v = verseById.get(c.verseId);
      return {
        ...c,
        likeCount: counts.get(c._id ?? "") ?? 0,
        link: v
          ? { abbrev: v.abbrev, chapter: v.chapter, verseNumber: v.verseNumber }
          : null,
      };
    });
  }
}
