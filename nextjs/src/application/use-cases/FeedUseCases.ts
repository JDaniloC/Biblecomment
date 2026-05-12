import type { ICommentRepository } from "@/domain/repositories/ICommentRepository";
import type { ICommentLikeRepository } from "@/domain/repositories/ICommentLikeRepository";
import type { IDiscussionRepository } from "@/domain/repositories/IDiscussionRepository";
import type { IDiscussionAnswerRepository } from "@/domain/repositories/IDiscussionAnswerRepository";
import type { IVerseRepository } from "@/domain/repositories/IVerseRepository";
import type { Comment } from "@/domain/entities/Comment";
import type { Discussion } from "@/domain/entities/Discussion";

export interface FeedCursor {
  createdAt: Date;
  id: string;
}

/**
 * Comment shape returned by the feed: the persisted Comment + a lookup
 * link target derived from the parent verse, so the client doesn't need
 * a second round-trip to render "Ler em contexto".
 */
export interface FeedComment extends Comment {
  link: { abbrev: string; chapter: number; verseNumber: number } | null;
}

export interface DiscussionFeedItem extends Discussion {
  answerCount: number;
  lastAnswerAt: Date;
}

/** Hydrate likeCount + verse-link onto a list of comments. */
async function enrich(
  items: Comment[],
  likeRepo: ICommentLikeRepository,
  verseRepo: IVerseRepository,
): Promise<FeedComment[]> {
  if (items.length === 0) return [];
  const ids = items.map((c) => c._id ?? "").filter(Boolean);
  const verseIds = items.map((c) => c.verseId).filter(Boolean);

  const [counts, verses] = await Promise.all([
    likeRepo.countByComment(ids),
    verseRepo.findManyByIds(verseIds),
  ]);
  const verseById = new Map(verses.map((v) => [v._id ?? "", v]));

  return items.map((c) => {
    const v = verseById.get(c.verseId);
    return {
      ...c,
      likeCount: counts.get(c._id ?? "") ?? 0,
      link: v
        ? { abbrev: v.abbrev, chapter: v.chapter, verseNumber: v.verseNumber }
        : null,
    };
  });
}

export class GetRecentFeedUseCase {
  constructor(
    private readonly commentRepo: ICommentRepository,
    private readonly likeRepo: ICommentLikeRepository,
    private readonly verseRepo: IVerseRepository,
  ) {}

  /**
   * Newest comments site-wide. Reuses `findForModeration` (no `q` filter)
   * since the cursor + sort logic is identical — feed and mod queue ride
   * the same compound index.
   */
  async execute(opts: {
    cursor?: FeedCursor | null;
    limit: number;
  }): Promise<{ items: FeedComment[]; nextCursor: FeedCursor | null }> {
    const { items, nextCursor } = await this.commentRepo.findForModeration({
      cursor: opts.cursor,
      limit: opts.limit,
    });
    const enriched = await enrich(items, this.likeRepo, this.verseRepo);
    return { items: enriched, nextCursor };
  }
}

export class GetPopularFeedUseCase {
  constructor(
    private readonly commentRepo: ICommentRepository,
    private readonly likeRepo: ICommentLikeRepository,
    private readonly verseRepo: IVerseRepository,
  ) {}

  /**
   * Top-N comments by like count over the last `windowDays` days.
   * Single-shot query (no cursor) — by design, popular is a digest, not
   * a stream.
   */
  async execute(opts: {
    windowDays: number;
    limit: number;
  }): Promise<{ items: FeedComment[] }> {
    const now = new Date();
    const since = new Date(now.getTime() - opts.windowDays * 24 * 60 * 60 * 1000);
    const aggregates = await this.likeRepo.topLikedSince(since, opts.limit);
    if (aggregates.length === 0) return { items: [] };

    const ids = aggregates.map((a) => a.commentId);
    const comments = await this.commentRepo.findManyByIds(ids);
    const byId = new Map(comments.map((c) => [c._id ?? "", c]));
    // Preserve aggregate order (most-liked first) when re-sorting.
    const ordered = aggregates
      .map((a) => byId.get(a.commentId))
      .filter((c): c is Comment => Boolean(c));
    const enriched = await enrich(ordered, this.likeRepo, this.verseRepo);
    return { items: enriched };
  }
}

export class GetActiveDiscussionsUseCase {
  constructor(
    private readonly discussionRepo: IDiscussionRepository,
    private readonly answerRepo: IDiscussionAnswerRepository,
  ) {}

  /**
   * Top-N discussions by latest-answer timestamp. Discussions with zero
   * answers are out — the feed surfaces *active* threads, not orphans.
   */
  async execute(opts: { limit: number }): Promise<{ items: DiscussionFeedItem[] }> {
    const aggregates = await this.answerRepo.latestPerDiscussion(opts.limit);
    if (aggregates.length === 0) return { items: [] };

    const ids = aggregates.map((a) => a.discussionId);
    const discussions = await this.discussionRepo.findManyByIds(ids);
    const byId = new Map(discussions.map((d) => [d._id ?? "", d]));
    const items: DiscussionFeedItem[] = aggregates
      .map((a) => {
        const d = byId.get(a.discussionId);
        if (!d) return null;
        return { ...d, answerCount: a.answerCount, lastAnswerAt: a.lastAnswerAt };
      })
      .filter((x): x is DiscussionFeedItem => x !== null);
    return { items };
  }
}
