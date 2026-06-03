import type { DiscussionAnswer } from "./DiscussionAnswer";

export interface Discussion {
	_id?: string;
	bookAbbrev: string;
	/**
	 * The comment this discussion is anchored to. Required for discussions
	 * created after the restructure; legacy threads may lack it.
	 */
	commentId?: string;
	username: string;
	verseReference: string;
	/** Legacy descriptive verse text. No longer written for new discussions. */
	verseText: string;
	/**
	 * Authoritative read-only snapshot of the linked comment's text, taken at
	 * creation time from `commentId` (never user-editable, so the original
	 * comment can't be deturpated).
	 */
	commentText: string;
	/**
	 * Optional highlighted excerpt within `commentText`, stored as character
	 * offsets [quoteStart, quoteEnd). Lets the author feature a contiguous part
	 * of the comment without altering the words.
	 */
	quoteStart?: number;
	quoteEnd?: number;
	/** Short one-line headline (no line breaks). Absent on legacy threads. */
	title?: string;
	/** The discussion's opening message ("comentário da discussão"). */
	question: string;
	/** Aggregated like count — populated at read time, not stored. */
	likeCount?: number;
	/** Whether the viewing user liked this discussion — populated at read time. */
	likedByMe?: boolean;
	/** Snapshot do estado de verificação de e-mail do autor — populado em leitura. */
	authorEmailVerified?: boolean;
	/**
	 * Populated only by detail GETs (single discussion). The list endpoint
	 * leaves it undefined and ships `answersCount` instead — answers live
	 * in the DiscussionAnswer collection (Phase 9.3).
	 */
	answers?: DiscussionAnswer[];
	/** Populated by the list endpoint via batch aggregation. */
	answersCount?: number;
	createdAt?: Date;
	updatedAt?: Date;
}
