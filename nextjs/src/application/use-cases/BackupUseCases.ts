import { IUserRepository } from "@/domain/repositories/IUserRepository";
import { ICommentRepository } from "@/domain/repositories/ICommentRepository";
import { IDiscussionRepository } from "@/domain/repositories/IDiscussionRepository";
import { User } from "@/domain/entities/User";
import { Comment } from "@/domain/entities/Comment";
import { Discussion } from "@/domain/entities/Discussion";

export type BackupUser = Omit<User, "password">;
export type ImportableComment = Omit<Comment, "_id" | "createdAt" | "updatedAt">;
// Answers (Phase 9.3) live in DiscussionAnswer collection — not imported through this path.
export type ImportableDiscussion = Omit<
  Discussion,
  "_id" | "createdAt" | "updatedAt" | "answers" | "answersCount"
>;

export class BackupUsersUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(): Promise<BackupUser[]> {
    const users = await this.userRepo.findAll();
    return users.map(({ password: _p, ...rest }) => rest);
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

export class ImportCommentsUseCase {
  constructor(private readonly commentRepo: ICommentRepository) {}

  async execute(items: ImportableComment[]): Promise<number> {
    if (items.length === 0) return 0;
    return this.commentRepo.createMany(items);
  }
}

export class ImportDiscussionsUseCase {
  constructor(private readonly discussionRepo: IDiscussionRepository) {}

  async execute(items: ImportableDiscussion[]): Promise<number> {
    if (items.length === 0) return 0;
    return this.discussionRepo.createMany(items);
  }
}
