import { ICommentRepository, CommunityFilter } from "@/domain/repositories/ICommentRepository";
import { ICommentLikeRepository } from "@/domain/repositories/ICommentLikeRepository";
import { ICommentReportRepository } from "@/domain/repositories/ICommentReportRepository";
import { ICommunityRepository } from "@/domain/repositories/ICommunityRepository";
import { ICommunityMembershipRepository } from "@/domain/repositories/ICommunityMembershipRepository";
import { IUserRepository } from "@/domain/repositories/IUserRepository";
import { IVerseRepository } from "@/domain/repositories/IVerseRepository";
import { Comment } from "@/domain/entities/Comment";

export class GetVerseCommentsUseCase {
  constructor(private readonly commentRepo: ICommentRepository) {}

  async execute(verseId: string, communities?: CommunityFilter): Promise<Comment[]> {
    if (communities === undefined) {
      return this.commentRepo.findByVerseId(verseId);
    }
    return this.commentRepo.findByVerseIdFiltered(verseId, communities);
  }
}

export class ListCommunityCommentsUseCase {
  constructor(private readonly commentRepo: ICommentRepository) {}

  async execute(slug: string, page: number, pageSize: number) {
    return this.commentRepo.findByCommunity(slug, page, pageSize);
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

export interface CreateCommentInput {
  verseId: string;
  username: string;
  text: string;
  tags: string[];
  onTitle?: boolean;
  /** Optional community to post into. Caller may omit for the general feed. */
  communitySlug?: string;
}

export class CreateCommentUseCase {
  constructor(
    private readonly commentRepo: ICommentRepository,
    private readonly verseRepo: IVerseRepository,
    private readonly communityRepo?: ICommunityRepository,
    private readonly membershipRepo?: ICommunityMembershipRepository,
    private readonly userRepo?: IUserRepository,
  ) {}

  async execute(input: CreateCommentInput): Promise<Comment> {
    const verse = await this.verseRepo.findById(input.verseId);
    if (!verse) throw new Error("Verse not found");

    const bookRef = verse.reference ?? `${verse.abbrev} ${verse.chapter}:${verse.verseNumber}`;

    // Community gate: when the caller targets a community, we verify the
    // community exists and the author belongs to it. Posting to /communities
    // a user doesn't belong to should fail loudly rather than silently
    // demoting the post to the general feed.
    let communitySlug: string | undefined;
    if (input.communitySlug) {
      if (!this.communityRepo || !this.membershipRepo || !this.userRepo) {
        throw new Error("Community posting not configured");
      }
      const community = await this.communityRepo.findBySlug(input.communitySlug);
      if (!community || !community._id) throw new Error("Community not found");

      const author = await this.userRepo.findByUsername(input.username);
      if (!author || !author._id) throw new Error("Author not found");

      const isMember = await this.membershipRepo.isMember(author._id, community._id);
      if (!isMember) throw new Error("Not a community member");

      communitySlug = community.slug;
    }

    return this.commentRepo.create({
      verseId: verse._id ?? "",
      username: input.username,
      onTitle: input.onTitle ?? false,
      bookReference: bookRef,
      text: input.text,
      tags: input.tags,
      communitySlug,
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
    private readonly reportRepo?: ICommentReportRepository,
  ) {}

  async execute(id: string, username: string, isModerator: boolean = false): Promise<void> {
    const comment = await this.commentRepo.findById(id);
    if (!comment) throw new Error("Comment not found");
    if (!isModerator && comment.username !== username) throw new Error("Unauthorized");
    await this.commentRepo.delete(id);
    // Cascade likes + reports for the dead comment so the join collections
    // don't grow orphaned rows. Best-effort — failure here doesn't undo
    // the delete (the source of truth for "is this comment alive" is the
    // CommentModel doc, which we just removed).
    if (this.likeRepo) {
      await this.likeRepo.deleteAllByComment(id).catch(() => undefined);
    }
    if (this.reportRepo) {
      await this.reportRepo.deleteAllByComment(id).catch(() => undefined);
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

export interface ReportCommentResult {
  commentId: string;
  reportCount: number;
  reportedByMe: boolean;
}

export class ReportCommentUseCase {
  constructor(
    private readonly commentRepo: ICommentRepository,
    private readonly reportRepo: ICommentReportRepository,
  ) {}

  async execute(
    commentId: string,
    userId: string,
    username: string,
  ): Promise<ReportCommentResult> {
    const comment = await this.commentRepo.findById(commentId);
    if (!comment) throw new Error("Comment not found");

    await this.reportRepo.report(userId, username, commentId);
    const counts = await this.reportRepo.countByComment([commentId]);
    return {
      commentId,
      reportCount: counts.get(commentId) ?? 0,
      reportedByMe: true,
    };
  }
}

export class ListReportedCommentsUseCase {
  constructor(
    private readonly commentRepo: ICommentRepository,
    private readonly reportRepo: ICommentReportRepository,
  ) {}

  /**
   * Reported comments paginated by report count desc. Each item is the
   * Comment doc enriched with `reportCount` + `reporters` (snapshot
   * usernames) so the moderation panel renders without an extra round-trip.
   */
  async execute(page: number, pageSize: number): Promise<Comment[]> {
    const aggregates = await this.reportRepo.findReportedCommentIds(page, pageSize);
    if (aggregates.length === 0) return [];
    const ids = aggregates.map((a) => a.commentId);
    const comments = await this.commentRepo.findManyByIds(ids);
    const byId = new Map(comments.map((c) => [c._id ?? "", c]));
    const ordered: Comment[] = [];
    for (const a of aggregates) {
      const c = byId.get(a.commentId);
      if (!c) continue; // stale report rows for a hard-deleted comment
      ordered.push({
        ...c,
        reportCount: a.reportCount,
        reporters: a.reporters,
      });
    }
    return ordered;
  }
}

export interface ModerationCursor {
  createdAt: Date;
  id: string;
}

export interface ListAllCommentsResult {
  items: Comment[];
  nextCursor: ModerationCursor | null;
}

export class ListAllCommentsForModerationUseCase {
  constructor(
    private readonly commentRepo: ICommentRepository,
    private readonly reportRepo: ICommentReportRepository,
  ) {}

  /**
   * Cursor-paginated all-comments view for moderators. Each item is
   * enriched with `reportCount` (best-effort batch lookup). `nextCursor`
   * is null when there are no more results — UI hides the "Carregar mais"
   * button on null.
   */
  async execute(opts: {
    q?: string;
    cursor?: ModerationCursor | null;
    limit: number;
  }): Promise<ListAllCommentsResult> {
    const { items, nextCursor } = await this.commentRepo.findForModeration({
      q: opts.q,
      cursor: opts.cursor,
      limit: opts.limit,
    });
    if (items.length === 0) return { items, nextCursor };

    const ids = items.map((c) => c._id ?? "").filter(Boolean);
    const counts = await this.reportRepo.countByComment(ids);
    const enriched = items.map((c) => ({
      ...c,
      reportCount: counts.get(c._id ?? "") ?? 0,
    }));
    return { items: enriched, nextCursor };
  }
}

export class ToggleCommentVerifiedUseCase {
  constructor(private readonly commentRepo: ICommentRepository) {}

  async execute(commentId: string, moderatorUsername: string): Promise<Comment> {
    const comment = await this.commentRepo.findById(commentId);
    if (!comment) throw new Error("Comment not found");
    const next = !comment.verified;
    const updated = await this.commentRepo.setVerified(
      commentId,
      next,
      next ? moderatorUsername : null,
    );
    if (!updated) throw new Error("Failed to toggle verified");
    return updated;
  }
}

export class ClearReportsUseCase {
  constructor(private readonly reportRepo: ICommentReportRepository) {}

  async execute(commentId: string): Promise<{ commentId: string; cleared: number }> {
    const cleared = await this.reportRepo.clearReportsForComment(commentId);
    return { commentId, cleared };
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
