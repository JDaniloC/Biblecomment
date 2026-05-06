import { ICommentRepository } from "@/domain/repositories/ICommentRepository";
import { ICommentLikeRepository } from "@/domain/repositories/ICommentLikeRepository";
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
  constructor(
    private readonly commentRepo: ICommentRepository,
    private readonly likeRepo: ICommentLikeRepository,
  ) {}

  /**
   * Comments the user has liked, ordered by like createdAt desc.
   * Each comment is enriched with `likeCount` and `likedByMe: true`.
   */
  async execute(userId: string, page: number, pageSize: number): Promise<Comment[]> {
    const ids = await this.likeRepo.findCommentIdsLikedBy(userId, page, pageSize);
    if (ids.length === 0) return [];
    const [comments, counts] = await Promise.all([
      this.commentRepo.findManyByIds(ids),
      this.likeRepo.countByComment(ids),
    ]);
    const byId = new Map(comments.map((c) => [c._id ?? "", c]));
    const ordered: Comment[] = [];
    for (const id of ids) {
      const c = byId.get(id);
      if (!c) continue; // comment was hard-deleted but the like row hasn't been pruned yet
      ordered.push({
        ...c,
        likeCount: counts.get(id) ?? 0,
        likedByMe: true,
      });
    }
    return ordered;
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
  constructor(
    private readonly commentRepo: ICommentRepository,
    private readonly likeRepo?: ICommentLikeRepository,
  ) {}

  async execute(id: string, username: string, isModerator: boolean = false): Promise<void> {
    const comment = await this.commentRepo.findById(id);
    if (!comment) throw new Error("Comment not found");
    if (!isModerator && comment.username !== username) throw new Error("Unauthorized");
    await this.commentRepo.delete(id);
    // Cascade likes for the dead comment so the join collection doesn't grow
    // orphaned rows. Best-effort — failure here doesn't undo the delete.
    if (this.likeRepo) {
      await this.likeRepo.deleteAllByComment(id).catch(() => undefined);
    }
  }
}

export interface ToggleLikeResult {
  commentId: string;
  likeCount: number;
  likedByMe: boolean;
}

export class ToggleLikeUseCase {
  constructor(
    private readonly commentRepo: ICommentRepository,
    private readonly likeRepo: ICommentLikeRepository,
  ) {}

  async execute(commentId: string, userId: string): Promise<ToggleLikeResult> {
    // Confirm the comment exists so callers get a clean 404 instead of
    // silently flipping the join row for a non-existent target.
    const comment = await this.commentRepo.findById(commentId);
    if (!comment) throw new Error("Comment not found");

    const wasLiked = await this.likeRepo.hasLiked(userId, commentId);
    if (wasLiked) {
      await this.likeRepo.unlike(userId, commentId);
    } else {
      await this.likeRepo.like(userId, commentId);
    }

    const counts = await this.likeRepo.countByComment([commentId]);
    return {
      commentId,
      likeCount: counts.get(commentId) ?? 0,
      likedByMe: !wasLiked,
    };
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

export class ListReportedCommentsUseCase {
  constructor(private readonly commentRepo: ICommentRepository) {}

  async execute(page: number, pageSize: number): Promise<Comment[]> {
    return this.commentRepo.findReported(page, pageSize);
  }
}

export class ClearReportsUseCase {
  constructor(private readonly commentRepo: ICommentRepository) {}

  async execute(id: string): Promise<Comment> {
    const updated = await this.commentRepo.clearReports(id);
    if (!updated) throw new Error("Comment not found");
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
