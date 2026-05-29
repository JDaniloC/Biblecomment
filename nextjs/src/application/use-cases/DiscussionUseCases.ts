import { IDiscussionRepository } from "@/domain/repositories/IDiscussionRepository";
import { IDiscussionAnswerRepository } from "@/domain/repositories/IDiscussionAnswerRepository";
import { ICommentRepository } from "@/domain/repositories/ICommentRepository";
import { IDiscussionLikeRepository } from "@/domain/repositories/IDiscussionLikeRepository";
import { IUserRepository } from "@/domain/repositories/IUserRepository";
import { Discussion } from "@/domain/entities/Discussion";
import { DiscussionAnswer } from "@/domain/entities/DiscussionAnswer";
import { isEmailVerified, EmailNotVerifiedError } from "@/lib/auth-guards";

export class GetDiscussionsUseCase {
	constructor(
		private readonly discussionRepo: IDiscussionRepository,
		private readonly answerRepo?: IDiscussionAnswerRepository,
	) {}

	/**
	 * Discussions for a book, with `answersCount` populated when the answer
	 * repo is wired. List views render the count without inline answers.
	 *
	 * Pass `{ page, pageSize }` to push pagination down to the DB; without it,
	 * every thread for the book is loaded (legacy behavior, kept for the
	 * admin/export paths that need the full set).
	 */
	async execute(
		bookAbbrev: string,
		pagination?: { page: number; pageSize: number },
	): Promise<Discussion[]> {
		const discussions = pagination
			? await this.discussionRepo.findByBookAbbrevPaginated(
					bookAbbrev,
					pagination.page,
					pagination.pageSize,
				)
			: await this.discussionRepo.findByBookAbbrev(bookAbbrev);
		if (!this.answerRepo || discussions.length === 0) return discussions;
		const ids = discussions.map((d) => d._id ?? "").filter(Boolean);
		const counts = await this.answerRepo.countByDiscussion(ids);
		return discussions.map((d) => ({
			...d,
			answersCount: counts.get(d._id ?? "") ?? 0,
		}));
	}
}

export class GetDiscussionByIdUseCase {
	constructor(
		private readonly discussionRepo: IDiscussionRepository,
		private readonly answerRepo?: IDiscussionAnswerRepository,
		private readonly userRepo?: IUserRepository,
		private readonly likeRepo?: IDiscussionLikeRepository,
	) {}

	/**
	 * Returns the discussion with `answers` populated when the answer repo
	 * is wired. Without it, callers get the bare discussion (used by the
	 * delete-discussion flow that doesn't need answers).
	 *
	 * When `userRepo` is wired, each answer gets `authorEmailVerified` from a
	 * batched lookup. When `likeRepo` is wired, the discussion and each answer
	 * get `likeCount`/`likedByMe` (batched, never N+1); `viewerId` drives
	 * `likedByMe` (anonymous viewers always get false).
	 */
	async execute(id: string, viewerId?: string): Promise<Discussion | null> {
		const discussion = await this.discussionRepo.findById(id);
		if (!discussion) return null;

		// Discussion-level like stats.
		let likeCount = discussion.likeCount;
		let likedByMe = discussion.likedByMe;
		if (this.likeRepo) {
			likeCount =
				(await this.likeRepo.countByTargets("discussion", [id])).get(id) ?? 0;
			likedByMe = viewerId
				? (await this.likeRepo.whichLiked(viewerId, "discussion", [id])).has(id)
				: false;
		}

		if (!this.answerRepo) {
			return { ...discussion, likeCount, likedByMe };
		}
		let answers: DiscussionAnswer[] =
			await this.answerRepo.findByDiscussion(id);

		// Author email-verification snapshot (batched).
		if (this.userRepo && answers.length > 0) {
			const usernames = [...new Set(answers.map((a) => a.username))];
			const users = await this.userRepo.findByUsernames(usernames);
			const verifiedMap = new Map(
				users.map((u) => [u.username, !!u.emailVerifiedAt]),
			);
			answers = answers.map((a) => ({
				...a,
				authorEmailVerified: verifiedMap.get(a.username) ?? false,
			}));
		}

		// Answer-level like stats (batched).
		if (this.likeRepo && answers.length > 0) {
			const answerIds = answers.map((a) => a._id ?? "").filter(Boolean);
			const counts = await this.likeRepo.countByTargets("answer", answerIds);
			const liked = viewerId
				? await this.likeRepo.whichLiked(viewerId, "answer", answerIds)
				: new Set<string>();
			answers = answers.map((a) => ({
				...a,
				likeCount: a._id ? (counts.get(a._id) ?? 0) : 0,
				likedByMe: a._id ? liked.has(a._id) : false,
			}));
		}

		return {
			...discussion,
			answers,
			answersCount: answers.length,
			likeCount,
			likedByMe,
		};
	}
}

export class GetAllDiscussionsPaginatedUseCase {
	constructor(
		private readonly discussionRepo: IDiscussionRepository,
		private readonly answerRepo?: IDiscussionAnswerRepository,
	) {}

	/**
	 * List page payload. Each item is a Discussion with `answersCount` filled
	 * via batch aggregation on the DiscussionAnswer collection — no inline
	 * answers (the list page doesn't render them).
	 */
	async execute(page: number, pageSize: number): Promise<Discussion[]> {
		const discussions = await this.discussionRepo.findAllPaginated(
			page,
			pageSize,
		);
		if (!this.answerRepo || discussions.length === 0) return discussions;
		const ids = discussions.map((d) => d._id ?? "").filter(Boolean);
		const counts = await this.answerRepo.countByDiscussion(ids);
		return discussions.map((d) => ({
			...d,
			answersCount: counts.get(d._id ?? "") ?? 0,
		}));
	}
}

export interface CreateDiscussionInput {
	bookAbbrev: string;
	username: string;
	/** The comment the discussion is anchored to. */
	commentId: string;
	/** One-line headline; line breaks are stripped. */
	title: string;
	/** The discussion's opening message ("comentário da discussão"). */
	body: string;
	/** Optional highlighted excerpt offsets into the comment text. */
	quoteStart?: number;
	quoteEnd?: number;
}

/**
 * Reject an excerpt range unless it is a valid half-open integer interval
 * [start, end) inside [0, len]. Anything else (missing, inverted, out of
 * bounds, non-integer) collapses to "no highlight" rather than throwing —
 * the discussion is still valid without a featured excerpt.
 */
export function normalizeQuoteRange(
	start: number | undefined,
	end: number | undefined,
	len: number,
): { quoteStart?: number; quoteEnd?: number } {
	if (
		typeof start !== "number" ||
		typeof end !== "number" ||
		!Number.isInteger(start) ||
		!Number.isInteger(end) ||
		start < 0 ||
		end > len ||
		start >= end
	) {
		return { quoteStart: undefined, quoteEnd: undefined };
	}
	return { quoteStart: start, quoteEnd: end };
}

export class CreateDiscussionUseCase {
	constructor(
		private readonly discussionRepo: IDiscussionRepository,
		private readonly commentRepo: ICommentRepository,
		private readonly userRepo: IUserRepository,
	) {}

	async execute(input: CreateDiscussionInput): Promise<Discussion> {
		// Gate: only verified users may open discussions.
		const user = await this.userRepo.findByUsername(input.username);
		if (!isEmailVerified(user)) {
			throw new EmailNotVerifiedError();
		}

		// Authoritative snapshot: the comment text is read from the linked
		// comment, never from client input, so the original can't be deturpated.
		const comment = await this.commentRepo.findById(input.commentId);
		if (!comment) throw new Error("Comment not found");

		const commentText = comment.text;
		const title = input.title.replace(/[\r\n]+/g, " ").trim();
		const { quoteStart, quoteEnd } = normalizeQuoteRange(
			input.quoteStart,
			input.quoteEnd,
			commentText.length,
		);

		return this.discussionRepo.create({
			bookAbbrev: input.bookAbbrev,
			commentId: input.commentId,
			username: input.username,
			verseReference: comment.bookReference,
			verseText: "",
			commentText,
			quoteStart,
			quoteEnd,
			title,
			question: input.body,
		});
	}
}

export class AddAnswerUseCase {
	constructor(
		private readonly discussionRepo: IDiscussionRepository,
		private readonly answerRepo: IDiscussionAnswerRepository,
		private readonly userRepo: IUserRepository,
	) {}

	/**
	 * Append an answer to a discussion. Returns the discussion with the
	 * full updated `answers` list so callers can replace local state.
	 */
	async execute(
		discussionId: string,
		userId: string,
		username: string,
		text: string,
	): Promise<Discussion> {
		// Gate: only verified users may answer discussions.
		const user = await this.userRepo.findByUsername(username);
		if (!isEmailVerified(user)) {
			throw new EmailNotVerifiedError();
		}

		const discussion = await this.discussionRepo.findById(discussionId);
		if (!discussion) throw new Error("Discussion not found");

		await this.answerRepo.add({ discussionId, userId, username, text });
		const answers = await this.answerRepo.findByDiscussion(discussionId);
		return { ...discussion, answers, answersCount: answers.length };
	}
}

export class UpdateAnswerUseCase {
	constructor(
		private readonly discussionRepo: IDiscussionRepository,
		private readonly answerRepo: IDiscussionAnswerRepository,
	) {}

	async execute(
		discussionId: string,
		answerId: string,
		requesterUserId: string,
		requesterUsername: string,
		isModerator: boolean,
		text: string,
	): Promise<Discussion> {
		const discussion = await this.discussionRepo.findById(discussionId);
		if (!discussion) throw new Error("Discussion not found");

		const answer = await this.answerRepo.findById(answerId);
		// Belt-and-suspenders: ensure the answer belongs to this discussion so
		// a malicious request can't trick us into editing a sibling thread's row.
		if (!answer || answer.discussionId !== discussionId) {
			throw new Error("Answer not found");
		}

		// Owner check uses userId (immutable). Anonymized rows still have the
		// original userId so a deleted-then-restored owner can't edit; in
		// practice this branch is irrelevant since deleted users can't sign in.
		const isOwner =
			answer.userId === requesterUserId ||
			answer.username === requesterUsername;
		if (!isModerator && !isOwner) {
			throw new Error("Unauthorized");
		}

		const updated = await this.answerRepo.update(answerId, text);
		if (!updated) throw new Error("Answer not found");

		const answers = await this.answerRepo.findByDiscussion(discussionId);
		return { ...discussion, answers, answersCount: answers.length };
	}
}

export class DeleteDiscussionUseCase {
	constructor(
		private readonly discussionRepo: IDiscussionRepository,
		private readonly answerRepo?: IDiscussionAnswerRepository,
	) {}

	async execute(
		id: string,
		username: string,
		isModerator: boolean,
	): Promise<void> {
		const discussion = await this.discussionRepo.findById(id);
		if (!discussion) throw new Error("Discussion not found");
		if (!isModerator && discussion.username !== username)
			throw new Error("Unauthorized");
		await this.discussionRepo.delete(id);
		// Cascade answers for the dead discussion. Best-effort — failure here
		// doesn't undo the discussion delete (the parent row is already gone).
		if (this.answerRepo) {
			await this.answerRepo.deleteByDiscussion(id).catch(() => {});
		}
	}
}

export class GetAllDiscussionsUseCase {
	constructor(private readonly discussionRepo: IDiscussionRepository) {}

	async execute(): Promise<Discussion[]> {
		return this.discussionRepo.findAll();
	}
}

// Re-export for actions/services that import from here for the answer type.
export type { DiscussionAnswer };
