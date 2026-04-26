import { IBookRepository } from "@/domain/repositories/IBookRepository";
import { ICommentRepository } from "@/domain/repositories/ICommentRepository";
import { IDiscussionRepository } from "@/domain/repositories/IDiscussionRepository";
import { IUserRepository } from "@/domain/repositories/IUserRepository";

export interface AppStats {
  totalBooks: number;
  totalComments: number;
  totalDiscussions: number;
}

export class GetAppStatsUseCase {
  constructor(
    private readonly bookRepo: IBookRepository,
    private readonly commentRepo: ICommentRepository,
    private readonly discussionRepo: IDiscussionRepository
  ) {}

  async execute(): Promise<AppStats> {
    const [books, comments, discussions] = await Promise.all([
      this.bookRepo.findAll(),
      this.commentRepo.findAll(),
      this.discussionRepo.findAll(),
    ]);

    return {
      totalBooks: books.length,
      totalComments: comments.length,
      totalDiscussions: discussions.length,
    };
  }
}

export class GetUserProfileInfoUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(email: string) {
    const user = await this.userRepo.findByEmail(email);
    if (!user) throw new Error("User not found");
    return {
      email: user.email,
      username: user.username,
      state: user.state,
      belief: user.belief,
      moderator: user.moderator,
    };
  }
}
