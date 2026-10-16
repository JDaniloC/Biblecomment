import { z } from "zod";

export const RegisterUserSchema = z.object({
	email: z.string().email(),
	/**
	 * Free-form display name (1-80 chars) — what shows on cards and profile.
	 * Allowed to contain spaces and accents. Backend derives a URL-safe slug
	 * from this when `username` is absent.
	 */
	displayName: z.string().min(1).max(80),
	/**
	 * Optional explicit slug. When provided, must already match the canonical
	 * `[a-z0-9_-]{2,40}` form — server does not silently rewrite caller input.
	 */
	username: z
		.string()
		.regex(/^[a-z0-9_-]{2,40}$/)
		.optional(),
	password: z.string().min(6).max(200),
	// LGPD: explicit consent to Terms + Privacy Policy is mandatory at signup.
	// Validated at the API boundary; the value is not persisted (the act of
	// creating the account is itself the record of consent at this timestamp).
	acceptedTerms: z.literal(true, {
		message:
			"É necessário aceitar os Termos de Uso e a Política de Privacidade.",
	}),
});
export type RegisterUserInput = z.infer<typeof RegisterUserSchema>;

export const ChangePasswordSchema = z
	.object({
		currentPassword: z.string().min(1).max(200),
		newPassword: z.string().min(6).max(200),
	})
	.refine((v) => v.currentPassword !== v.newPassword, {
		message: "A nova senha deve ser diferente da atual",
		path: ["newPassword"],
	});

export const UpdateProfileSchema = z
	.object({
		state: z.string().max(100).optional(),
		belief: z.string().max(100).optional(),
		/** Free-form name shown publicly. 1–80 chars, may include spaces/accents. */
		displayName: z.string().min(1).max(80).optional(),
		/** Opt-in: expose `belief` on the public profile page. */
		showBelief: z.boolean().optional(),
	})
	.refine(
		(v) =>
			v.state !== undefined ||
			v.belief !== undefined ||
			v.displayName !== undefined ||
			v.showBelief !== undefined,
		{ message: "state, belief, displayName ou showBelief é obrigatório" },
	);
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export const UpdateUsernameSchema = z.object({
	username: z.string().regex(/^[a-z0-9_-]{2,40}$/, {
		message:
			"Use apenas letras minúsculas, números, hífen ou sublinhado (2-40).",
	}),
});

export const DeleteUserSchema = z.object({
	email: z.string().email(),
});

export const SetModeratorSchema = z.object({
	email: z.string().email(),
	moderator: z.boolean(),
});

export const SetUserDisabledSchema = z.object({
	email: z.string().email(),
	disabled: z.boolean(),
});

export const CreateVerseSchema = z.object({
	abbrev: z.string().min(1).max(20),
	chapter: z.number().int().positive().max(200),
	verseNumber: z.number().int().positive().max(200),
	text: z.string().min(1).max(5000),
	reference: z.string().max(200).optional(),
});

export const UpdateVerseSchema = z
	.object({
		text: z.string().min(1).max(5000).optional(),
		reference: z.string().max(200).optional(),
	})
	.refine((v) => v.text !== undefined || v.reference !== undefined, {
		message: "text ou reference é obrigatório",
	});

// Comment limits, shared by creation, editing, self-service import and
// backup restore so they can't drift apart.
export const COMMENT_TEXT_MAX = 5000;
export const COMMENT_TAGS_MAX = 20;
export const COMMENT_TAG_MAX_LENGTH = 50;
/** Rows accepted by one self-service comment import (POST /api/users/me/import). */
export const IMPORT_COMMENTS_MAX = 5000;

export const CreateCommentSchema = z.object({
	text: z.string().min(1).max(COMMENT_TEXT_MAX),
	tags: z
		.array(z.string().max(COMMENT_TAG_MAX_LENGTH))
		.max(COMMENT_TAGS_MAX)
		.default([]),
	on_title: z.boolean().optional(),
	onTitle: z.boolean().optional(),
	/**
	 * Optional slug of the community the post is being made in. Reuses the
	 * community slug pattern. Server-side the CreateCommentUseCase verifies
	 * the author belongs to the community before persisting.
	 */
	communitySlug: z
		.string()
		.regex(/^[a-z0-9-]{2,40}$/)
		.optional(),
});

export const UpdateCommentSchema = z.object({
	text: z.string().min(1).max(COMMENT_TEXT_MAX).optional(),
	tags: z
		.array(z.string().max(COMMENT_TAG_MAX_LENGTH))
		.max(COMMENT_TAGS_MAX)
		.optional(),
	action: z.enum(["like", "report", "hide", "unhide"]).optional(),
});

/**
 * One row of a self-service comment import. Validated row by row in
 * ImportUserCommentsUseCase, so a bad row counts as `failed` instead of
 * rejecting the file. Text and reference are trimmed before the max is
 * checked, so the limit applies to what gets stored. Extra keys from the
 * export file (_id, verseId, username, createdAt, ...) are stripped.
 */
export const ImportCommentItemSchema = z.object({
	bookReference: z.string().trim().min(1).max(200),
	text: z.string().trim().min(1).max(COMMENT_TEXT_MAX),
	tags: z
		.array(z.string().max(COMMENT_TAG_MAX_LENGTH))
		.max(COMMENT_TAGS_MAX)
		.default([]),
	onTitle: z.boolean().optional(),
});
export type ImportCommentItem = z.infer<typeof ImportCommentItemSchema>;

/**
 * Self-service import payload: only the shape and the row count are checked
 * here (each row goes through ImportCommentItemSchema on its own). The rest
 * of an export file (profile, discussions, ...) is ignored.
 */
export const ImportCommentsPayloadSchema = z.object({
	comments: z.array(z.unknown()).max(IMPORT_COMMENTS_MAX),
});

// A discussion is always anchored to a comment. The client sends only the
// commentId, a one-line title, the body, and optional excerpt offsets — the
// comment text snapshot and verse reference are derived server-side from the
// comment (so the original comment can't be rewritten/deturpated).
export const CreateDiscussionSchema = z.object({
	commentId: z.string().min(1),
	title: z.string().min(1).max(140),
	body: z.string().min(1).max(1000),
	quoteStart: z.number().int().min(0).optional(),
	quoteEnd: z.number().int().min(0).optional(),
});

// Author/moderator edit of a discussion. Only title + body are editable —
// the linked comment snapshot and quote stay immutable (anti-deturpation).
export const UpdateDiscussionSchema = z.object({
	title: z.string().min(1).max(140),
	body: z.string().min(1).max(1000),
});

export const AddAnswerSchema = z.object({
	text: z.string().min(1).max(5000),
});

export const UpdateAnswerSchema = z.object({
	text: z.string().min(1).max(5000),
});

// ── Admin backup restore (POST /api/backup/*) ──────────────────────────
// Each endpoint takes either the bare array its GET export returns or the
// `{ <key>: [...] }` wrapper, and always hands the route `{ <key>: [...] }`.

/**
 * An optional field of a backup row. JSON `null` (legacy documents) counts
 * as absent. That matters most for dates: coercing `null` would yield the
 * 1970 epoch and, e.g., silently disable a restored account.
 */
function backupOptional<T extends z.ZodType>(schema: T) {
	return schema.nullish().transform((v) => v ?? undefined);
}

const backupDate = () => backupOptional(z.coerce.date());
/** Original document id, kept as a string; validated where it is used. */
const backupId = () => backupOptional(z.string().max(64));

/** Rows accepted by one POST /api/backup/users (each costs DB round trips). */
export const BACKUP_USERS_MAX = 500;

/**
 * Shape only: email validity, username rules, tombstones and duplicates are
 * checked row by row in the restore use case, so one bad row is skipped
 * instead of failing the whole batch with a 400. A non-null `deletion`
 * marks an account that was mid-deletion when exported.
 */
const BackupUserItemSchema = z.object({
	_id: backupId(),
	email: z.string().max(320),
	username: z.string().max(100),
	displayName: backupOptional(z.string().max(80)),
	state: backupOptional(z.string().max(100)),
	belief: backupOptional(z.string().max(100)),
	showBelief: backupOptional(z.boolean()),
	badges: backupOptional(z.array(z.string().max(100)).max(200)),
	tutorialsCompleted: backupOptional(z.array(z.string().max(100)).max(200)),
	emailVerifiedAt: backupDate(),
	disabledAt: backupDate(),
	disabledBy: backupOptional(z.string().max(100)),
	deletion: backupOptional(z.unknown()),
	createdAt: backupDate(),
});
export type BackupUserItem = z.infer<typeof BackupUserItemSchema>;
/** Checked per row by the restore (after trim + lowercase), not by the batch. */
export const BackupUserEmailSchema = z.string().email();

const BackupUsersList = z.array(BackupUserItemSchema).max(BACKUP_USERS_MAX);
export const BackupUsersSchema = z
	.union([BackupUsersList, z.object({ users: BackupUsersList.default([]) })])
	.transform((v) => (Array.isArray(v) ? { users: v } : v));

const BackupCommentItemSchema = z.object({
	_id: backupId(),
	verseId: z.string().min(1),
	username: z.string().min(1).max(40),
	onTitle: z.boolean(),
	bookReference: z.string().min(1).max(200),
	text: z.string().min(1).max(COMMENT_TEXT_MAX),
	tags: z.array(z.string().max(COMMENT_TAG_MAX_LENGTH)).default([]),
	communitySlug: backupOptional(z.string().max(40)),
	hiddenAt: backupDate(),
	hiddenBy: backupOptional(z.string().max(100)),
	hiddenReason: backupOptional(z.enum(["moderator", "account-disabled"])),
	verified: backupOptional(z.boolean()),
	verifiedBy: backupOptional(z.string().max(100)),
	verifiedAt: backupDate(),
	createdAt: backupDate(),
});

const BackupCommentsList = z.array(BackupCommentItemSchema);
export const BackupCommentsSchema = z
	.union([
		BackupCommentsList,
		z.object({ comments: BackupCommentsList.default([]) }),
	])
	.transform((v) => (Array.isArray(v) ? { comments: v } : v));
export type BackupCommentItem = z.infer<typeof BackupCommentItemSchema>;

// Answers were extracted into a separate collection (Phase 9.3). The
// import path no longer accepts inline answers — restoring those is a
// follow-up if backups ever ship.
const BackupDiscussionItemSchema = z.object({
	_id: backupId(),
	bookAbbrev: z.string().min(1).max(20),
	commentId: z.string().optional(),
	username: z.string().min(1).max(40),
	verseReference: z.string().min(1).max(200),
	verseText: z.string().max(5000).default(""),
	commentText: z.string().max(5000).default(""),
	title: backupOptional(z.string().max(140)),
	quoteStart: backupOptional(z.number().int().min(0)),
	quoteEnd: backupOptional(z.number().int().min(0)),
	question: z.string().min(1).max(2000),
	createdAt: backupDate(),
});

const BackupDiscussionsList = z.array(BackupDiscussionItemSchema);
export const BackupDiscussionsSchema = z
	.union([
		BackupDiscussionsList,
		z.object({ discussions: BackupDiscussionsList.default([]) }),
	])
	.transform((v) => (Array.isArray(v) ? { discussions: v } : v));
export type BackupDiscussionItem = z.infer<typeof BackupDiscussionItemSchema>;

/** Tombstones accepted by one POST /api/backup/erasures (tiny rows). */
export const BACKUP_ERASURES_MAX = 10_000;

/** A deleted account's tombstone, as GET /api/backup/erasures exports it. */
const BackupErasureItemSchema = z.object({
	userId: z.string().regex(/^[0-9a-f]{24}$/i),
	erasedAt: z.coerce.date(),
});

const BackupErasuresList = z
	.array(BackupErasureItemSchema)
	.max(BACKUP_ERASURES_MAX);
export const BackupErasuresSchema = z
	.union([
		BackupErasuresList,
		z.object({ erasures: BackupErasuresList.default([]) }),
	])
	.transform((v) => (Array.isArray(v) ? { erasures: v } : v));

export const CreateCommunitySchema = z.object({
	slug: z.string().regex(/^[a-z0-9-]{2,40}$/, {
		message: "Use letras minúsculas, números ou hífen (2-40).",
	}),
	name: z.string().min(2).max(60),
	description: z.string().max(500).optional().default(""),
});
export type CreateCommunityBody = z.infer<typeof CreateCommunitySchema>;

// Web Push: the browser PushSubscription.toJSON() shape.
export const PushSubscribeSchema = z.object({
	endpoint: z.string().url().max(2000),
	keys: z.object({
		p256dh: z.string().min(1).max(255),
		auth: z.string().min(1).max(255),
	}),
});
export type PushSubscribeBody = z.infer<typeof PushSubscribeSchema>;

export const PushUnsubscribeSchema = z.object({
	endpoint: z.string().url().max(2000),
});
export type PushUnsubscribeBody = z.infer<typeof PushUnsubscribeSchema>;
