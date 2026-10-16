import { describe, it, expect } from "vitest";
import {
	BACKUP_ERASURES_MAX,
	BACKUP_USERS_MAX,
	BackupCommentsSchema,
	BackupDiscussionsSchema,
	BackupErasuresSchema,
	BackupUsersSchema,
	COMMENT_TAG_MAX_LENGTH,
	COMMENT_TAGS_MAX,
	COMMENT_TEXT_MAX,
	CreateCommentSchema,
	CreateDiscussionSchema,
	IMPORT_COMMENTS_MAX,
	ImportCommentItemSchema,
	ImportCommentsPayloadSchema,
	UpdateCommentSchema,
} from "./schemas";

const valid = {
	commentId: "c1",
	title: "Título",
	body: "Corpo da discussão",
};

describe("CreateDiscussionSchema", () => {
	it("accepts a valid payload with optional quote offsets", () => {
		const result = CreateDiscussionSchema.safeParse({
			...valid,
			quoteStart: 0,
			quoteEnd: 5,
		});
		expect(result.success).toBe(true);
	});

	it("accepts a valid payload without quote offsets", () => {
		const result = CreateDiscussionSchema.safeParse(valid);
		expect(result.success).toBe(true);
	});

	it("rejects a payload without commentId", () => {
		const result = CreateDiscussionSchema.safeParse({ title: "t", body: "b" });
		expect(result.success).toBe(false);
	});

	it("rejects an empty title", () => {
		const result = CreateDiscussionSchema.safeParse({ ...valid, title: "" });
		expect(result.success).toBe(false);
	});

	it("rejects a body longer than 1000 characters", () => {
		const result = CreateDiscussionSchema.safeParse({
			...valid,
			body: "a".repeat(1001),
		});
		expect(result.success).toBe(false);
	});
});

const tags = (n: number) => Array.from({ length: n }, (_, i) => `tag-${i}`);

describe("comment limits", () => {
	it("keeps the limits comment creation always had", () => {
		expect(COMMENT_TEXT_MAX).toBe(5000);
		expect(COMMENT_TAGS_MAX).toBe(20);
		expect(COMMENT_TAG_MAX_LENGTH).toBe(50);
		expect(IMPORT_COMMENTS_MAX).toBe(5000);
	});

	it.each([
		["CreateCommentSchema", CreateCommentSchema],
		["UpdateCommentSchema", UpdateCommentSchema],
	])("%s accepts text and tags at the limits", (_name, schema) => {
		const result = schema.safeParse({
			text: "a".repeat(5000),
			tags: [...tags(19), "t".repeat(50)],
		});
		expect(result.success).toBe(true);
	});

	it.each([
		["CreateCommentSchema", CreateCommentSchema],
		["UpdateCommentSchema", UpdateCommentSchema],
	])("%s still rejects 5001 characters, 21 tags or a 51-character tag", (_name, schema) => {
		expect(schema.safeParse({ text: "a".repeat(5001) }).success).toBe(false);
		expect(schema.safeParse({ text: "ok", tags: tags(21) }).success).toBe(false);
		expect(schema.safeParse({ text: "ok", tags: ["t".repeat(51)] }).success).toBe(false);
	});
});

describe("ImportCommentsPayloadSchema", () => {
	it(`accepts up to ${IMPORT_COMMENTS_MAX} rows and rejects one more`, () => {
		const rows = (n: number) => Array.from({ length: n }, () => ({}));

		expect(ImportCommentsPayloadSchema.safeParse({ comments: rows(5000) }).success).toBe(true);
		expect(ImportCommentsPayloadSchema.safeParse({ comments: rows(5001) }).success).toBe(false);
	});

	it("checks only the shape: rows are validated one by one later", () => {
		const result = ImportCommentsPayloadSchema.safeParse({
			comments: [1, "x", null, { text: "" }],
		});
		expect(result.success).toBe(true);
	});

	it("accepts a v2 export file and keeps only its comments", () => {
		const comment = {
			_id: "64b0000000000000000000aa",
			verseId: "64b0000000000000000000bb",
			username: "joão",
			bookReference: "Gn 1:1",
			text: "Comentário com acentuação: fé, oração",
			tags: ["fé"],
			onTitle: false,
			createdAt: "2026-01-01T00:00:00.000Z",
		};
		const result = ImportCommentsPayloadSchema.safeParse({
			exportVersion: 2,
			exportedAt: "2026-10-01T00:00:00.000Z",
			profile: { username: "joão", email: "joao@example.com" },
			comments: [comment],
			ownedDiscussions: [],
			notIncluded: [],
		});

		expect(result.success).toBe(true);
		expect(result.data).toEqual({ comments: [comment] });
	});

	it.each([
		["no comments key", { profile: {} }],
		["comments that aren't an array", { comments: { text: "x" } }],
		["a bare array", [{ text: "x" }]],
	])("rejects %s", (_label, body) => {
		expect(ImportCommentsPayloadSchema.safeParse(body).success).toBe(false);
	});
});

describe("ImportCommentItemSchema", () => {
	const row = { bookReference: "Gn 1:1", text: "Comentário" };

	it("accepts a minimal row, defaulting tags, and strips the export's other keys", () => {
		const result = ImportCommentItemSchema.safeParse({
			...row,
			_id: "64b0000000000000000000aa",
			verseId: "v1",
			username: "someone-else",
			createdAt: "2026-01-01",
		});

		expect(result.success).toBe(true);
		expect(result.data).toEqual({ bookReference: "Gn 1:1", text: "Comentário", tags: [] });
	});

	it("measures the text limit after trimming, and returns the trimmed text", () => {
		const padded = ImportCommentItemSchema.safeParse({
			...row,
			text: `   ${"a".repeat(5000)}\n  `,
		});
		expect(padded.success).toBe(true);
		expect(padded.data?.text).toBe("a".repeat(5000));

		expect(ImportCommentItemSchema.safeParse({ ...row, text: "a".repeat(5001) }).success).toBe(
			false,
		);
	});

	it("rejects text that is empty after trimming", () => {
		expect(ImportCommentItemSchema.safeParse({ ...row, text: " \n\t " }).success).toBe(false);
	});

	it("trims the reference and bounds it to 200 characters", () => {
		expect(ImportCommentItemSchema.safeParse({ ...row, bookReference: "  Gn 1:1 " }).data).toMatchObject(
			{ bookReference: "Gn 1:1" },
		);
		expect(ImportCommentItemSchema.safeParse({ ...row, bookReference: "   " }).success).toBe(false);
		expect(
			ImportCommentItemSchema.safeParse({ ...row, bookReference: "G".repeat(201) }).success,
		).toBe(false);
	});

	it("applies the tag limits of comment creation", () => {
		expect(ImportCommentItemSchema.safeParse({ ...row, tags: tags(20) }).success).toBe(true);
		expect(ImportCommentItemSchema.safeParse({ ...row, tags: tags(21) }).success).toBe(false);
		expect(ImportCommentItemSchema.safeParse({ ...row, tags: ["t".repeat(50)] }).success).toBe(true);
		expect(ImportCommentItemSchema.safeParse({ ...row, tags: ["t".repeat(51)] }).success).toBe(false);
	});

	it("rejects rows of the wrong type", () => {
		expect(ImportCommentItemSchema.safeParse({ ...row, onTitle: "yes" }).success).toBe(false);
		expect(ImportCommentItemSchema.safeParse({ ...row, text: 42 }).success).toBe(false);
		expect(ImportCommentItemSchema.safeParse(null).success).toBe(false);
	});
});

describe("BackupUsersSchema", () => {
	const user = { email: "alice@example.com", username: "alice" };

	it("takes the GET's bare array or the { users } wrapper, and always yields the wrapper", () => {
		expect(BackupUsersSchema.parse([user])).toEqual({ users: [user] });
		expect(BackupUsersSchema.parse({ users: [user] })).toEqual({ users: [user] });
		expect(BackupUsersSchema.parse({})).toEqual({ users: [] });
	});

	it(`accepts up to ${BACKUP_USERS_MAX} rows and rejects one more`, () => {
		const rows = (n: number) => Array.from({ length: n }, () => user);

		expect(BackupUsersSchema.safeParse(rows(500)).success).toBe(true);
		expect(BackupUsersSchema.safeParse(rows(501)).success).toBe(false);
		expect(BackupUsersSchema.safeParse({ users: rows(501) }).success).toBe(false);
	});

	it("treats JSON null as absent instead of coercing it (no 1970 dates)", () => {
		const [row] = BackupUsersSchema.parse([
			{
				...user,
				_id: null,
				displayName: null,
				showBelief: null,
				badges: null,
				emailVerifiedAt: null,
				disabledAt: null,
				disabledBy: null,
				deletion: null,
				createdAt: null,
			},
		]).users;

		for (const key of [
			"_id",
			"displayName",
			"showBelief",
			"badges",
			"emailVerifiedAt",
			"disabledAt",
			"disabledBy",
			"deletion",
			"createdAt",
		] as const) {
			expect(row[key]).toBeUndefined();
		}
	});

	it("coerces exported dates and keeps a non-null deletion marker", () => {
		const [row] = BackupUsersSchema.parse([
			{
				...user,
				_id: "64b000000000000000000001",
				createdAt: "2024-01-02T03:04:05.000Z",
				disabledAt: "2026-02-02T00:00:00.000Z",
				deletion: { requestedAt: "2026-09-01" },
			},
		]).users;

		expect(row._id).toBe("64b000000000000000000001");
		expect(row.createdAt).toEqual(new Date("2024-01-02T03:04:05.000Z"));
		expect(row.disabledAt).toEqual(new Date("2026-02-02T00:00:00.000Z"));
		expect(row.deletion).toEqual({ requestedAt: "2026-09-01" });
	});

	it("checks only the shape: a bad e-mail is left to the per-row check", () => {
		expect(BackupUsersSchema.safeParse([{ email: "not-an-email", username: "x" }]).success).toBe(
			true,
		);
	});

	it("drops fields a restore must never take from the file", () => {
		const [row] = BackupUsersSchema.parse([
			{ ...user, password: "$2b$12$x", moderator: true, sessionVersion: 7, pendingEmail: "p@x.com" },
		]).users;

		expect(row).not.toHaveProperty("password");
		expect(row).not.toHaveProperty("moderator");
		expect(row).not.toHaveProperty("sessionVersion");
		expect(row).not.toHaveProperty("pendingEmail");
	});

	it("rejects rows without an e-mail or username", () => {
		expect(BackupUsersSchema.safeParse([{ username: "alice" }]).success).toBe(false);
		expect(BackupUsersSchema.safeParse([{ email: "a@example.com" }]).success).toBe(false);
	});
});

describe("BackupCommentsSchema", () => {
	const comment = {
		verseId: "64b0000000000000000000bb",
		username: "alice",
		onTitle: false,
		bookReference: "Gn 1:1",
		text: "Comentário",
	};

	it("takes the bare array or the { comments } wrapper, and defaults tags", () => {
		const expected = { comments: [{ ...comment, tags: [] }] };

		expect(BackupCommentsSchema.parse([comment])).toEqual(expected);
		expect(BackupCommentsSchema.parse({ comments: [comment] })).toEqual(expected);
		expect(BackupCommentsSchema.parse({})).toEqual({ comments: [] });
	});

	it("reuses the comment limits", () => {
		expect(BackupCommentsSchema.safeParse([{ ...comment, text: "a".repeat(5000) }]).success).toBe(
			true,
		);
		expect(BackupCommentsSchema.safeParse([{ ...comment, text: "a".repeat(5001) }]).success).toBe(
			false,
		);
		expect(BackupCommentsSchema.safeParse([{ ...comment, tags: ["t".repeat(51)] }]).success).toBe(
			false,
		);
	});

	it("keeps the original id, dates and moderation state, with null as absent", () => {
		const [row] = BackupCommentsSchema.parse([
			{
				...comment,
				_id: "64b0000000000000000000aa",
				createdAt: "2023-05-05T00:00:00.000Z",
				communitySlug: null,
				hiddenAt: null,
				hiddenBy: null,
				hiddenReason: null,
				verified: true,
				verifiedBy: "Moderador",
				verifiedAt: "2023-05-06T00:00:00.000Z",
			},
		]).comments;

		expect(row).toMatchObject({
			_id: "64b0000000000000000000aa",
			createdAt: new Date("2023-05-05T00:00:00.000Z"),
			verified: true,
			verifiedBy: "Moderador",
			verifiedAt: new Date("2023-05-06T00:00:00.000Z"),
		});
		expect(row.communitySlug).toBeUndefined();
		expect(row.hiddenAt).toBeUndefined();
		expect(row.hiddenBy).toBeUndefined();
		expect(row.hiddenReason).toBeUndefined();
	});

	it("rejects an unknown hidden reason", () => {
		expect(
			BackupCommentsSchema.safeParse([{ ...comment, hiddenReason: "spam" }]).success,
		).toBe(false);
	});
});

describe("BackupDiscussionsSchema", () => {
	const discussion = {
		bookAbbrev: "gn",
		username: "alice",
		verseReference: "Gn 1:1",
		question: "Por quê?",
	};

	it("takes the bare array or the { discussions } wrapper, defaulting the snapshots", () => {
		const expected = { discussions: [{ ...discussion, verseText: "", commentText: "" }] };

		expect(BackupDiscussionsSchema.parse([discussion])).toEqual(expected);
		expect(BackupDiscussionsSchema.parse({ discussions: [discussion] })).toEqual(expected);
		expect(BackupDiscussionsSchema.parse({})).toEqual({ discussions: [] });
	});

	it("keeps the title and excerpt, with null as absent", () => {
		const [kept] = BackupDiscussionsSchema.parse([
			{
				...discussion,
				_id: "64b0000000000000000000d1",
				commentId: "64b0000000000000000000c1",
				title: "Título",
				quoteStart: 0,
				quoteEnd: 4,
				createdAt: "2023-06-06T00:00:00.000Z",
			},
		]).discussions;
		expect(kept).toMatchObject({
			_id: "64b0000000000000000000d1",
			commentId: "64b0000000000000000000c1",
			title: "Título",
			quoteStart: 0,
			quoteEnd: 4,
			createdAt: new Date("2023-06-06T00:00:00.000Z"),
		});

		const [legacy] = BackupDiscussionsSchema.parse([
			{ ...discussion, title: null, quoteStart: null, quoteEnd: null, createdAt: null },
		]).discussions;
		expect(legacy.title).toBeUndefined();
		expect(legacy.quoteStart).toBeUndefined();
		expect(legacy.quoteEnd).toBeUndefined();
		expect(legacy.createdAt).toBeUndefined();
	});

	it("rejects a negative excerpt offset or an over-long title", () => {
		expect(BackupDiscussionsSchema.safeParse([{ ...discussion, quoteStart: -1 }]).success).toBe(
			false,
		);
		expect(
			BackupDiscussionsSchema.safeParse([{ ...discussion, title: "t".repeat(141) }]).success,
		).toBe(false);
	});
});

describe("BackupErasuresSchema", () => {
	const erasure = { userId: "64b000000000000000000001", erasedAt: "2026-01-01T00:00:00.000Z" };
	const parsed = { userId: erasure.userId, erasedAt: new Date(erasure.erasedAt) };

	it("takes the bare array or the { erasures } wrapper, coercing the date", () => {
		expect(BackupErasuresSchema.parse([erasure])).toEqual({ erasures: [parsed] });
		expect(BackupErasuresSchema.parse({ erasures: [erasure] })).toEqual({ erasures: [parsed] });
		expect(BackupErasuresSchema.parse({})).toEqual({ erasures: [] });
	});

	it("accepts only ObjectId user ids", () => {
		expect(BackupErasuresSchema.safeParse([{ ...erasure, userId: "u1" }]).success).toBe(false);
		expect(
			BackupErasuresSchema.safeParse([{ ...erasure, userId: "64B000000000000000000001" }]).success,
		).toBe(true);
	});

	it("rejects a missing or invalid date", () => {
		expect(BackupErasuresSchema.safeParse([{ userId: erasure.userId }]).success).toBe(false);
		expect(
			BackupErasuresSchema.safeParse([{ ...erasure, erasedAt: "not a date" }]).success,
		).toBe(false);
	});

	it(`accepts up to ${BACKUP_ERASURES_MAX} tombstones and rejects one more`, () => {
		const rows = (n: number) => Array.from({ length: n }, () => erasure);

		expect(BackupErasuresSchema.safeParse(rows(10_000)).success).toBe(true);
		expect(BackupErasuresSchema.safeParse(rows(10_001)).success).toBe(false);
	});
});
