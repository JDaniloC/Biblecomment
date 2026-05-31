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
	}>;
	answersCount: number;
	/** Always numeric/boolean on the wire — defaulted when not enriched. */
	likeCount: number;
	likedByMe: boolean;
	/** True when the thread was edited after creation (>1s after createdAt). */
	edited: boolean;
}

/**
 * A discussion counts as "edited" only when `updatedAt` is more than a second
 * after `createdAt`. Mongoose stamps both timestamps together on insert, so the
 * create-time write must not register as an edit; missing timestamps → false.
 */
export function isEdited(
	createdAt?: Date | string,
	updatedAt?: Date | string,
): boolean {
	if (!createdAt || !updatedAt) return false;
	const created = new Date(createdAt).getTime();
	const updated = new Date(updatedAt).getTime();
	if (Number.isNaN(created) || Number.isNaN(updated)) return false;
	return updated - created > 1000;
}

export function toDiscussionWire(discussion: Discussion): DiscussionWire {
	const answers = (discussion.answers ?? []).map((a) => ({
		_id: a._id,
		name: a.username,
		text: a.text,
		authorEmailVerified: a.authorEmailVerified,
		likeCount: a.likeCount ?? 0,
		likedByMe: a.likedByMe ?? false,
	}));
	return {
		...discussion,
		title: discussion.title ?? "",
		answers,
		answersCount: discussion.answersCount ?? answers.length,
		likeCount: discussion.likeCount ?? 0,
		likedByMe: discussion.likedByMe ?? false,
		edited: isEdited(discussion.createdAt, discussion.updatedAt),
	};
}
