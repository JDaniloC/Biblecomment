import {
	IDiscussionLikeRepository,
	DiscussionLikeTarget,
} from "@/domain/repositories/IDiscussionLikeRepository";
import { IDiscussionRepository } from "@/domain/repositories/IDiscussionRepository";

export interface ToggleDiscussionLikeResult {
	targetType: DiscussionLikeTarget;
	targetId: string;
	likeCount: number;
	likedByMe: boolean;
}

/**
 * Toggle the viewer's like on a discussion or one of its answers. Returns the
 * post-toggle stats so the caller can update the UI without a re-fetch —
 * mirrors ToggleLikeUseCase for comments.
 */
export class ToggleDiscussionLikeUseCase {
	constructor(
		private readonly likeRepo: IDiscussionLikeRepository,
		private readonly discussionRepo: IDiscussionRepository,
	) {}

	async execute(
		targetType: DiscussionLikeTarget,
		targetId: string,
		userId: string,
	): Promise<ToggleDiscussionLikeResult> {
		const already = await this.likeRepo.hasLiked(userId, targetType, targetId);
		if (already) {
			await this.likeRepo.unlike(userId, targetType, targetId);
		} else {
			await this.likeRepo.like(userId, targetType, targetId);
		}
		// Maintain the denormalized like counter — only discussions carry one;
		// answer like counts are computed on read, never stored. `already`
		// tells us the direction: previously liked → this toggle removed it.
		if (targetType === "discussion") {
			await this.discussionRepo.incrementLikeCount(targetId, already ? -1 : 1);
		}
		const counts = await this.likeRepo.countByTargets(targetType, [targetId]);
		return {
			targetType,
			targetId,
			likeCount: counts.get(targetId) ?? 0,
			likedByMe: !already,
		};
	}
}
