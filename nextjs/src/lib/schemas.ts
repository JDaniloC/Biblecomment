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

export const CreateCommentSchema = z.object({
	text: z.string().min(1).max(5000),
	tags: z.array(z.string().max(50)).max(20).default([]),
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
	text: z.string().min(1).max(5000).optional(),
	tags: z.array(z.string().max(50)).max(20).optional(),
	action: z.enum(["like", "report", "hide", "unhide"]).optional(),
});

export const CreateDiscussionSchema = z.object({
	verseReference: z.string().min(1).max(200),
	verseText: z.string().max(5000).optional().default(""),
	commentText: z.string().max(5000).optional().default(""),
	question: z.string().min(1).max(2000),
	commentId: z.string().optional(),
});

export const AddAnswerSchema = z.object({
	text: z.string().min(1).max(5000),
});

export const UpdateAnswerSchema = z.object({
	text: z.string().min(1).max(5000),
});

const BackupUserItemSchema = z.object({
	email: z.string().email(),
	username: z.string().min(2).max(40),
	state: z.string().max(100).optional(),
	belief: z.string().max(100).optional(),
});

export const BackupUsersSchema = z.object({
	users: z.array(BackupUserItemSchema).default([]),
});

const BackupCommentItemSchema = z.object({
	verseId: z.string().min(1),
	username: z.string().min(1).max(40),
	onTitle: z.boolean(),
	bookReference: z.string().min(1).max(200),
	text: z.string().min(1).max(5000),
	tags: z.array(z.string().max(50)).default([]),
});

export const BackupCommentsSchema = z.object({
	comments: z.array(BackupCommentItemSchema).default([]),
});
export type BackupCommentItem = z.infer<typeof BackupCommentItemSchema>;

// Answers were extracted into a separate collection (Phase 9.3). The
// import path no longer accepts inline answers — restoring those is a
// follow-up if backups ever ship.
const BackupDiscussionItemSchema = z.object({
	bookAbbrev: z.string().min(1).max(20),
	commentId: z.string().optional(),
	username: z.string().min(1).max(40),
	verseReference: z.string().min(1).max(200),
	verseText: z.string().max(5000).default(""),
	commentText: z.string().max(5000).default(""),
	question: z.string().min(1).max(2000),
});

export const BackupDiscussionsSchema = z.object({
	discussions: z.array(BackupDiscussionItemSchema).default([]),
});
export type BackupDiscussionItem = z.infer<typeof BackupDiscussionItemSchema>;

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
