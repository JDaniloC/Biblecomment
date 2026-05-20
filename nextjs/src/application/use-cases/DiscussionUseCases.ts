import { IDiscussionRepository } from "@/domain/repositories/IDiscussionRepository";
import { IDiscussionAnswerRepository } from "@/domain/repositories/IDiscussionAnswerRepository";
import { Discussion } from "@/domain/entities/Discussion";
import { DiscussionAnswer } from "@/domain/entities/DiscussionAnswer";

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
	) {}

	/**
	 * Returns the discussion with `answers` populated when the answer repo
	 * is wired. Without it, callers get the bare discussion (used by the
	 * delete-discussion flow that doesn't need answers).
	 */
	async execute(id: string): Promise<Discussion | null> {
		const discussion = await this.discussionRepo.findById(id);
		if (!discussion) return null;
		if (!this.answerRepo) return discussion;
		const answers = await this.answerRepo.findByDiscussion(id);
		return { ...discussion, answers, answersCount: answers.length };
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

export class CreateDiscussionUseCase {
	constructor(private readonly discussionRepo: IDiscussionRepository) {}

	async execute(
		bookAbbrev: string,
		username: string,
		verseReference: string,
		verseText: string,
		commentText: string,
		question: string,
		commentId?: string,
	): Promise<Discussion> {
		return this.discussionRepo.create({
			bookAbbrev,
			commentId,
			username,
			verseReference,
			verseText,
			commentText,
			question,
		});
	}
}

export class AddAnswerUseCase {
	constructor(
		private readonly discussionRepo: IDiscussionRepository,
		private readonly answerRepo: IDiscussionAnswerRepository,
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
