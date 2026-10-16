/**
 * Server-only factories for the account use cases whose cascades touch
 * most collections. Shared by the server actions and the /api/users route
 * so the wiring lives in one place.
 */

import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { MongoCommentLikeRepository } from "@/infrastructure/repositories/MongoCommentLikeRepository";
import { MongoCommentReportRepository } from "@/infrastructure/repositories/MongoCommentReportRepository";
import { MongoDiscussionRepository } from "@/infrastructure/repositories/MongoDiscussionRepository";
import { MongoDiscussionLikeRepository } from "@/infrastructure/repositories/MongoDiscussionLikeRepository";
import { MongoDiscussionAnswerRepository } from "@/infrastructure/repositories/MongoDiscussionAnswerRepository";
import { MongoNotificationRepository } from "@/infrastructure/repositories/MongoNotificationRepository";
import { MongoCommunityRepository } from "@/infrastructure/repositories/MongoCommunityRepository";
import { MongoCommunityMembershipRepository } from "@/infrastructure/repositories/MongoCommunityMembershipRepository";
import { MongoCommunityFollowRepository } from "@/infrastructure/repositories/MongoCommunityFollowRepository";
import { MongoFollowRepository } from "@/infrastructure/repositories/MongoFollowRepository";
import { MongoUserChapterReadRepository } from "@/infrastructure/repositories/MongoUserChapterReadRepository";
import { MongoReadingSessionRepository } from "@/infrastructure/repositories/MongoReadingSessionRepository";
import { MongoReadingReminderPreferenceRepository } from "@/infrastructure/repositories/MongoReadingReminderPreferenceRepository";
import { MongoPushSubscriptionRepository } from "@/infrastructure/repositories/MongoPushSubscriptionRepository";
import { MongoEmailVerificationTokenRepository } from "@/infrastructure/repositories/MongoEmailVerificationTokenRepository";
import { MongoPasswordResetTokenRepository } from "@/infrastructure/repositories/MongoPasswordResetTokenRepository";
import {
	DeleteUserUseCase,
	FinishPendingDeletionsUseCase,
	FinishPendingRenamesUseCase,
	UpdateUsernameUseCase,
} from "@/application/use-cases/UserUseCases";
import { forgetSessionUser } from "@/lib/session-revalidation";

export function makeDeleteUserUseCase(): DeleteUserUseCase {
	return new DeleteUserUseCase(
		{
			user: new MongoUserRepository(),
			comment: new MongoCommentRepository(),
			commentLike: new MongoCommentLikeRepository(),
			commentReport: new MongoCommentReportRepository(),
			discussion: new MongoDiscussionRepository(),
			discussionLike: new MongoDiscussionLikeRepository(),
			discussionAnswer: new MongoDiscussionAnswerRepository(),
			notification: new MongoNotificationRepository(),
			community: new MongoCommunityRepository(),
			communityMembership: new MongoCommunityMembershipRepository(),
			communityFollow: new MongoCommunityFollowRepository(),
			follow: new MongoFollowRepository(),
			chapterRead: new MongoUserChapterReadRepository(),
			readingSession: new MongoReadingSessionRepository(),
			readingReminder: new MongoReadingReminderPreferenceRepository(),
			pushSubscription: new MongoPushSubscriptionRepository(),
			emailVerificationToken: new MongoEmailVerificationTokenRepository(),
			passwordResetToken: new MongoPasswordResetTokenRepository(),
		},
		// Stop this instance from serving the account's cached session the
		// moment it is marked; other instances follow within the cache TTL.
		{ onMarked: forgetSessionUser },
	);
}

export function makeFinishPendingDeletionsUseCase(): FinishPendingDeletionsUseCase {
	return new FinishPendingDeletionsUseCase(
		new MongoUserRepository(),
		makeDeleteUserUseCase(),
	);
}

export function makeFinishPendingRenamesUseCase(): FinishPendingRenamesUseCase {
	return new FinishPendingRenamesUseCase(
		new MongoUserRepository(),
		makeUpdateUsernameUseCase(),
	);
}

export function makeUpdateUsernameUseCase(): UpdateUsernameUseCase {
	return new UpdateUsernameUseCase({
		user: new MongoUserRepository(),
		comment: new MongoCommentRepository(),
		commentReport: new MongoCommentReportRepository(),
		discussion: new MongoDiscussionRepository(),
		discussionAnswer: new MongoDiscussionAnswerRepository(),
		notification: new MongoNotificationRepository(),
		pushSubscription: new MongoPushSubscriptionRepository(),
		readingReminder: new MongoReadingReminderPreferenceRepository(),
	});
}
