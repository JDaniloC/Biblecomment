import { describe, it, expect, vi } from "vitest";
import {
	ExportUserDataUseCase,
	type ExportUserDataRepos,
} from "./ExportUserDataUseCase";
import {
	makeCommunityRepo,
	makeFollowRepo,
	makeMembershipRepo,
} from "./__fakes__/communityRepos";
import { USER_DATA_EXPORT_VERSION } from "@/domain/dto/UserDataExportDTO";
import type { IUserRepository } from "@/domain/repositories/IUserRepository";
import type { ICommentRepository } from "@/domain/repositories/ICommentRepository";
import type { IDiscussionRepository } from "@/domain/repositories/IDiscussionRepository";
import type { IDiscussionAnswerRepository } from "@/domain/repositories/IDiscussionAnswerRepository";
import type { IUserChapterReadRepository } from "@/domain/repositories/IUserChapterReadRepository";
import type { IReadingSessionRepository } from "@/domain/repositories/IReadingSessionRepository";
import type { IReadingReminderPreferenceRepository } from "@/domain/repositories/IReadingReminderPreferenceRepository";
import type { IPushSubscriptionRepository } from "@/domain/repositories/IPushSubscriptionRepository";
import type {
	DiscussionLikeRow,
	IUserDataExportQueries,
	UserCommentAction,
} from "@/domain/repositories/IUserDataExportQueries";
import type { User } from "@/domain/entities/User";
import type { Comment } from "@/domain/entities/Comment";
import type { Discussion } from "@/domain/entities/Discussion";
import type { DiscussionAnswer } from "@/domain/entities/DiscussionAnswer";
import type { Notification } from "@/domain/entities/Notification";
import type { Follow } from "@/domain/entities/Follow";
import type { StoredPushSubscription } from "@/domain/entities/PushSubscription";
import type { ReadingReminderPreference } from "@/domain/entities/ReadingReminderPreference";
import type { UserChapterRead } from "@/domain/entities/UserChapterRead";

const NOW = new Date("2026-10-16T12:00:00Z");
const d = (iso: string) => new Date(iso);

function alice(overrides: Partial<User> = {}): User {
	return {
		_id: "u1",
		email: "alice@example.com",
		username: "alice",
		displayName: "Alice Souza",
		password: "$2b$12$SECRET",
		state: "SP",
		belief: "Batista",
		showBelief: false,
		moderator: false,
		tutorialsCompleted: ["chapter-v1"],
		badges: ["first-comment"],
		emailVerifiedAt: d("2026-01-02T10:00:00Z"),
		pendingEmail: "alice.new@example.com",
		sessionVersion: 3,
		createdAt: d("2026-01-01T09:00:00Z"),
		updatedAt: d("2026-09-01T09:00:00Z"),
		...overrides,
	};
}

function otherUser(id: string, username: string, overrides: Partial<User> = {}): User {
	return {
		_id: id,
		email: `${username}@example.com`,
		username,
		password: "$2b$12$OTHER",
		...overrides,
	};
}

function comment(overrides: Partial<Comment> = {}): Comment {
	return {
		_id: "c1",
		verseId: "v1",
		username: "alice",
		onTitle: false,
		bookReference: "gn 1:1",
		text: "Comentário da Alice",
		tags: ["devocional"],
		createdAt: d("2026-05-01T00:00:00Z"),
		updatedAt: d("2026-05-01T00:00:00Z"),
		...overrides,
	};
}

function discussion(overrides: Partial<Discussion> = {}): Discussion {
	return {
		_id: "d1",
		bookAbbrev: "gn",
		commentId: "c1",
		username: "alice",
		verseReference: "gn 1:1",
		verseText: "",
		commentText: "Comentário da Alice",
		title: "Sobre a criação",
		question: "O que vocês acham?",
		answersCount: 1,
		likeCount: 2,
		createdAt: d("2026-05-02T00:00:00Z"),
		updatedAt: d("2026-05-02T00:00:00Z"),
		...overrides,
	};
}

function answer(overrides: Partial<DiscussionAnswer> = {}): DiscussionAnswer {
	return {
		_id: "a1",
		discussionId: "d1",
		userId: "u1",
		username: "alice",
		text: "Minha resposta",
		createdAt: d("2026-05-03T00:00:00Z"),
		updatedAt: d("2026-05-03T00:00:00Z"),
		...overrides,
	};
}

function notification(overrides: Partial<Notification> = {}): Notification {
	return {
		_id: "n1",
		recipient: "alice",
		actor: "bob",
		type: "discussion_answer",
		resourceType: "discussion",
		resourceId: "d1",
		message: "@bob respondeu",
		url: "/discussions/d1",
		read: false,
		createdAt: d("2026-05-04T00:00:00Z"),
		...overrides,
	};
}

function push(overrides: Partial<StoredPushSubscription> = {}): StoredPushSubscription {
	return {
		_id: "p1",
		username: "alice",
		endpoint: "https://fcm.googleapis.com/fcm/send/DEVICE-SECRET",
		p256dh: "P256-SECRET",
		auth: "AUTH-SECRET",
		userAgent: "Mozilla/5.0 (Android)",
		createdAt: d("2026-06-01T00:00:00Z"),
		...overrides,
	};
}

function reminder(
	overrides: Partial<ReadingReminderPreference> = {},
): ReadingReminderPreference {
	return {
		_id: "r1",
		username: "alice",
		enabled: true,
		hourLocal: 7.5,
		tz: "America/Sao_Paulo",
		lastSentAt: d("2026-10-15T10:30:00Z"),
		createdAt: d("2026-06-01T00:00:00Z"),
		updatedAt: d("2026-06-02T00:00:00Z"),
		...overrides,
	};
}

interface Seed {
	users?: User[];
	comments?: Comment[];
	discussions?: Discussion[];
	answers?: DiscussionAnswer[];
	notifications?: Notification[];
	pushSubscriptions?: StoredPushSubscription[];
	commentLikes?: UserCommentAction[];
	commentReports?: UserCommentAction[];
	discussionLikes?: DiscussionLikeRow[];
	follows?: Follow[];
	chaptersRead?: UserChapterRead[];
	activeDays?: string[];
	reminders?: ReadingReminderPreference[];
}

/**
 * In-memory stand-ins: username-keyed reads filter by exact slug like the
 * Mongo queries; the community repos are the shared stateful fakes.
 */
function makeHarness(seed: Seed = {}) {
	const users = seed.users ?? [alice()];
	const comments = seed.comments ?? [];
	const discussions = seed.discussions ?? [];
	const notifications = seed.notifications ?? [];
	const pushes = seed.pushSubscriptions ?? [];
	const reminders = seed.reminders ?? [];
	const hasId = <T extends { _id?: string }>(ids: string[]) => (x: T) =>
		ids.includes(x._id ?? "");

	const user = {
		findById: vi.fn(async (id: string) => users.find((u) => u._id === id) ?? null),
		findManyByIds: vi.fn(async (ids: string[]) => users.filter(hasId(ids))),
		findAll: vi.fn(async () => users),
	};
	const commentRepo = {
		findByUsername: vi.fn(async (s: string) => comments.filter((c) => c.username === s)),
		findManyByIds: vi.fn(async (ids: string[]) => comments.filter(hasId(ids))),
	};
	const discussionRepo = {
		findManyByIds: vi.fn(async (ids: string[]) => discussions.filter(hasId(ids))),
		findAll: vi.fn(async () => discussions),
	};
	const discussionAnswer = {
		findByUser: vi.fn(async (id: string) =>
			(seed.answers ?? []).filter((a) => a.userId === id),
		),
	};
	const pushSubscription = {
		findByUsername: vi.fn(async (s: string) => pushes.filter((p) => p.username === s)),
	};
	const readingReminder = {
		findByUsername: vi.fn(
			async (s: string) => reminders.find((p) => p.username === s) ?? null,
		),
	};
	const queries = {
		discussionsByUsernames: vi.fn(async (names: string[]) =>
			discussions.filter((x) => names.includes(x.username)),
		),
		notificationsByRecipients: vi.fn(async (names: string[]) =>
			notifications.filter((n) => names.includes(n.recipient)),
		),
		commentLikesByUser: vi.fn(async () => seed.commentLikes ?? []),
		commentReportsByUser: vi.fn(async () => seed.commentReports ?? []),
		discussionLikesByUser: vi.fn(async () => seed.discussionLikes ?? []),
		followsForUser: vi.fn(async (id: string) =>
			(seed.follows ?? []).filter((f) => f.followerId === id || f.followingId === id),
		),
	};
	const community = makeCommunityRepo();
	const communityMembership = makeMembershipRepo();
	const communityFollow = makeFollowRepo();

	const repos: ExportUserDataRepos = {
		user: user as unknown as IUserRepository,
		comment: commentRepo as unknown as ICommentRepository,
		discussion: discussionRepo as unknown as IDiscussionRepository,
		discussionAnswer: discussionAnswer as unknown as IDiscussionAnswerRepository,
		community,
		communityMembership,
		communityFollow,
		chapterRead: {
			findAllForUser: vi.fn(async (id: string) =>
				(seed.chaptersRead ?? []).filter((c) => c.userId === id),
			),
		} as unknown as IUserChapterReadRepository,
		readingSession: {
			findDays: vi.fn(async () => seed.activeDays ?? []),
		} as unknown as IReadingSessionRepository,
		readingReminder: readingReminder as unknown as IReadingReminderPreferenceRepository,
		pushSubscription: pushSubscription as unknown as IPushSubscriptionRepository,
		queries: queries as unknown as IUserDataExportQueries,
	};

	return {
		useCase: new ExportUserDataUseCase(repos, () => NOW),
		user,
		comment: commentRepo,
		discussion: discussionRepo,
		pushSubscription,
		readingReminder,
		queries,
		community,
		communityMembership,
		communityFollow,
	};
}

/** Every object key anywhere in the value. */
function allKeys(value: unknown, out = new Set<string>()): Set<string> {
	if (Array.isArray(value)) {
		for (const v of value) allKeys(v, out);
	} else if (value && typeof value === "object") {
		for (const [k, v] of Object.entries(value)) {
			out.add(k);
			allKeys(v, out);
		}
	}
	return out;
}

const FORBIDDEN_KEYS = [
	"password",
	"tokenHash",
	"p256dh",
	"auth",
	"endpoint",
	"deletion",
	"renameFrom",
	"disabledAt",
	"disabledBy",
	"verifiedBy",
	"hiddenBy",
	"sessionVersion",
	"authorEmailVerified",
];

describe("ExportUserDataUseCase", () => {
	it("returns null for an unknown, disabled or being-deleted account, without reading its data", async () => {
		const cases: Array<User[]> = [
			[],
			[alice({ disabledAt: d("2026-09-01T00:00:00Z"), disabledBy: "mod-jane" })],
			[
				alice({
					deletion: { requestedAt: d("2026-10-01T00:00:00Z"), communityIds: [], discussionIds: [] },
				}),
			],
		];
		for (const users of cases) {
			const h = makeHarness({ users });
			expect(await h.useCase.execute("u1")).toBeNull();
			expect(h.comment.findByUsername).not.toHaveBeenCalled();
			expect(h.queries.discussionsByUsernames).not.toHaveBeenCalled();
		}
	});

	it("exports a whitelisted profile with ISO dates, the version and the injected clock", async () => {
		// A stale disabledBy (left after re-enabling) must not leak either.
		const h = makeHarness({ users: [alice({ disabledBy: "mod-jane" })] });

		const dump = await h.useCase.execute("u1");

		expect(dump?.exportVersion).toBe(USER_DATA_EXPORT_VERSION);
		expect(dump?.exportVersion).toBe(2);
		expect(dump?.generatedAt).toBe("2026-10-16T12:00:00.000Z");
		expect(dump?.profile).toEqual({
			_id: "u1",
			email: "alice@example.com",
			username: "alice",
			displayName: "Alice Souza",
			state: "SP",
			belief: "Batista",
			showBelief: false,
			moderator: false,
			emailVerifiedAt: "2026-01-02T10:00:00.000Z",
			pendingEmail: "alice.new@example.com",
			tutorialsCompleted: ["chapter-v1"],
			badges: ["first-comment"],
			createdAt: "2026-01-01T09:00:00.000Z",
			updatedAt: "2026-09-01T09:00:00.000Z",
		});
	});

	it("reads both slugs of an unfinished rename, deduplicating, and prefers the current slug's reminder", async () => {
		const shared = comment({ _id: "c-shared", username: "alice" });
		const h = makeHarness({
			users: [alice({ username: "alice-2", renameFrom: "alice" })],
			comments: [comment({ _id: "c-new", username: "alice-2" }), comment({ _id: "c-old" })],
			discussions: [discussion({ _id: "d-new", username: "alice-2" }), discussion({ _id: "d-old" })],
			notifications: [
				notification({ _id: "n-new", recipient: "alice-2" }),
				notification({ _id: "n-old" }),
			],
			pushSubscriptions: [push({ username: "alice-2" }), push()],
			reminders: [reminder({ hourLocal: 6 }), reminder({ username: "alice-2", hourLocal: 21 })],
		});
		// A row the rename moved mid-export shows up under both slugs.
		h.comment.findByUsername.mockImplementation(async (s: string) =>
			s === "alice-2"
				? [comment({ _id: "c-new", username: "alice-2" }), shared]
				: [comment({ _id: "c-old" }), shared],
		);

		const dump = await h.useCase.execute("u1");

		expect(h.comment.findByUsername.mock.calls.map((c) => c[0])).toEqual(["alice-2", "alice"]);
		expect(h.queries.discussionsByUsernames).toHaveBeenCalledWith(["alice-2", "alice"]);
		expect(h.queries.notificationsByRecipients).toHaveBeenCalledWith(["alice-2", "alice"]);
		expect(h.pushSubscription.findByUsername.mock.calls.map((c) => c[0])).toEqual([
			"alice-2",
			"alice",
		]);
		expect(dump?.comments.map((c) => c._id).sort()).toEqual(["c-new", "c-old", "c-shared"]);
		expect(dump?.ownedDiscussions).toHaveLength(2);
		expect(dump?.notifications).toHaveLength(2);
		// Same endpoint under both slugs: one device.
		expect(dump?.pushSubscriptions).toHaveLength(1);
		expect(dump?.reading.reminder?.hourLocal).toBe(21);
		expect(dump?.profile.username).toBe("alice-2");
	});

	it("falls back to the old slug's reminder while the rename hasn't moved it", async () => {
		const h = makeHarness({
			users: [alice({ username: "alice-2", renameFrom: "alice" })],
			reminders: [reminder({ hourLocal: 6 })],
		});

		const dump = await h.useCase.execute("u1");

		expect(dump?.reading.reminder?.hourLocal).toBe(6);
	});

	it("includes hidden comments without moderator identities, keeping the importable fields", async () => {
		const h = makeHarness({
			comments: [
				comment({
					_id: "c-hidden",
					hiddenAt: d("2026-07-01T00:00:00Z"),
					hiddenBy: "mod-jane",
					hiddenReason: "moderator",
					verified: true,
					verifiedBy: "mod-jane",
					verifiedAt: d("2026-06-30T00:00:00Z"),
					authorEmailVerified: true,
					likeCount: 4,
					communitySlug: "reformados",
				}),
				// Legacy row with neither tags nor onTitle stored.
				comment({
					_id: "c-legacy",
					tags: undefined as unknown as string[],
					onTitle: undefined as unknown as boolean,
					createdAt: d("2020-01-01T00:00:00Z"),
				}),
			],
		});

		const dump = await h.useCase.execute("u1");

		expect(dump?.comments[0]).toEqual({
			_id: "c-hidden",
			username: "alice",
			verseId: "v1",
			bookReference: "gn 1:1",
			onTitle: false,
			text: "Comentário da Alice",
			tags: ["devocional"],
			communitySlug: "reformados",
			verified: true,
			verifiedAt: "2026-06-30T00:00:00.000Z",
			hiddenAt: "2026-07-01T00:00:00.000Z",
			hiddenReason: "moderator",
			createdAt: "2026-05-01T00:00:00.000Z",
			updatedAt: "2026-05-01T00:00:00.000Z",
		});
		expect(dump?.comments[1]).toMatchObject({
			_id: "c-legacy",
			tags: [],
			onTitle: false,
			communitySlug: null,
			verified: false,
			hiddenAt: null,
			hiddenReason: null,
		});
		expect(JSON.stringify(dump)).not.toContain("mod-jane");
	});

	it("reads owned discussions through the export port, never by scanning every discussion or user", async () => {
		const h = makeHarness({
			discussions: [
				discussion({ _id: "d-old", createdAt: d("2026-01-01T00:00:00Z") }),
				discussion({ _id: "d-new", quoteStart: 0, quoteEnd: 10 }),
				discussion({ _id: "d-bob", username: "bob" }),
			],
		});

		const dump = await h.useCase.execute("u1");

		expect(h.queries.discussionsByUsernames).toHaveBeenCalledWith(["alice"]);
		expect(h.discussion.findAll).not.toHaveBeenCalled();
		expect(h.user.findAll).not.toHaveBeenCalled();
		expect(dump?.ownedDiscussions.map((x) => x._id)).toEqual(["d-new", "d-old"]);
		expect(dump?.ownedDiscussions[0]).toMatchObject({
			question: "O que vocês acham?",
			title: "Sobre a criação",
			quoteStart: 0,
			quoteEnd: 10,
			commentId: "c1",
			createdAt: "2026-05-02T00:00:00.000Z",
		});
		expect(dump?.ownedDiscussions[1]).toMatchObject({ quoteStart: null, quoteEnd: null });
	});

	it("resolves answered discussions in one batched lookup, with nulls for a deleted discussion", async () => {
		const h = makeHarness({
			discussions: [discussion({ _id: "d1", username: "bob" })],
			answers: [
				answer({ _id: "a1", discussionId: "d1" }),
				answer({ _id: "a2", discussionId: "d1", createdAt: d("2026-05-05T00:00:00Z") }),
				answer({ _id: "a3", discussionId: "d-gone", createdAt: d("2026-04-01T00:00:00Z") }),
			],
		});

		const dump = await h.useCase.execute("u1");

		expect(h.discussion.findManyByIds).toHaveBeenCalledTimes(1);
		expect(h.discussion.findManyByIds).toHaveBeenCalledWith(["d1", "d-gone"]);
		expect(dump?.answersAuthored.map((a) => a.answerId)).toEqual(["a2", "a1", "a3"]);
		expect(dump?.answersAuthored[1]).toEqual({
			answerId: "a1",
			discussionId: "d1",
			verseReference: "gn 1:1",
			discussionTitle: "Sobre a criação",
			text: "Minha resposta",
			createdAt: "2026-05-03T00:00:00.000Z",
			updatedAt: "2026-05-03T00:00:00.000Z",
		});
		expect(dump?.answersAuthored[2]).toMatchObject({
			discussionId: "d-gone",
			verseReference: null,
			discussionTitle: null,
		});
	});

	it("splits discussion and answer likes, and keeps a like on a deleted comment with a null reference", async () => {
		const h = makeHarness({
			comments: [comment({ _id: "c-bob", username: "bob", bookReference: "jo 3:16" })],
			discussions: [discussion({ _id: "d1", username: "bob" })],
			commentLikes: [
				{ commentId: "c-bob", createdAt: d("2026-08-01T00:00:00Z") },
				{ commentId: "c-gone", createdAt: d("2026-08-02T00:00:00Z") },
			],
			discussionLikes: [
				{ targetType: "discussion", targetId: "d1", createdAt: d("2026-08-03T00:00:00Z") },
				{ targetType: "answer", targetId: "a-bob", createdAt: d("2026-08-04T00:00:00Z") },
			],
		});

		const dump = await h.useCase.execute("u1");

		expect(dump?.likesGiven.comments).toEqual([
			{ commentId: "c-gone", bookReference: null, likedAt: "2026-08-02T00:00:00.000Z" },
			{ commentId: "c-bob", bookReference: "jo 3:16", likedAt: "2026-08-01T00:00:00.000Z" },
		]);
		expect(dump?.likesGiven.discussions).toEqual([
			{
				discussionId: "d1",
				verseReference: "gn 1:1",
				title: "Sobre a criação",
				likedAt: "2026-08-03T00:00:00.000Z",
			},
		]);
		expect(dump?.likesGiven.answers).toEqual([
			{ answerId: "a-bob", likedAt: "2026-08-04T00:00:00.000Z" },
		]);
		// Liked and reported comments share one lookup.
		expect(h.comment.findManyByIds).toHaveBeenCalledTimes(1);
	});

	it("maps comment reports to the comment, its reference and the report date", async () => {
		const h = makeHarness({
			comments: [comment({ _id: "c-bob", username: "bob", bookReference: "jo 3:16" })],
			commentReports: [{ commentId: "c-bob", createdAt: d("2026-08-05T00:00:00Z") }],
		});

		const dump = await h.useCase.execute("u1");

		expect(dump?.commentReports).toEqual([
			{ commentId: "c-bob", bookReference: "jo 3:16", reportedAt: "2026-08-05T00:00:00.000Z" },
		]);
	});

	it("joins created communities, memberships and follows to slug and name; an orphan keeps only its id", async () => {
		const h = makeHarness();
		const own = await h.community.create({
			slug: "da-alice",
			name: "Da Alice",
			description: "Minha comunidade",
			createdBy: "u1",
		});
		const other = await h.community.create({
			slug: "reformados",
			name: "Reformados",
			description: "",
			createdBy: "u2",
		});
		h.communityMembership._rows.set(`u1::${own._id}`, { status: "approved", role: "moderator" });
		h.communityMembership._rows.set(`u1::${other._id}`, { status: "pending", role: "member" });
		h.communityMembership._rows.set("u1::c-gone", { status: "approved", role: "member" });
		await h.communityFollow.follow("u1", other._id!);

		const dump = await h.useCase.execute("u1");

		expect(dump?.communities.created).toEqual([
			{
				communityId: own._id,
				slug: "da-alice",
				name: "Da Alice",
				description: "Minha comunidade",
				createdAt: own.createdAt?.toISOString(),
			},
		]);
		expect(dump?.communities.memberships).toEqual(
			expect.arrayContaining([
				{ communityId: own._id, slug: "da-alice", name: "Da Alice", status: "approved", role: "moderator", joinedAt: null },
				{ communityId: other._id, slug: "reformados", name: "Reformados", status: "pending", role: "member", joinedAt: null },
				{ communityId: "c-gone", slug: null, name: null, status: "approved", role: "member", joinedAt: null },
			]),
		);
		expect(dump?.communities.memberships).toHaveLength(3);
		expect(dump?.communities.follows).toEqual([
			{
				communityId: other._id,
				slug: "reformados",
				name: "Reformados",
				followedAt: expect.any(String),
			},
		]);
	});

	it("resolves follows in both directions to usernames, dropping missing and leaving accounts", async () => {
		const h = makeHarness({
			users: [
				alice(),
				otherUser("u2", "bob", { displayName: "Bob" }),
				otherUser("u3", "carol"),
				otherUser("u4", "dan", {
					deletion: { requestedAt: d("2026-10-01T00:00:00Z"), communityIds: [], discussionIds: [] },
				}),
			],
			follows: [
				{ followerId: "u1", followingId: "u2", createdAt: d("2026-03-01T00:00:00Z") },
				{ followerId: "u1", followingId: "u-gone", createdAt: d("2026-03-02T00:00:00Z") },
				{ followerId: "u1", followingId: "u4", createdAt: d("2026-03-03T00:00:00Z") },
				{ followerId: "u2", followingId: "u1", createdAt: d("2026-03-04T00:00:00Z") },
				{ followerId: "u3", followingId: "u1", createdAt: d("2026-03-05T00:00:00Z") },
			],
		});

		const dump = await h.useCase.execute("u1");

		expect(dump?.social.following).toEqual([
			{ username: "bob", displayName: "Bob", since: "2026-03-01T00:00:00.000Z" },
		]);
		expect(dump?.social.followers).toEqual([
			{ username: "carol", displayName: null, since: "2026-03-05T00:00:00.000Z" },
			{ username: "bob", displayName: "Bob", since: "2026-03-04T00:00:00.000Z" },
		]);
		expect(h.user.findManyByIds).toHaveBeenCalledWith(["u2", "u-gone", "u4", "u3"]);
	});

	it("sorts reading history and active days, and exports the reminder without its keys", async () => {
		const h = makeHarness({
			chaptersRead: [
				{ userId: "u1", abbrev: "gn", chapter: 2, readAt: d("2026-02-02T00:00:00Z") },
				{ userId: "u1", abbrev: "gn", chapter: 1, readAt: d("2026-02-01T00:00:00Z") },
				{ userId: "u1", abbrev: "ex", chapter: 1, readAt: d("2026-02-02T00:00:00Z") },
			],
			activeDays: ["2026-02-03", "2026-02-01", "2026-02-02", "2026-02-01"],
			reminders: [reminder()],
		});

		const dump = await h.useCase.execute("u1");

		expect(dump?.reading.chaptersRead).toEqual([
			{ book: "gn", chapter: 1, readAt: "2026-02-01T00:00:00.000Z" },
			{ book: "ex", chapter: 1, readAt: "2026-02-02T00:00:00.000Z" },
			{ book: "gn", chapter: 2, readAt: "2026-02-02T00:00:00.000Z" },
		]);
		expect(dump?.reading.activeDays).toEqual(["2026-02-01", "2026-02-02", "2026-02-03"]);
		expect(dump?.reading.reminder).toEqual({
			enabled: true,
			hourLocal: 7.5,
			tz: "America/Sao_Paulo",
			lastSentAt: "2026-10-15T10:30:00.000Z",
			createdAt: "2026-06-01T00:00:00.000Z",
			updatedAt: "2026-06-02T00:00:00.000Z",
		});
	});

	it("reduces push subscriptions to the service origin, the user agent and the date", async () => {
		const h = makeHarness({
			pushSubscriptions: [
				push(),
				push({
					_id: "p2",
					endpoint: "not a url",
					userAgent: undefined,
					createdAt: d("2026-05-01T00:00:00Z"),
				}),
			],
		});

		const dump = await h.useCase.execute("u1");

		expect(dump?.pushSubscriptions).toEqual([
			{
				service: "https://fcm.googleapis.com",
				userAgent: "Mozilla/5.0 (Android)",
				createdAt: "2026-06-01T00:00:00.000Z",
			},
			{ service: null, userAgent: null, createdAt: "2026-05-01T00:00:00.000Z" },
		]);
	});

	it("leaks no credential, internal field or moderator identity anywhere in a full export", async () => {
		const h = makeHarness({
			users: [
				alice({ renameFrom: "alice-old", disabledBy: "mod-jane" }),
				otherUser("u2", "bob"),
			],
			comments: [
				comment({ hiddenAt: NOW, hiddenBy: "mod-jane", verifiedBy: "mod-jane", authorEmailVerified: true }),
				comment({ _id: "c-bob", username: "bob" }),
			],
			discussions: [discussion(), discussion({ _id: "d-bob", username: "bob" })],
			answers: [answer({ discussionId: "d-bob" })],
			notifications: [notification()],
			pushSubscriptions: [push()],
			commentLikes: [{ commentId: "c-bob", createdAt: NOW }],
			commentReports: [{ commentId: "c-bob", createdAt: NOW }],
			discussionLikes: [{ targetType: "discussion", targetId: "d-bob", createdAt: NOW }],
			follows: [
				{ followerId: "u1", followingId: "u2", createdAt: NOW },
				{ followerId: "u2", followingId: "u1", createdAt: NOW },
			],
			chaptersRead: [{ userId: "u1", abbrev: "gn", chapter: 1, readAt: NOW }],
			activeDays: ["2026-10-16"],
			reminders: [reminder()],
		});

		const dump = await h.useCase.execute("u1");
		const text = JSON.stringify(dump);
		const keys = allKeys(dump);

		for (const key of FORBIDDEN_KEYS) expect(keys.has(key), key).toBe(false);
		for (const secret of ["$2b$12$SECRET", "$2b$12$OTHER", "P256-SECRET", "AUTH-SECRET", "DEVICE-SECRET", "mod-jane"]) {
			expect(text, secret).not.toContain(secret);
		}
	});

	it("lists what is deliberately left out, including the password and the tokens", async () => {
		const h = makeHarness();

		const dump = await h.useCase.execute("u1");

		expect(dump?.notIncluded.length).toBeGreaterThan(0);
		const data = dump?.notIncluded.map((e) => `${e.data} ${e.reason}`).join("\n") ?? "";
		expect(data).toMatch(/senha/i);
		expect(data).toMatch(/tokens/i);
		expect(data).toMatch(/navegador/i);
		for (const e of dump?.notIncluded ?? []) {
			expect(e.data.length).toBeGreaterThan(0);
			expect(e.reason.length).toBeGreaterThan(0);
		}
	});

	it("doesn't list server-side data as browser-only: completed tutorials are in the file", async () => {
		const h = makeHarness();

		const dump = await h.useCase.execute("u1");

		const browserOnly = dump?.notIncluded.find((e) => e.data === "Dados guardados só no navegador");
		expect(browserOnly?.reason).toMatch(/tutoriais concluídos na sua conta/);
		// The reading plan is the same for everyone (derived from the date).
		expect(browserOnly?.reason).not.toMatch(/plano de leitura/i);
		expect(dump?.profile.tutorialsCompleted).toEqual(["chapter-v1"]);
	});

	it("exports an empty account with every section empty and skips the lookups", async () => {
		const h = makeHarness();

		const dump = await h.useCase.execute("u1");

		expect(dump).toMatchObject({
			comments: [],
			ownedDiscussions: [],
			answersAuthored: [],
			notifications: [],
			likesGiven: { comments: [], discussions: [], answers: [] },
			commentReports: [],
			communities: { created: [], memberships: [], follows: [] },
			social: { following: [], followers: [] },
			reading: { chaptersRead: [], activeDays: [], reminder: null },
			pushSubscriptions: [],
		});
		expect(h.discussion.findManyByIds).not.toHaveBeenCalled();
		expect(h.comment.findManyByIds).not.toHaveBeenCalled();
		expect(h.user.findManyByIds).not.toHaveBeenCalled();
	});
});
