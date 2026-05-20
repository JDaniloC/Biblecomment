import { CommunityFollow } from "@/domain/entities/CommunityFollow";

export interface ICommunityFollowRepository {
	/**
	 * Idempotent follow — returns `true` only when a new row was created.
	 * The use case relies on this to know whether to `$inc` followerCount
	 * (without double-counting on repeated taps).
	 */
	follow(userId: string, communityId: string): Promise<boolean>;
	/** Returns `true` only when an existing row was removed. */
	unfollow(userId: string, communityId: string): Promise<boolean>;
	isFollowing(userId: string, communityId: string): Promise<boolean>;
	/** Community._id list the user follows, newest follow first. */
	followedCommunityIds(userId: string): Promise<string[]>;
	/** Raw rows for tests / audit. */
	listForUser(userId: string): Promise<CommunityFollow[]>;
	/** Live follower count (used by the backfill + reconciliation jobs). */
	countByCommunity(communityId: string): Promise<number>;
	/** LGPD cascade: drop every follow row by this user. */
	removeAllByUser(userId: string): Promise<number>;
	/** Hard-delete cascade when a community is removed. */
	removeAllByCommunity(communityId: string): Promise<number>;
}
