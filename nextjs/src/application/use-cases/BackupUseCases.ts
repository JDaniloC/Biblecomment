import { IUserRepository } from "@/domain/repositories/IUserRepository";
import { ICommentRepository } from "@/domain/repositories/ICommentRepository";
import { IDiscussionRepository } from "@/domain/repositories/IDiscussionRepository";
import { User } from "@/domain/entities/User";
import { Comment } from "@/domain/entities/Comment";
import { Discussion } from "@/domain/entities/Discussion";

export type BackupUser = Omit<User, "password" | "passwordType">;

export class BackupUsersUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(): Promise<BackupUser[]> {
    const users = await this.userRepo.findAll();
    return users.map(({ password: _p, passwordType: _t, ...rest }) => rest);
  }
}

export class BackupCommentsUseCase {
  constructor(private readonly commentRepo: ICommentRepository) {}

  async execute(): Promise<Comment[]> {
    return this.commentRepo.findAll();
  }
}

export class BackupDiscussionsUseCase {
  constructor(private readonly discussionRepo: IDiscussionRepository) {}

  async execute(): Promise<Discussion[]> {
    return this.discussionRepo.findAll();
  }
}
