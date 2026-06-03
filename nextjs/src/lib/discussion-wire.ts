import type { Discussion } from "@/domain/entities/Discussion";

/**
 * Wire shape kept stable across the answers refactor (Phase 9.3): the
 * client (DiscussionDetailClient) reads `a.name`, `a.text`, `a._id`.
 * Internal entity carries `username` (snapshot) + `userId`; this mapper
 * reduces it to the public surface so the UI doesn't need to know about
 * the storage change.
 *
 * `answersCount` is always populated — list views ship just the count
 * (no inline answers), detail views derive it from `answers.length`.
 */
export interface DiscussionWire extends Omit<Discussion, "answers"> {
	/** Always a string on the wire — defaulted to "" for legacy threads. */
	title: string;
	answers: Array<{
		_id?: string;
		name: string;
		text: string;
		authorEmailVerified?: boolean;
		likeCount: number;
		likedByMe: boolean;
		/** Quando a resposta foi criada (snapshot da entidade). */
		createdAt?: Date;
	}>;
	answersCount: number;
	/** Always numeric/boolean on the wire — defaulted when not enriched. */
	likeCount: number;
	likedByMe: boolean;
	/** Always a boolean on the wire — false when not enriched. */
	authorEmailVerified: boolean;
	/** True when the thread was edited after creation (updatedAt past createdAt). */
	edited: boolean;
}

/**
 * A discussion counts as "edited" when `updatedAt` is strictly after
 * `createdAt`. Mongoose stamps both timestamps to the same value on insert, so
 * a never-edited doc reads equal → false; any real edit bumps `updatedAt` past
 * `createdAt` → true. Missing/invalid timestamps → false.
 *
 * (A previous `> 1000ms` tolerance made the marker flaky: a create→edit
 * round-trip completing in under a second registered as "not edited".)
 */
export function isEdited(
	createdAt?: Date | string,
	updatedAt?: Date | string,
): boolean {
	if (!createdAt || !updatedAt) return false;
	const created = new Date(createdAt).getTime();
	const updated = new Date(updatedAt).getTime();
	if (Number.isNaN(created) || Number.isNaN(updated)) return false;
	return updated > created;
}

export function toDiscussionWire(discussion: Discussion): DiscussionWire {
	const answers = (discussion.answers ?? []).map((a) => ({
		_id: a._id,
		name: a.username,
		text: a.text,
		authorEmailVerified: a.authorEmailVerified,
		likeCount: a.likeCount ?? 0,
		likedByMe: a.likedByMe ?? false,
		createdAt: a.createdAt,
	}));
	return {
		...discussion,
		title: discussion.title ?? "",
		answers,
		answersCount: discussion.answersCount ?? answers.length,
		likeCount: discussion.likeCount ?? 0,
		likedByMe: discussion.likedByMe ?? false,
		authorEmailVerified: discussion.authorEmailVerified ?? false,
		edited: isEdited(discussion.createdAt, discussion.updatedAt),
	};
}
