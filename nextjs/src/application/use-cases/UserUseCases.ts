import {
	IUserRepository,
	AdminUserCursor,
} from "@/domain/repositories/IUserRepository";
import { AdminUserDTO } from "@/domain/dto/AdminUserDTO";
import { ICommentRepository } from "@/domain/repositories/ICommentRepository";
import { ICommentLikeRepository } from "@/domain/repositories/ICommentLikeRepository";
import { IDiscussionLikeRepository } from "@/domain/repositories/IDiscussionLikeRepository";
import { ICommentReportRepository } from "@/domain/repositories/ICommentReportRepository";
import { IDiscussionRepository } from "@/domain/repositories/IDiscussionRepository";
import { IDiscussionAnswerRepository } from "@/domain/repositories/IDiscussionAnswerRepository";
import { INotificationRepository } from "@/domain/repositories/INotificationRepository";
import { ICommunityRepository } from "@/domain/repositories/ICommunityRepository";
import { ICommunityMembershipRepository } from "@/domain/repositories/ICommunityMembershipRepository";
import { ICommunityFollowRepository } from "@/domain/repositories/ICommunityFollowRepository";
import { IFollowRepository } from "@/domain/repositories/IFollowRepository";
import { IUserChapterReadRepository } from "@/domain/repositories/IUserChapterReadRepository";
import { IReadingSessionRepository } from "@/domain/repositories/IReadingSessionRepository";
import { IReadingReminderPreferenceRepository } from "@/domain/repositories/IReadingReminderPreferenceRepository";
import { IPushSubscriptionRepository } from "@/domain/repositories/IPushSubscriptionRepository";
import { IEmailVerificationTokenRepository } from "@/domain/repositories/IEmailVerificationTokenRepository";
import { IPasswordResetTokenRepository } from "@/domain/repositories/IPasswordResetTokenRepository";
import { IAccountErasureRepository } from "@/domain/repositories/IAccountErasureRepository";
import { User } from "@/domain/entities/User";
import { isValidUsername } from "@/lib/sanitize-username";
import { isActiveAccount } from "@/lib/auth-guards";
import { HandOverOwnedCommunitiesUseCase } from "./CommunityUseCases";

export const ANONYMIZED_USERNAME = "[usuário removido]";
/**
 * Replaces a deleted user's id on records that are kept (discussion
 * answers), cutting the pseudonymous link back to the person. Never a
 * valid ObjectId, so it can't collide with a real account.
 */
export const DELETED_USER_ID = "deleted-user";

export class GetUserByEmailUseCase {
	constructor(private readonly userRepo: IUserRepository) {}

	execute(email: string): Promise<User | null> {
		return this.userRepo.findByEmail(email);
	}
}

export class GetUserByUsernameUseCase {
	constructor(private readonly userRepo: IUserRepository) {}

	execute(username: string): Promise<User | null> {
		return this.userRepo.findByUsername(username);
	}
}

export class GetUsersPaginatedUseCase {
	constructor(private readonly userRepo: IUserRepository) {}

	async execute(
		page: number,
		pageSize: number,
	): Promise<Omit<User, "password">[]> {
		const users = await this.userRepo.findAllPaginated(page, pageSize);
		return users.map(({ password: _pw, ...rest }) => rest);
	}
}

export class UpdateUserProfileUseCase {
	constructor(private readonly userRepo: IUserRepository) {}

	async execute(
		email: string,
		data: {
			state?: string;
			belief?: string;
			displayName?: string;
			showBelief?: boolean;
		},
	): Promise<User> {
		// Copy only the editable profile fields: `data` reaches us from a
		// server action, and the repo $sets whatever it is given (moderator,
		// emailVerifiedAt, renameFrom…).
		const patch: Pick<User, "state" | "belief" | "displayName" | "showBelief"> = {};
		if (typeof data.state === "string") patch.state = data.state;
		if (typeof data.belief === "string") patch.belief = data.belief;
		if (typeof data.showBelief === "boolean") patch.showBelief = data.showBelief;
		if (data.displayName !== undefined) {
			const trimmed = String(data.displayName).trim();
			if (trimmed.length < 1 || trimmed.length > 80) {
				throw new Error("Invalid displayName length");
			}
			patch.displayName = trimmed;
		}
		const updated = await this.userRepo.update(email, patch);
		if (!updated) throw new Error("User not found");
		return updated;
	}
}

export interface UpdateUsernameRepos {
	user: IUserRepository;
	comment: ICommentRepository;
	commentReport: ICommentReportRepository;
	discussion: IDiscussionRepository;
	discussionAnswer: IDiscussionAnswerRepository;
	notification: INotificationRepository;
	pushSubscription: IPushSubscriptionRepository;
	readingReminder: IReadingReminderPreferenceRepository;
}

/**
 * Rename a user's slug, cascading the snapshot field across every
 * collection that stored it: comments (author and the verifiedBy/hiddenBy
 * moderator snapshots), comment reports, discussions, discussion answers,
 * notifications, push subscriptions, the reading reminder preference and
 * other users' disabledBy. Push subscriptions and reminders are keyed by
 * username, so missing them would silence the user's devices — and hand
 * them to whoever registers the old name next.
 *
 * The new slug has no live owner, so records still keyed by it (left by a
 * deleted account) are purged before it is claimed. The claim is a
 * compare-and-set (`beginRename`) that also stores the old slug as
 * `renameFrom`; the marker is cleared only once the awaited cascade
 * succeeded. Until then the old slug stays unavailable to everyone
 * (`isUsernameHeld`), and running the use case again — same target or a
 * new one — or the account-maintenance cron finishes the pending cascade
 * first. Every cascade step is a pure move, safe to repeat.
 */
export class UpdateUsernameUseCase {
	constructor(private readonly repos: UpdateUsernameRepos) {}

	async execute(currentEmail: string, newUsername: string): Promise<User> {
		if (!isValidUsername(newUsername)) {
			throw new Error("Invalid username format");
		}

		const r = this.repos;
		const user = await r.user.findByEmail(currentEmail);
		// A rename racing an account deletion would move content out from
		// under the deletion cascade.
		if (!user?._id || !isActiveAccount(user)) throw new Error("User not found");

		if (user.renameFrom) {
			await this.cascade(user.renameFrom, user.username, user._id ?? "");
			await r.user.clearRenameFrom(user._id ?? "");
		}
		if (user.username === newUsername) return { ...user, renameFrom: undefined };

		if (await r.user.isUsernameHeld(newUsername)) {
			throw new Error("Username already taken");
		}

		await Promise.all([
			r.pushSubscription.deleteAllByUsername(newUsername),
			r.readingReminder.deleteByUsername(newUsername),
			r.notification.deleteForUser(newUsername),
		]);
		const oldUsername = user.username;
		const updated = await r.user.beginRename(user._id, oldUsername, newUsername);
		// Another rename of this account got there first.
		if (!updated) throw new Error("Rename conflict");

		await this.cascade(oldUsername, newUsername, updated._id ?? "");
		await r.user.clearRenameFrom(updated._id ?? "");
		return { ...updated, renameFrom: undefined };
	}

	private async cascade(from: string, to: string, userId: string) {
		const r = this.repos;
		await Promise.all([
			r.comment.anonymizeByUsername(from, to),
			r.comment.replaceModeratorRefs(from, to),
			r.commentReport.renameUsername(from, to),
			r.discussion.anonymizeByUsername(from, to),
			r.discussionAnswer.anonymizeByUser(userId, to),
			r.notification.renameUsername(from, to),
			r.pushSubscription.renameUsername(from, to),
			r.readingReminder.renameUsername(from, to),
			r.user.replaceDisabledBy(from, to),
		]);
	}
}

export interface DeleteUserRepos {
	user: IUserRepository;
	comment: ICommentRepository;
	commentLike: ICommentLikeRepository;
	commentReport: ICommentReportRepository;
	discussion: IDiscussionRepository;
	discussionLike: IDiscussionLikeRepository;
	discussionAnswer: IDiscussionAnswerRepository;
	notification: INotificationRepository;
	community: ICommunityRepository;
	communityMembership: ICommunityMembershipRepository;
	communityFollow: ICommunityFollowRepository;
	follow: IFollowRepository;
	chapterRead: IUserChapterReadRepository;
	readingSession: IReadingSessionRepository;
	readingReminder: IReadingReminderPreferenceRepository;
	pushSubscription: IPushSubscriptionRepository;
	emailVerificationToken: IEmailVerificationTokenRepository;
	passwordResetToken: IPasswordResetTokenRepository;
	erasures: IAccountErasureRepository;
}

export interface DeleteUserHooks {
	/**
	 * Called once the account is marked as being deleted, before any record
	 * is touched — e.g. to drop cached sessions so the user stops writing.
	 */
	onMarked?(userId: string): void;
}

/**
 * Thrown when a deletion failed after the account was marked: the user
 * can no longer sign in, and the account-maintenance cron (or any retry)
 * completes the cascade from the stored snapshot.
 */
export class DeletionIncompleteError extends Error {
	constructor(
		readonly userId: string,
		cause: unknown,
	) {
		super("Account deletion incomplete", { cause });
		this.name = "DeletionIncompleteError";
	}
}

/**
 * Delete an account (LGPD Art. 18): the user's own records are removed,
 * content other people interact with (comments, discussions, answers) is
 * kept under ANONYMIZED_USERNAME, and the denormalized counters those
 * records fed are recomputed.
 *
 * No transactions (the deployment doesn't use them), so the cascade is
 * built to be re-run until it completes, with the User document — deleted
 * last — as the progress record:
 *  1. Mark the account (`beginDeletion`). From here on it can't sign in,
 *     its sessions are rejected (on other instances once their session
 *     cache expires) and the content and username-keyed write paths refuse
 *     it (`isActiveAccount`). Id-keyed rows a stale session still writes
 *     (likes, reading data) are swept by scripts/reconcile-user-data.js.
 *  2. Snapshot the communities and discussions whose counters depend on
 *     this user's rows and merge it into the stored snapshot (which keeps
 *     what earlier, failed attempts saw). Then record the erasure tombstone
 *     (account id + requestedAt only), so restoring an older backup can't
 *     re-create the account; a failed write is retried with the rest.
 *  3. Hand over (or delete) the communities the user created.
 *  4. Remove / anonymize every user-keyed record. Each step is idempotent.
 *  5. Recompute the snapshot's counters from the remaining rows. Unlike a
 *     $inc, a retry can't double-count, and a crash between 4 and 5 is
 *     repaired by the retry because the snapshot survived on the user.
 *  6. Delete the user.
 *
 * A failure after step 1 surfaces as DeletionIncompleteError; the user
 * can't retry (they're locked out), so FinishPendingDeletionsUseCase does.
 */
export class DeleteUserUseCase {
	constructor(
		private readonly repos: DeleteUserRepos,
		private readonly hooks: DeleteUserHooks = {},
	) {}

	async execute(
		requestorEmail: string,
		targetEmail: string,
		isModerator: boolean,
	): Promise<{ userId: string }> {
		if (requestorEmail !== targetEmail && !isModerator)
			throw new Error("Unauthorized");
		const r = this.repos;
		const user = await r.user.findByEmail(targetEmail);
		if (!user?._id) throw new Error("User not found");
		const userId = user._id;

		const marked = await r.user.beginDeletion(userId, {
			communityIds: [],
			discussionIds: [],
		});
		if (!marked) throw new Error("User not found");
		this.hooks.onMarked?.(userId);

		try {
			// Re-read after marking: no rename can start from here on
			// (beginRename refuses a marked account), so these are final. A
			// rename whose cascade never finished leaves records under the old
			// slug too; both must be cleaned before the slug is released.
			const current = (await r.user.findByEmail(targetEmail)) ?? user;
			const usernames = [current.renameFrom, current.username].filter(
				(u): u is string => !!u,
			);
			await this.cascade(userId, usernames);
		} catch (err) {
			throw new DeletionIncompleteError(userId, err);
		}
		return { userId };
	}

	private async cascade(userId: string, usernames: string[]): Promise<void> {
		const r = this.repos;
		const [memberships, followedCommunityIds, likedDiscussionIds] =
			await Promise.all([
				r.communityMembership.listForUser(userId),
				r.communityFollow.followedCommunityIds(userId),
				r.discussionLike.findLikedDiscussionIds(userId),
			]);
		const snapshot = await r.user.beginDeletion(userId, {
			communityIds: [
				...new Set([
					...memberships.map((m) => m.communityId),
					...followedCommunityIds,
				]),
			],
			discussionIds: likedDiscussionIds,
		});
		// Deleted concurrently by another attempt that got further.
		if (!snapshot) return;

		// Before anything is removed: the user document is the retry record,
		// so a deletion can't complete without its tombstone.
		await r.erasures.record(userId, snapshot.requestedAt);

		await new HandOverOwnedCommunitiesUseCase(
			r.community,
			r.communityMembership,
			r.communityFollow,
			r.user,
			r.notification,
		).execute(userId);

		await Promise.all([
			r.communityMembership.removeAllByUser(userId),
			r.communityFollow.removeAllByUser(userId),
			r.follow.removeAllForUser(userId),
			r.commentLike.deleteAllByUser(userId),
			r.commentReport.deleteAllByUser(userId),
			r.discussionLike.deleteAllByUser(userId),
			r.discussionAnswer.detachUser(userId, {
				username: ANONYMIZED_USERNAME,
				userId: DELETED_USER_ID,
			}),
			r.chapterRead.deleteAllByUser(userId),
			r.readingSession.deleteAllByUser(userId),
			r.emailVerificationToken.deleteByUserId(userId),
			r.passwordResetToken.deleteByUserId(userId),
		]);
		// Slug by slug, the old one (renameFrom) first: a rename cascade still
		// in flight moves rows old → new, so a row either is anonymized under
		// the old slug before it moves, or has moved before the new slug is
		// swept.
		for (const username of usernames) {
			await Promise.all([
				r.comment.anonymizeByUsername(username, ANONYMIZED_USERNAME),
				r.comment.replaceModeratorRefs(username, ANONYMIZED_USERNAME),
				r.discussion.anonymizeByUsername(username, ANONYMIZED_USERNAME),
				// Notifications about the user (as recipient or actor) lose
				// their meaning once the account is gone.
				r.notification.deleteForUser(username),
				r.user.replaceDisabledBy(username, ANONYMIZED_USERNAME),
				r.readingReminder.deleteByUsername(username),
				r.pushSubscription.deleteAllByUsername(username),
			]);
		}

		// One community at a time: each needs two counts and the pool is small.
		for (const communityId of snapshot.communityIds) {
			const [memberCount, followerCount] = await Promise.all([
				r.communityMembership.countApproved(communityId),
				r.communityFollow.countByCommunity(communityId),
			]);
			await r.community.setCounters(communityId, { memberCount, followerCount });
		}
		if (snapshot.discussionIds.length > 0) {
			const likes = await r.discussionLike.countByTargets(
				"discussion",
				snapshot.discussionIds,
			);
			await r.discussion.setLikeCounts(
				new Map(snapshot.discussionIds.map((id) => [id, likes.get(id) ?? 0])),
			);
		}

		await r.user.deleteById(userId);
	}
}

/**
 * Resume deletions that started but never finished (the user is locked
 * out by then, so nobody else would). Run by the account-maintenance cron;
 * the grace period keeps it off deletions still running in a request.
 */
export class FinishPendingDeletionsUseCase {
	constructor(
		private readonly userRepo: IUserRepository,
		private readonly deleteUser: DeleteUserUseCase,
	) {}

	async execute(opts: {
		now: Date;
		graceMs: number;
		limit: number;
	}): Promise<PendingRunResult> {
		const pending = await this.userRepo.findPendingDeletions(
			new Date(opts.now.getTime() - opts.graceMs),
			opts.limit,
		);
		const result: PendingRunResult = { finished: [], failed: [] };
		// One at a time: each cascade already saturates the small pool.
		for (const u of pending) {
			try {
				await this.deleteUser.execute(u.email, u.email, false);
				result.finished.push(u._id ?? "");
			} catch (err) {
				result.failed.push({ userId: u._id ?? "", error: describeError(err) });
			}
		}
		return result;
	}
}

/**
 * Resume renames whose cascade never finished (`renameFrom` still set).
 * The profile UI can't resubmit the same slug, so without this the old
 * slug — and whatever still sits under it — would stay held forever.
 */
export class FinishPendingRenamesUseCase {
	constructor(
		private readonly userRepo: IUserRepository,
		private readonly updateUsername: UpdateUsernameUseCase,
	) {}

	async execute(opts: { limit: number }): Promise<PendingRunResult> {
		const pending = await this.userRepo.findPendingRenames(opts.limit);
		const result: PendingRunResult = { finished: [], failed: [] };
		for (const u of pending) {
			try {
				// Same target: the use case only finishes the pending cascade.
				await this.updateUsername.execute(u.email, u.username);
				result.finished.push(u._id ?? "");
			} catch (err) {
				result.failed.push({ userId: u._id ?? "", error: describeError(err) });
			}
		}
		return result;
	}
}

export interface PendingRunResult {
	finished: string[];
	failed: Array<{ userId: string; error: string }>;
}

function describeError(err: unknown): string {
	const cause = err instanceof Error && err.cause !== undefined ? err.cause : err;
	return cause instanceof Error ? cause.message : String(cause);
}

export class MarkTutorialCompletedUseCase {
	constructor(private readonly userRepo: IUserRepository) {}

	async execute(email: string, name: string): Promise<void> {
		if (!name || typeof name !== "string")
			throw new Error("Invalid tutorial name");
		await this.userRepo.markTutorialCompleted(email, name);
	}
}

export class SetModeratorUseCase {
	constructor(private readonly userRepo: IUserRepository) {}

	async execute(email: string, moderator: boolean): Promise<User> {
		const updated = await this.userRepo.update(email, { moderator });
		if (!updated) throw new Error("User not found");
		return updated;
	}
}

/**
 * Disable or re-enable a user account (moderator action — caller gates).
 *
 * Disabling stamps `disabledAt`/`disabledBy` (blocking new logins) and then
 * cascade-hides every visible comment by the author. Re-enabling clears the
 * flag and un-hides only the cascade-hidden comments — comments a moderator
 * hid individually keep their `"moderator"` reason and stay hidden.
 *
 * The user flag is written BEFORE the comment cascade so a cascade failure
 * still leaves the account disabled (login blocked); re-running is idempotent.
 */
export class SetUserDisabledUseCase {
	constructor(
		private readonly userRepo: IUserRepository,
		private readonly commentRepo: ICommentRepository,
	) {}

	async execute(
		targetEmail: string,
		disabled: boolean,
		moderatorUsername: string,
	): Promise<User> {
		const updated = await this.userRepo.setDisabled(
			targetEmail,
			disabled,
			disabled ? moderatorUsername : null,
		);
		if (!updated) throw new Error("User not found");

		if (disabled) {
			await this.commentRepo.hideAllByUsername(
				updated.username,
				moderatorUsername,
			);
		} else {
			await this.commentRepo.unhideAllByUsernameCascade(updated.username);
		}
		return updated;
	}
}

export class ListUsersForModerationUseCase {
	constructor(private readonly userRepo: IUserRepository) {}

	execute(opts: {
		q?: string;
		cursor?: AdminUserCursor | null;
		limit: number;
	}): Promise<{ items: AdminUserDTO[]; nextCursor: AdminUserCursor | null }> {
		return this.userRepo.findForModeration(opts);
	}
}
