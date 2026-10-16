import { Community } from "@/domain/entities/Community";

export interface ListCommunitiesParams {
	page: number;
	pageSize: number;
	/** Case-insensitive substring match against `name` or `slug`. */
	query?: string;
}

export interface ListCommunitiesResult {
	items: Community[];
	total: number;
}

export interface ICommunityRepository {
	/**
	 * Insert a new community. Throws on duplicate slug (caller can map to a
	 * 409 — the use case is responsible for surfacing the friendly error).
	 */
	create(
		input: Omit<
			Community,
			"_id" | "createdAt" | "updatedAt" | "memberCount" | "followerCount"
		>,
	): Promise<Community>;
	findById(id: string): Promise<Community | null>;
	findBySlug(slug: string): Promise<Community | null>;
	/** Public listing for the discovery page (newest-first when no query). */
	list(params: ListCommunitiesParams): Promise<ListCommunitiesResult>;
	/** Number of communities a given user created — drives the 3-per-user limit. */
	countCreatedBy(userId: string): Promise<number>;
	/** Communities a given user created, oldest first (account deletion). */
	listCreatedBy(userId: string): Promise<Community[]>;
	/** Hand a community to a new creator (account deletion ownership transfer). */
	setCreatedBy(id: string, userId: string): Promise<void>;
	/** Bulk fetch for joining membership rows to display data. */
	findManyByIds(ids: string[]): Promise<Community[]>;
	/** Adjust `memberCount` by `delta` (typically +1 or -1). */
	incrementMemberCount(id: string, delta: number): Promise<void>;
	/**
	 * Adjust `followerCount` by `delta`. Follow is viewer-controlled — anyone
	 * can opt-in — so this fires from the follow/unfollow use cases without
	 * any moderation hop. See [[CommunityFollow]].
	 */
	incrementFollowerCount(id: string, delta: number): Promise<void>;
	/**
	 * Overwrite both counters with values recomputed from the join
	 * collections. Unlike `increment*`, safe to repeat — the account
	 * deletion cascade uses it so a retry can't double-decrement. No-op for
	 * an unknown id or when both values are already right (so updatedAt
	 * only moves on a real change).
	 */
	setCounters(
		id: string,
		counters: { memberCount: number; followerCount: number },
	): Promise<void>;
	/** Hard-delete by id. Returns `true` if a row was actually removed. */
	deleteById(id: string): Promise<boolean>;
}
