import { z } from "zod";

export const RegisterUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(2).max(40),
  password: z.string().min(6).max(200),
});
export type RegisterUserInput = z.infer<typeof RegisterUserSchema>;

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
  reports: z.array(z.string().max(40)).default([]),
  likes: z.array(z.string().max(40)).default([]),
});

export const BackupCommentsSchema = z.object({
  comments: z.array(BackupCommentItemSchema).default([]),
});
export type BackupCommentItem = z.infer<typeof BackupCommentItemSchema>;

const BackupDiscussionAnswerSchema = z.object({
  name: z.string().min(1).max(40),
  text: z.string().min(1).max(5000),
});

const BackupDiscussionItemSchema = z.object({
  bookAbbrev: z.string().min(1).max(20),
  commentId: z.string().optional(),
  username: z.string().min(1).max(40),
  verseReference: z.string().min(1).max(200),
  verseText: z.string().max(5000).default(""),
  commentText: z.string().max(5000).default(""),
  question: z.string().min(1).max(2000),
  answers: z.array(BackupDiscussionAnswerSchema).default([]),
});

export const BackupDiscussionsSchema = z.object({
  discussions: z.array(BackupDiscussionItemSchema).default([]),
});
export type BackupDiscussionItem = z.infer<typeof BackupDiscussionItemSchema>;
