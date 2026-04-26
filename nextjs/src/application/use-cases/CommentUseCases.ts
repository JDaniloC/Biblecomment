import { ICommentRepository } from "@/domain/repositories/ICommentRepository";
import { IVerseRepository } from "@/domain/repositories/IVerseRepository";
import { Comment } from "@/domain/entities/Comment";

export class GetVerseCommentsUseCase {
  constructor(private readonly commentRepo: ICommentRepository) {}

  async execute(verseId: string): Promise<Comment[]> {
    return this.commentRepo.findByVerseId(verseId);
  }
}

export class GetAllCommentsPaginatedUseCase {
  constructor(private readonly commentRepo: ICommentRepository) {}

  async execute(page: number, pageSize: number): Promise<Comment[]> {
    return this.commentRepo.findAllPaginated(page, pageSize);
  }
}

export class GetUserFavoritesUseCase {
  constructor(private readonly commentRepo: ICommentRepository) {}

  async execute(username: string, page: number, pageSize: number): Promise<Comment[]> {
    return this.commentRepo.findFavoritesByUsername(username, page, pageSize);
  }
}

export class CreateCommentUseCase {
  constructor(
    private readonly commentRepo: ICommentRepository,
    private readonly verseRepo: IVerseRepository
  ) {}

  async execute(
    verseId: string,
    username: string,
    text: string,
    tags: string[],
    onTitle: boolean = false
  ): Promise<Comment> {
    const verse = await this.verseRepo.findById(verseId);
    if (!verse) throw new Error("Verse not found");

    const bookRef = verse.reference ?? `${verse.abbrev} ${verse.chapter}:${verse.verseNumber}`;

    return this.commentRepo.create({
      verseId: verse._id ?? "",
      username,
      onTitle,
      bookReference: bookRef,
      text,
      tags,
      reports: [],
      likes: [],
    });
  }
}

export class UpdateCommentUseCase {
  constructor(private readonly commentRepo: ICommentRepository) {}

  async execute(id: string, username: string, text: string, tags: string[]): Promise<Comment> {
    const comment = await this.commentRepo.findById(id);
    if (!comment) throw new Error("Comment not found");
    if (comment.username !== username) throw new Error("Unauthorized");

    const updated = await this.commentRepo.update(id, { text, tags });
    if (!updated) throw new Error("Failed to update comment");
    return updated;
  }
}

export class DeleteCommentUseCase {
  constructor(private readonly commentRepo: ICommentRepository) {}

  async execute(id: string, username: string, isModerator: boolean = false): Promise<void> {
    const comment = await this.commentRepo.findById(id);
    if (!comment) throw new Error("Comment not found");
    if (!isModerator && comment.username !== username) throw new Error("Unauthorized");
    await this.commentRepo.delete(id);
  }
}

export class ToggleLikeUseCase {
  constructor(private readonly commentRepo: ICommentRepository) {}

  async execute(id: string, username: string): Promise<Comment> {
    const comment = await this.commentRepo.findById(id);
    if (!comment) throw new Error("Comment not found");

    const updated = comment.likes.includes(username)
      ? await this.commentRepo.removeLike(id, username)
      : await this.commentRepo.addLike(id, username);

    if (!updated) throw new Error("Failed to toggle like");
    return updated;
  }
}

export class ReportCommentUseCase {
  constructor(private readonly commentRepo: ICommentRepository) {}

  async execute(id: string, username: string): Promise<Comment> {
    const comment = await this.commentRepo.findById(id);
    if (!comment) throw new Error("Comment not found");

    const updated = await this.commentRepo.addReport(id, username);
    if (!updated) throw new Error("Failed to report comment");
    return updated;
  }
}

export class GetUserCommentsUseCase {
  constructor(private readonly commentRepo: ICommentRepository) {}

  async execute(username: string): Promise<Comment[]> {
    return this.commentRepo.findByUsername(username);
  }
}

export class GetAllCommentsUseCase {
  constructor(private readonly commentRepo: ICommentRepository) {}

  async execute(): Promise<Comment[]> {
    return this.commentRepo.findAll();
  }
}
