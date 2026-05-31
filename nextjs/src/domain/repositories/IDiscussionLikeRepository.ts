/** A like can target either a discussion (the thread) or one of its answers. */
export type DiscussionLikeTarget = "discussion" | "answer";

/**
 * Likes for discussions and their answers, stored in a single polymorphic
 * collection keyed by (userId, targetType, targetId). Mirrors the CommentLike
 * repository shape so the enrichment/toggle code reads the same way.
 */
export interface IDiscussionLikeRepository {
	/** Idempotent insert. Returns true if a new like row was created. */
	like(
		userId: string,
		targetType: DiscussionLikeTarget,
		targetId: string,
	): Promise<boolean>;
	unlike(
		userId: string,
		targetType: DiscussionLikeTarget,
		targetId: string,
	): Promise<void>;
	hasLiked(
		userId: string,
		targetType: DiscussionLikeTarget,
		targetId: string,
	): Promise<boolean>;
	/** Batch like counts for the given targets of one type. Missing ids are absent. */
	countByTargets(
		targetType: DiscussionLikeTarget,
		targetIds: string[],
	): Promise<Map<string, number>>;
	/** Which of the given targets the viewer has liked. */
	whichLiked(
		userId: string,
		targetType: DiscussionLikeTarget,
		targetIds: string[],
	): Promise<Set<string>>;
	/** Cascade: drop every like the user has given (account deletion). */
	deleteAllByUser(userId: string): Promise<number>;
	/** Cascade: drop every like on a target (discussion/answer deletion). */
	deleteByTarget(
		targetType: DiscussionLikeTarget,
		targetId: string,
	): Promise<number>;
}
