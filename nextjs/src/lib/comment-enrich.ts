import { MongoCommentLikeRepository } from "@/infrastructure/repositories/MongoCommentLikeRepository";

/**
 * Batch-fetch like stats for the given comment ids on behalf of a viewer.
 *
 * The caller serializes comments into the wire shape and uses the returned
 * Map / Set to fill `likeCount` and `likedByMe`. Single round-trip per
 * dimension — no per-comment query.
 *
 * Anonymous viewer (viewerUserId = undefined): likedByMe is always false.
 */
export async function buildLikeStats(
  commentIds: string[],
  viewerUserId?: string,
): Promise<{
  countByCommentId: Map<string, number>;
  likedByViewer: Set<string>;
}> {
  if (commentIds.length === 0) {
    return { countByCommentId: new Map(), likedByViewer: new Set() };
  }
  const repo = new MongoCommentLikeRepository();
  const [counts, liked] = await Promise.all([
    repo.countByComment(commentIds),
    viewerUserId
      ? repo.whichLiked(viewerUserId, commentIds)
      : Promise.resolve(new Set<string>()),
  ]);
  return { countByCommentId: counts, likedByViewer: liked };
}
