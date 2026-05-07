import { z } from "zod";

export const RegisterUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(2).max(40),
  password: z.string().min(6).max(200),
  // LGPD: explicit consent to Terms + Privacy Policy is mandatory at signup.
  // Validated at the API boundary; the value is not persisted (the act of
  // creating the account is itself the record of consent at this timestamp).
  acceptedTerms: z.literal(true, {
    message: "É necessário aceitar os Termos de Uso e a Política de Privacidade.",
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
  })
  .refine((v) => v.state !== undefined || v.belief !== undefined, {
    message: "state ou belief é obrigatório",
  });
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export const DeleteUserSchema = z.object({
  email: z.string().email(),
});

export const SetModeratorSchema = z.object({
  email: z.string().email(),
  moderator: z.boolean(),
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
});

export const UpdateCommentSchema = z.object({
  text: z.string().min(1).max(5000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  action: z.enum(["like", "report"]).optional(),
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
