import type { Discussion } from "@/domain/entities/Discussion";
import type { Notification } from "@/domain/entities/Notification";
import type { Follow } from "@/domain/entities/Follow";
import type {
	DiscussionLikeRow,
	IUserDataExportQueries,
	UserCommentAction,
} from "@/domain/repositories/IUserDataExportQueries";
import { DiscussionModel } from "@/infrastructure/database/models/DiscussionModel";
import { NotificationModel } from "@/infrastructure/database/models/NotificationModel";
import { CommentLikeModel } from "@/infrastructure/database/models/CommentLikeModel";
import { CommentReportModel } from "@/infrastructure/database/models/CommentReportModel";
import { DiscussionLikeModel } from "@/infrastructure/database/models/DiscussionLikeModel";
import { FollowModel } from "@/infrastructure/database/models/FollowModel";
import { connectToDatabase } from "@/infrastructure/database/connection";

// Lean reads with explicit projections: the export maps every field it
// keeps by hand anyway, so hydrated documents would only cost memory.

const DISCUSSION_FIELDS = {
	bookAbbrev: 1,
	commentId: 1,
	username: 1,
	verseReference: 1,
	verseText: 1,
	commentText: 1,
	quoteStart: 1,
	quoteEnd: 1,
	title: 1,
	question: 1,
	answersCount: 1,
	likeCount: 1,
	createdAt: 1,
	updatedAt: 1,
} as const;

const NOTIFICATION_FIELDS = {
	recipient: 1,
	actor: 1,
	type: 1,
	resourceType: 1,
	resourceId: 1,
	message: 1,
	url: 1,
	read: 1,
	createdAt: 1,
} as const;

export class MongoUserDataExportQueries implements IUserDataExportQueries {
	async discussionsByUsernames(usernames: string[]): Promise<Discussion[]> {
		if (usernames.length === 0) return [];
		await connectToDatabase();
		const docs = await DiscussionModel.find(
			{ username: { $in: usernames } },
			DISCUSSION_FIELDS,
		)
			.sort({ createdAt: -1 })
			.lean();
		return docs.map((d) => ({
			_id: String(d._id),
			bookAbbrev: d.bookAbbrev,
			commentId: d.commentId ? String(d.commentId) : undefined,
			username: d.username,
			verseReference: d.verseReference,
			verseText: d.verseText ?? "",
			commentText: d.commentText ?? "",
			quoteStart: d.quoteStart,
			quoteEnd: d.quoteEnd,
			title: d.title ?? "",
			question: d.question,
			answersCount: d.answersCount ?? 0,
			likeCount: d.likeCount ?? 0,
			createdAt: d.createdAt,
			updatedAt: d.updatedAt,
		}));
	}

	async notificationsByRecipients(recipients: string[]): Promise<Notification[]> {
		if (recipients.length === 0) return [];
		await connectToDatabase();
		const docs = await NotificationModel.find(
			{ recipient: { $in: recipients } },
			NOTIFICATION_FIELDS,
		)
			.sort({ createdAt: -1 })
			.lean();
		return docs.map((n) => ({
			_id: String(n._id),
			recipient: n.recipient,
			actor: n.actor,
			type: n.type,
			resourceType: n.resourceType,
			resourceId: n.resourceId,
			message: n.message,
			url: n.url,
			read: n.read ?? false,
			createdAt: n.createdAt,
		}));
	}

	async commentLikesByUser(userId: string): Promise<UserCommentAction[]> {
		await connectToDatabase();
		const docs = await CommentLikeModel.find(
			{ userId },
			{ commentId: 1, createdAt: 1, _id: 0 },
		)
			.sort({ createdAt: -1 })
			.lean();
		return docs.map((d) => ({
			commentId: String(d.commentId),
			createdAt: d.createdAt,
		}));
	}

	async commentReportsByUser(userId: string): Promise<UserCommentAction[]> {
		await connectToDatabase();
		const docs = await CommentReportModel.find(
			{ userId },
			{ commentId: 1, createdAt: 1, _id: 0 },
		)
			.sort({ createdAt: -1 })
			.lean();
		return docs.map((d) => ({
			commentId: String(d.commentId),
			createdAt: d.createdAt,
		}));
	}

	async discussionLikesByUser(userId: string): Promise<DiscussionLikeRow[]> {
		await connectToDatabase();
		const docs = await DiscussionLikeModel.find(
			{ userId },
			{ targetType: 1, targetId: 1, createdAt: 1, _id: 0 },
		)
			.sort({ createdAt: -1 })
			.lean();
		return docs.map((d) => ({
			targetType: d.targetType,
			targetId: String(d.targetId),
			createdAt: d.createdAt,
		}));
	}

	async followsForUser(userId: string): Promise<Follow[]> {
		await connectToDatabase();
		const docs = await FollowModel.find(
			{ $or: [{ followerId: userId }, { followingId: userId }] },
			{ followerId: 1, followingId: 1, createdAt: 1, _id: 0 },
		)
			.sort({ createdAt: -1 })
			.lean();
		return docs.map((d) => ({
			followerId: d.followerId,
			followingId: d.followingId,
			createdAt: d.createdAt,
		}));
	}
}
