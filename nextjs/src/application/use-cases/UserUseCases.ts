import { IUserRepository } from "@/domain/repositories/IUserRepository";
import { ICommentRepository } from "@/domain/repositories/ICommentRepository";
import { IDiscussionRepository } from "@/domain/repositories/IDiscussionRepository";
import { INotificationRepository } from "@/domain/repositories/INotificationRepository";
import { User } from "@/domain/entities/User";

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

  async execute(email: string, data: { state?: string; belief?: string }): Promise<User> {
    const updated = await this.userRepo.update(email, data);
    if (!updated) throw new Error("User not found");
    return updated;
  }
}

export class DeleteUserUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly commentRepo: ICommentRepository,
    private readonly discussionRepo: IDiscussionRepository,
    private readonly notificationRepo: INotificationRepository,
  ) {}

  async execute(requestorEmail: string, targetEmail: string, isModerator: boolean): Promise<void> {
    if (requestorEmail !== targetEmail && !isModerator) throw new Error("Unauthorized");
    const user = await this.userRepo.findByEmail(targetEmail);
    if (!user) throw new Error("User not found");

    // LGPD Art. 18: anonymize the user's PII in dependent records before
    // hard-deleting the User document. Discussion threads stay readable
    // under "[usuário removido]"; notifications referencing the user (as
    // recipient or actor) are removed since they no longer have meaning.
    await Promise.all([
      this.commentRepo.anonymizeByUsername(user.username, ANONYMIZED_USERNAME),
      this.commentRepo.removeUserReferences(user.username),
      this.discussionRepo.anonymizeByUsername(user.username, ANONYMIZED_USERNAME),
      this.notificationRepo.deleteForUser(user.username),
    ]);

    await this.userRepo.delete(targetEmail);
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
