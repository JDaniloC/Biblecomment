import { Discussion } from "../entities/Discussion";

/**
 * DB-level sort order for discussion list reads.
 * - `recent` → `{ createdAt: -1 }`
 * - `active` → `{ answersCount: -1, createdAt: -1 }`
 * - `liked`  → `{ likeCount: -1, createdAt: -1 }`
 */
export type DiscussionSort = "recent" | "active" | "liked";

export interface IDiscussionRepository {
	findByBookAbbrev(
		bookAbbrev: string,
		sort?: DiscussionSort,
	): Promise<Discussion[]>;
	/**
	 * DB-paginated variant of `findByBookAbbrev`. Used by the discussion list
	 * tab on the book page so we don't pull every thread into memory just to
	 * slice off the requested window.
	 */
	findByBookAbbrevPaginated(
		bookAbbrev: string,
		page: number,
		pageSize: number,
		sort?: DiscussionSort,
	): Promise<Discussion[]>;
	findById(id: string): Promise<Discussion | null>;
	/** Hydrate discussion docs by id list. Order is not preserved — caller re-sorts. */
	findManyByIds(ids: string[]): Promise<Discussion[]>;
	findAllPaginated(
		page: number,
		pageSize: number,
		sort?: DiscussionSort,
		filters?: { q?: string; bookAbbrev?: string },
	): Promise<Discussion[]>;
	create(
		discussion: Omit<
			Discussion,
			"_id" | "createdAt" | "updatedAt" | "answers" | "answersCount"
		>,
	): Promise<Discussion>;
	/** Patch a discussion's editable fields (title + body). Returns the updated entity, or null if absent. */
	update(
		id: string,
		patch: { title: string; question: string },
	): Promise<Discussion | null>;
	createMany(
		discussions: Omit<
			Discussion,
			"_id" | "createdAt" | "updatedAt" | "answers" | "answersCount"
		>[],
	): Promise<number>;
	delete(id: string): Promise<void>;
	findAll(): Promise<Discussion[]>;
	/** Anonymize the top-level discussion author. Answers cascade via DiscussionAnswerRepository. */
	anonymizeByUsername(
		oldUsername: string,
		replacement: string,
	): Promise<number>;
	/** Has the user opened (authored) at least one discussion? */
	userHasOpenedDiscussion(username: string): Promise<boolean>;
	/** Batch count discussions grouped by their anchor commentId. Missing ids absent from the map. */
	countByCommentId(commentIds: string[]): Promise<Map<string, number>>;
	/** Discussões ancoradas a um comentário específico, mais recentes primeiro. */
	findByCommentId(commentId: string): Promise<Discussion[]>;
	/** Ajusta o contador de respostas (delta +1/-1) de forma atômica ($inc). */
	incrementAnswersCount(id: string, delta: number): Promise<void>;
	/** Ajusta o contador de curtidas (delta +1/-1) de forma atômica ($inc). */
	incrementLikeCount(id: string, delta: number): Promise<void>;
	/** Decrementa em 1 o likeCount de várias discussões (cascata de exclusão de conta). */
	decrementLikeCountMany(ids: string[]): Promise<void>;
}
