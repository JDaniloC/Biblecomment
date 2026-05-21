import {
  IUserRepository,
  AdminUserCursor,
} from "@/domain/repositories/IUserRepository";
import { AdminUserDTO } from "@/domain/dto/AdminUserDTO";
import { ICommentRepository } from "@/domain/repositories/ICommentRepository";
import { ICommentLikeRepository } from "@/domain/repositories/ICommentLikeRepository";
import { ICommentReportRepository } from "@/domain/repositories/ICommentReportRepository";
import { IDiscussionRepository } from "@/domain/repositories/IDiscussionRepository";
import { IDiscussionAnswerRepository } from "@/domain/repositories/IDiscussionAnswerRepository";
import { INotificationRepository } from "@/domain/repositories/INotificationRepository";
import { User } from "@/domain/entities/User";
import { isValidUsername } from "@/lib/sanitize-username";

export const ANONYMIZED_USERNAME = "[usuário removido]";

export class GetUserByEmailUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(email: string): Promise<User | null> {
    return this.userRepo.findByEmail(email);
  }
}

export class GetUserByUsernameUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(username: string): Promise<User | null> {
    return this.userRepo.findByUsername(username);
  }
}

export class GetUsersPaginatedUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(page: number, pageSize: number): Promise<Omit<User, "password">[]> {
    const users = await this.userRepo.findAllPaginated(page, pageSize);
    return users.map(({ password: _pw, ...rest }) => rest);
  }
}

export class UpdateUserProfileUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(
    email: string,
    data: { state?: string; belief?: string; displayName?: string; showBelief?: boolean },
  ): Promise<User> {
    if (data.displayName !== undefined) {
      const trimmed = data.displayName.trim();
      if (trimmed.length < 1 || trimmed.length > 80) {
        throw new Error("Invalid displayName length");
      }
      data = { ...data, displayName: trimmed };
    }
    const updated = await this.userRepo.update(email, data);
    if (!updated) throw new Error("User not found");
    return updated;
  }
}

/**
 * Rename a user's slug, cascading the snapshot field across every
 * collection that stored it: comments, discussions, discussion answers,
 * and notifications (recipient + actor).
 *
 * Validation order is deliberate: format → noop short-circuit → uniqueness
 * → user fetch → write → cascade. The cascade is fire-and-forget after
 * the user write commits, so a partial cascade leaves the user pointing
 * at the new slug while old references slowly converge — re-running the
 * use case with the same target is idempotent and finishes the work.
 */
export class UpdateUsernameUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly commentRepo: ICommentRepository,
    private readonly discussionRepo: IDiscussionRepository,
    private readonly answerRepo: IDiscussionAnswerRepository,
    private readonly notificationRepo: INotificationRepository,
  ) {}

  async execute(currentEmail: string, newUsername: string): Promise<User> {
    if (!isValidUsername(newUsername)) {
      throw new Error("Invalid username format");
    }

    const user = await this.userRepo.findByEmail(currentEmail);
    if (!user) throw new Error("User not found");

    if (user.username === newUsername) return user;

    const taken = await this.userRepo.findByUsername(newUsername);
    if (taken) throw new Error("Username already taken");

    const oldUsername = user.username;
    const updated = await this.userRepo.update(currentEmail, { username: newUsername });
    if (!updated) throw new Error("Failed to rename");

    await Promise.all([
      this.commentRepo.anonymizeByUsername(oldUsername, newUsername),
      this.discussionRepo.anonymizeByUsername(oldUsername, newUsername),
      this.answerRepo.anonymizeByUser(updated._id ?? "", newUsername),
      this.notificationRepo.renameUsername(oldUsername, newUsername),
    ]);

    return updated;
  }
}

export class DeleteUserUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly commentRepo: ICommentRepository,
    private readonly commentLikeRepo: ICommentLikeRepository,
    private readonly commentReportRepo: ICommentReportRepository,
    private readonly discussionRepo: IDiscussionRepository,
    private readonly discussionAnswerRepo: IDiscussionAnswerRepository,
    private readonly notificationRepo: INotificationRepository,
  ) {}

  async execute(requestorEmail: string, targetEmail: string, isModerator: boolean): Promise<void> {
    if (requestorEmail !== targetEmail && !isModerator) throw new Error("Unauthorized");
    const user = await this.userRepo.findByEmail(targetEmail);
    if (!user) throw new Error("User not found");

    // LGPD Art. 18: anonymize the user's PII in dependent records before
    // hard-deleting the User document. Discussion threads stay readable
    // under "[usuário removido]" (top-level + per-answer snapshot);
    // notifications referencing the user (as recipient or actor) are
    // removed since they no longer have meaning.
    // Likes and reports (CommentLike / CommentReport) are keyed by userId —
    // deleteMany strips them cleanly without touching the parent comment.
    await Promise.all([
      this.commentRepo.anonymizeByUsername(user.username, ANONYMIZED_USERNAME),
      user._id
        ? this.commentLikeRepo.deleteAllByUser(user._id)
        : Promise.resolve(0),
      user._id
        ? this.commentReportRepo.deleteAllByUser(user._id)
        : Promise.resolve(0),
      this.discussionRepo.anonymizeByUsername(user.username, ANONYMIZED_USERNAME),
      user._id
        ? this.discussionAnswerRepo.anonymizeByUser(user._id, ANONYMIZED_USERNAME)
        : Promise.resolve(0),
      this.notificationRepo.deleteForUser(user.username),
    ]);

    await this.userRepo.delete(targetEmail);
  }
}

export class MarkTutorialCompletedUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(email: string, name: string): Promise<void> {
    if (!name || typeof name !== "string") throw new Error("Invalid tutorial name");
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

export class ListUsersForModerationUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(opts: {
    q?: string;
    cursor?: AdminUserCursor | null;
    limit: number;
  }): Promise<{ items: AdminUserDTO[]; nextCursor: AdminUserCursor | null }> {
    return this.userRepo.findForModeration(opts);
  }
}
