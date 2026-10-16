import type { IUserRepository } from "@/domain/repositories/IUserRepository";
import type { ICommentRepository } from "@/domain/repositories/ICommentRepository";
import type { IDiscussionRepository } from "@/domain/repositories/IDiscussionRepository";
import type { IDiscussionAnswerRepository } from "@/domain/repositories/IDiscussionAnswerRepository";
import type { ICommunityRepository } from "@/domain/repositories/ICommunityRepository";
import type { ICommunityMembershipRepository } from "@/domain/repositories/ICommunityMembershipRepository";
import type { ICommunityFollowRepository } from "@/domain/repositories/ICommunityFollowRepository";
import type { IUserChapterReadRepository } from "@/domain/repositories/IUserChapterReadRepository";
import type { IReadingSessionRepository } from "@/domain/repositories/IReadingSessionRepository";
import type { IReadingReminderPreferenceRepository } from "@/domain/repositories/IReadingReminderPreferenceRepository";
import type { IPushSubscriptionRepository } from "@/domain/repositories/IPushSubscriptionRepository";
import type { IUserDataExportQueries } from "@/domain/repositories/IUserDataExportQueries";
import type { User } from "@/domain/entities/User";
import type { Comment } from "@/domain/entities/Comment";
import type { Discussion } from "@/domain/entities/Discussion";
import type { Notification } from "@/domain/entities/Notification";
import type { StoredPushSubscription } from "@/domain/entities/PushSubscription";
import type { ReadingReminderPreference } from "@/domain/entities/ReadingReminderPreference";
import {
	USER_DATA_EXPORT_NOT_INCLUDED,
	USER_DATA_EXPORT_VERSION,
	type ExportedComment,
	type ExportedDiscussion,
	type ExportedFollow,
	type ExportedNotification,
	type ExportedProfile,
	type ExportedPushSubscription,
	type ExportedReminder,
	type UserDataExport,
} from "@/domain/dto/UserDataExportDTO";
import { isActiveAccount } from "@/lib/auth-guards";

/**
 * Everything the export reads. There are deliberately no token
 * repositories: verification and reset tokens are credentials, and leaving
 * them out of the wiring keeps them out of the file by construction.
 */
export interface ExportUserDataRepos {
	user: IUserRepository;
	comment: ICommentRepository;
	discussion: IDiscussionRepository;
	discussionAnswer: IDiscussionAnswerRepository;
	community: ICommunityRepository;
	communityMembership: ICommunityMembershipRepository;
	communityFollow: ICommunityFollowRepository;
	chapterRead: IUserChapterReadRepository;
	readingSession: IReadingSessionRepository;
	readingReminder: IReadingReminderPreferenceRepository;
	pushSubscription: IPushSubscriptionRepository;
	queries: IUserDataExportQueries;
}

/**
 * Self-service data export (LGPD Art. 18 II and V): every record kept
 * about the account, minus credentials (see USER_DATA_EXPORT_NOT_INCLUDED).
 *
 * Username-keyed data is read under both slugs while a rename's cascade is
 * unfinished (`renameFrom`), so nothing still under the old one is missed.
 * Every section goes through an explicit whitelist mapper — entities are
 * never spread, so a field added to a model later doesn't leak by default.
 * Two query waves: the user's own rows, then the records they point at.
 *
 * Returns null for an unknown, disabled or being-deleted account.
 */
export class ExportUserDataUseCase {
	constructor(
		private readonly repos: ExportUserDataRepos,
		private readonly now: () => Date = () => new Date(),
	) {}

	async execute(userId: string): Promise<UserDataExport | null> {
		const r = this.repos;
		const user = await r.user.findById(userId);
		if (!user || !isActiveAccount(user)) return null;
		const slugs = unique([user.username, user.renameFrom]);

		const [
			commentsBySlug,
			ownedDiscussions,
			answers,
			notifications,
			pushBySlug,
			commentLikes,
			commentReports,
			discussionLikes,
			memberships,
			communityFollows,
			createdCommunities,
			follows,
			chaptersRead,
			activeDays,
			remindersBySlug,
		] = await Promise.all([
			Promise.all(slugs.map((s) => r.comment.findByUsername(s))),
			r.queries.discussionsByUsernames(slugs),
			r.discussionAnswer.findByUser(userId),
			r.queries.notificationsByRecipients(slugs),
			Promise.all(slugs.map((s) => r.pushSubscription.findByUsername(s))),
			r.queries.commentLikesByUser(userId),
			r.queries.commentReportsByUser(userId),
			r.queries.discussionLikesByUser(userId),
			r.communityMembership.listForUser(userId),
			r.communityFollow.listForUser(userId),
			r.community.listCreatedBy(userId),
			r.queries.followsForUser(userId),
			r.chapterRead.findAllForUser(userId),
			r.readingSession.findDays(userId),
			// Current slug first: it wins over a row left under the old one.
			Promise.all(slugs.map((s) => r.readingReminder.findByUsername(s))),
		]);

		const likedDiscussions = discussionLikes.filter(
			(l) => l.targetType === "discussion",
		);
		const likedAnswers = discussionLikes.filter((l) => l.targetType === "answer");
		const discussionIds = unique([
			...answers.map((a) => a.discussionId),
			...likedDiscussions.map((l) => l.targetId),
		]);
		const commentIds = unique([
			...commentLikes.map((l) => l.commentId),
			...commentReports.map((x) => x.commentId),
		]);
		const communityIds = unique([
			...memberships.map((m) => m.communityId),
			...communityFollows.map((f) => f.communityId),
		]);
		const otherUserIds = unique(
			follows.map((f) => (f.followerId === userId ? f.followingId : f.followerId)),
		);

		const [refDiscussions, refComments, refCommunities, otherUsers] =
			await Promise.all([
				discussionIds.length > 0 ? r.discussion.findManyByIds(discussionIds) : [],
				commentIds.length > 0 ? r.comment.findManyByIds(commentIds) : [],
				communityIds.length > 0 ? r.community.findManyByIds(communityIds) : [],
				otherUserIds.length > 0 ? r.user.findManyByIds(otherUserIds) : [],
			]);
		const discussionsById = byId(refDiscussions);
		const commentsById = byId(refComments);
		const communitiesById = byId(refCommunities);
		// A follow whose other end is gone (or leaving) names nobody.
		const usersById = byId(otherUsers.filter((u) => !u.deletion));

		const following: ExportedFollow[] = [];
		const followers: ExportedFollow[] = [];
		for (const f of sortByDateDesc(follows, (x) => x.createdAt)) {
			if (f.followerId === userId) {
				const other = usersById.get(f.followingId);
				if (other) following.push(toExportFollow(other, f.createdAt));
			}
			if (f.followingId === userId) {
				const other = usersById.get(f.followerId);
				if (other) followers.push(toExportFollow(other, f.createdAt));
			}
		}

		return {
			exportVersion: USER_DATA_EXPORT_VERSION,
			generatedAt: this.now().toISOString(),
			profile: toExportProfile(user, userId),
			comments: sortByDateDesc(
				dedupeBy(commentsBySlug.flat(), (c) => c._id ?? ""),
				(c) => c.createdAt,
			).map(toExportComment),
			ownedDiscussions: sortByDateDesc(ownedDiscussions, (d) => d.createdAt).map(
				toExportDiscussion,
			),
			answersAuthored: sortByDateDesc(answers, (a) => a.createdAt).map((a) => {
				const d = discussionsById.get(a.discussionId);
				return {
					answerId: a._id ?? "",
					discussionId: a.discussionId,
					verseReference: d?.verseReference ?? null,
					discussionTitle: d?.title || null,
					text: a.text,
					createdAt: iso(a.createdAt),
					updatedAt: iso(a.updatedAt),
				};
			}),
			notifications: sortByDateDesc(notifications, (n) => n.createdAt).map(
				toExportNotification,
			),
			likesGiven: {
				comments: sortByDateDesc(commentLikes, (l) => l.createdAt).map((l) => ({
					commentId: l.commentId,
					bookReference: commentsById.get(l.commentId)?.bookReference ?? null,
					likedAt: iso(l.createdAt),
				})),
				discussions: sortByDateDesc(likedDiscussions, (l) => l.createdAt).map(
					(l) => {
						const d = discussionsById.get(l.targetId);
						return {
							discussionId: l.targetId,
							verseReference: d?.verseReference ?? null,
							title: d?.title || null,
							likedAt: iso(l.createdAt),
						};
					},
				),
				answers: sortByDateDesc(likedAnswers, (l) => l.createdAt).map((l) => ({
					answerId: l.targetId,
					likedAt: iso(l.createdAt),
				})),
			},
			commentReports: sortByDateDesc(commentReports, (x) => x.createdAt).map(
				(x) => ({
					commentId: x.commentId,
					bookReference: commentsById.get(x.commentId)?.bookReference ?? null,
					reportedAt: iso(x.createdAt),
				}),
			),
			communities: {
				created: sortByDateDesc(createdCommunities, (c) => c.createdAt).map(
					(c) => ({
						communityId: c._id ?? "",
						slug: c.slug,
						name: c.name,
						description: c.description,
						createdAt: iso(c.createdAt),
					}),
				),
				memberships: sortByDateDesc(memberships, (m) => m.joinedAt).map((m) => {
					const c = communitiesById.get(m.communityId);
					return {
						communityId: m.communityId,
						slug: c?.slug ?? null,
						name: c?.name ?? null,
						status: m.status,
						role: m.role,
						joinedAt: iso(m.joinedAt),
					};
				}),
				follows: sortByDateDesc(communityFollows, (f) => f.followedAt).map((f) => {
					const c = communitiesById.get(f.communityId);
					return {
						communityId: f.communityId,
						slug: c?.slug ?? null,
						name: c?.name ?? null,
						followedAt: iso(f.followedAt),
					};
				}),
			},
			social: { following, followers },
			reading: {
				chaptersRead: [...chaptersRead]
					.sort(
						(a, b) =>
							time(a.readAt) - time(b.readAt) ||
							a.abbrev.localeCompare(b.abbrev) ||
							a.chapter - b.chapter,
					)
					.map((c) => ({ book: c.abbrev, chapter: c.chapter, readAt: iso(c.readAt) })),
				activeDays: unique(activeDays).sort(),
				reminder: toExportReminder(remindersBySlug.find((p) => p != null) ?? null),
			},
			pushSubscriptions: sortByDateDesc(
				dedupeBy(pushBySlug.flat(), (s) => s.endpoint),
				(s) => s.createdAt,
			).map(toExportPushSubscription),
			notIncluded: USER_DATA_EXPORT_NOT_INCLUDED.map((e) => ({ ...e })),
		};
	}
}

function toExportProfile(user: User, userId: string): ExportedProfile {
	return {
		_id: user._id ?? userId,
		email: user.email,
		username: user.username,
		displayName: user.displayName ?? null,
		state: user.state ?? null,
		belief: user.belief ?? null,
		showBelief: user.showBelief === true,
		moderator: user.moderator === true,
		emailVerifiedAt: iso(user.emailVerifiedAt),
		pendingEmail: user.pendingEmail ?? null,
		tutorialsCompleted: [...(user.tutorialsCompleted ?? [])],
		badges: [...(user.badges ?? [])],
		createdAt: iso(user.createdAt),
		updatedAt: iso(user.updatedAt),
	};
}

// No verifiedBy/hiddenBy (a moderator's identity) and no read-time
// enrichments. `tags` is always an array and `onTitle` always a boolean so
// the file stays importable (ImportCommentsPayloadSchema).
function toExportComment(c: Comment): ExportedComment {
	return {
		_id: c._id ?? "",
		username: c.username,
		verseId: c.verseId,
		bookReference: c.bookReference,
		onTitle: c.onTitle === true,
		text: c.text,
		tags: Array.isArray(c.tags) ? [...c.tags] : [],
		communitySlug: c.communitySlug ?? null,
		verified: c.verified === true,
		verifiedAt: iso(c.verifiedAt),
		hiddenAt: iso(c.hiddenAt),
		hiddenReason: c.hiddenReason ?? null,
		createdAt: iso(c.createdAt),
		updatedAt: iso(c.updatedAt),
	};
}

function toExportDiscussion(d: Discussion): ExportedDiscussion {
	return {
		_id: d._id ?? "",
		username: d.username,
		bookAbbrev: d.bookAbbrev,
		commentId: d.commentId ?? null,
		verseReference: d.verseReference,
		verseText: d.verseText ?? "",
		commentText: d.commentText ?? "",
		quoteStart: d.quoteStart ?? null,
		quoteEnd: d.quoteEnd ?? null,
		title: d.title ?? "",
		question: d.question,
		answersCount: d.answersCount ?? 0,
		likeCount: d.likeCount ?? 0,
		createdAt: iso(d.createdAt),
		updatedAt: iso(d.updatedAt),
	};
}

function toExportNotification(n: Notification): ExportedNotification {
	return {
		type: n.type,
		resourceType: n.resourceType,
		resourceId: n.resourceId,
		actor: n.actor,
		message: n.message,
		url: n.url,
		read: n.read === true,
		createdAt: iso(n.createdAt),
	};
}

function toExportFollow(other: User, since: Date | undefined): ExportedFollow {
	return {
		username: other.username,
		displayName: other.displayName ?? null,
		since: iso(since),
	};
}

function toExportReminder(
	pref: ReadingReminderPreference | null,
): ExportedReminder | null {
	if (!pref) return null;
	return {
		enabled: pref.enabled === true,
		hourLocal: pref.hourLocal,
		tz: pref.tz,
		lastSentAt: iso(pref.lastSentAt),
		createdAt: iso(pref.createdAt),
		updatedAt: iso(pref.updatedAt),
	};
}

// The endpoint path and the p256dh/auth keys act as the device's push
// credentials (and the browser already holds them): only the push
// service's origin identifies which provider receives the pushes.
function toExportPushSubscription(
	s: StoredPushSubscription,
): ExportedPushSubscription {
	return {
		service: originOf(s.endpoint),
		userAgent: s.userAgent ?? null,
		createdAt: iso(s.createdAt),
	};
}

function originOf(endpoint: string): string | null {
	try {
		const origin = new URL(endpoint).origin;
		return origin === "null" ? null : origin;
	} catch {
		return null;
	}
}

function iso(d: Date | string | null | undefined): string | null {
	if (d == null) return null;
	const t = new Date(d);
	return Number.isNaN(t.getTime()) ? null : t.toISOString();
}

function time(d: Date | null | undefined): number {
	const t = d ? new Date(d).getTime() : Number.NaN;
	return Number.isNaN(t) ? 0 : t;
}

function sortByDateDesc<T>(items: T[], date: (item: T) => Date | undefined): T[] {
	return [...items].sort((a, b) => time(date(b)) - time(date(a)));
}

function unique<T>(items: Array<T | null | undefined>): T[] {
	return [...new Set(items.filter((x): x is T => x != null && x !== ""))];
}

function dedupeBy<T>(items: T[], key: (item: T) => string): T[] {
	const seen = new Set<string>();
	return items.filter((item) => {
		const k = key(item);
		if (seen.has(k)) return false;
		seen.add(k);
		return true;
	});
}

function byId<T extends { _id?: string }>(items: T[]): Map<string, T> {
	return new Map(
		items.filter((x): x is T & { _id: string } => !!x._id).map((x) => [x._id, x]),
	);
}
