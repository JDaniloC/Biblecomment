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
}
