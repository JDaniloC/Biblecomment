import { Comment } from "../entities/Comment";

/**
 * Filter expression for community-aware verse reads.
 *
 * `null` means "general feed only" (no communitySlug set). A list of slugs
 * means "general feed + comments tagged with any of these slugs". `undefined`
 * means "no filter — return everything", which preserves legacy behavior.
 */
export type CommunityFilter = null | string[] | undefined;

export interface ICommentRepository {
	findByVerseId(verseId: string): Promise<Comment[]>;
	/**
	 * Community-aware variant of findByVerseId. When `communities` is undefined
	 * the result is identical to findByVerseId. When it's `null` only comments
	 * without a communitySlug are returned; a non-empty array returns "general
	 * + those slugs". Always sorted newest-first like the base method.
	 */
	findByVerseIdFiltered(
		verseId: string,
		communities: CommunityFilter,
	): Promise<Comment[]>;
	/** Paginated comments for a single community, newest-first. */
	findByCommunity(
		slug: string,
		page: number,
		pageSize: number,
	): Promise<{ items: Comment[]; total: number }>;
	/**
	 * Page-paginated comments authored by anyone in `usernames`, newest-first.
	 * Used by the community page (plan_community): "comments by approved
	 * members of this community" — caller resolves membership → usernames
	 * first, then hands the set here. Empty list short-circuits to
	 * `{ items: [], total: 0 }` (no DB hit).
	 *
	 * `q` is an optional case-insensitive substring match over `text` and
	 * `bookReference`. Skipped when blank. Indexed via the existing $text
	 * + regex paths used by findForModeration.
	 */
	findByUsernamesPaginated(
		usernames: string[],
		page: number,
		pageSize: number,
		opts?: { q?: string },
	): Promise<{ items: Comment[]; total: number }>;
	findByUsername(username: string): Promise<Comment[]>;
	/**
	 * Just the `createdAt` timestamps of the user's comments — the minimal
	 * projection the reading-streak day-set needs.
	 */
	findCommentTimestampsByUsername(username: string): Promise<Date[]>;
	/**
	 * DB-paginated variant of `findByUsername`. Used by the profile comments
	 * tab so we don't pull the user's entire history into memory just to slice.
	 * Page is 1-indexed; pageSize is clamped by the caller.
	 */
	findByUsernamePaginated(
		username: string,
		page: number,
		pageSize: number,
		opts?: { includeHidden?: boolean },
	): Promise<Comment[]>;
	findById(id: string): Promise<Comment | null>;
	findAllPaginated(page: number, pageSize: number): Promise<Comment[]>;
	/** Hydrate Comment docs by id. Order is not guaranteed — caller re-sorts. */
	findManyByIds(ids: string[]): Promise<Comment[]>;
	create(
		comment: Omit<Comment, "_id" | "createdAt" | "updatedAt">,
	): Promise<Comment>;
	createMany(
		comments: Omit<Comment, "_id" | "createdAt" | "updatedAt">[],
	): Promise<number>;
	update(id: string, data: Partial<Comment>): Promise<Comment | null>;
	delete(id: string): Promise<void>;
	findAll(): Promise<Comment[]>;
	searchByText(query: string): Promise<Comment[]>;
	anonymizeByUsername(
		oldUsername: string,
		replacement: string,
	): Promise<number>;
	/**
	 * Cursor-paginated all-comments query for the moderation panel. The
	 * cursor is `(createdAt, id)` of the last item returned by the previous
	 * page, so the next page filters with `createdAt < cursor.createdAt OR
	 * (createdAt = cursor.createdAt AND _id < cursor.id)` — deterministic
	 * tiebreak when timestamps collide.
	 *
	 * Search uses MongoDB full-text on `text` (Portuguese stemming) merged
	 * with case-insensitive regex against `username` and `bookReference`.
	 * Both sides are indexed; nothing scans the collection. There is no
	 * `total` — totals are O(N) and pointless for a feed.
	 */
	findForModeration(opts: {
		q?: string;
		cursor?: { createdAt: Date; id: string } | null;
		limit: number;
		/**
		 * Optional author filter — when provided, the result is restricted to
		 * comments whose `username` is in the list. Used by the home "Seguindo"
		 * tab to filter the cursor stream to followed authors only.
		 */
		usernamesIn?: string[];
		/**
		 * Include soft-hidden comments. Default false — the public feeds that
		 * share this method must not leak hidden comments. The moderation
		 * panel passes `true` so moderators still see them.
		 */
		includeHidden?: boolean;
	}): Promise<{
		items: Comment[];
		nextCursor: { createdAt: Date; id: string } | null;
	}>;
	/** Set the admin-verified state. `by` is the moderator's username (snapshot). */
	setVerified(
		id: string,
		verified: boolean,
		by: string | null,
	): Promise<Comment | null>;
	/**
	 * Soft-hide / un-hide a single comment. On hide, stamps `hiddenAt`,
	 * `hiddenBy` and `hiddenReason`; on un-hide, clears all three. `by` is the
	 * moderator's username (snapshot).
	 */
	setHidden(
		id: string,
		hidden: boolean,
		by: string | null,
		reason: "moderator" | "account-disabled" | null,
	): Promise<Comment | null>;
	/**
	 * Cascade-hide every currently-visible comment by `username` (used when a
	 * moderator disables the account). Comments already hidden are left as-is,
	 * so an individually moderator-hidden comment keeps its `"moderator"`
	 * reason. Returns the number of comments newly hidden.
	 */
	hideAllByUsername(username: string, by: string): Promise<number>;
	/**
	 * Reverse of `hideAllByUsername` — un-hide only the comments hidden by the
	 * `"account-disabled"` cascade (used when re-enabling an account).
	 * Comments hidden individually by a moderator stay hidden. Returns the
	 * number of comments un-hidden.
	 */
	unhideAllByUsernameCascade(username: string): Promise<number>;
	/**
	 * Aggregate counts for a chapter in a single round-trip. Used by the server
	 * component that renders ChapterClient so the verse-comment badges and
	 * title-comment counter paint on first byte instead of after a client fetch.
	 */
	countsForChapter(
		verseIds: string[],
	): Promise<{ countMap: Record<string, number>; titleCount: number }>;
}
