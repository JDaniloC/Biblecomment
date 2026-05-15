import { NextResponse } from "next/server";
import { connectToDatabase } from "@/infrastructure/database/connection";
import { CommentModel } from "@/infrastructure/database/models/CommentModel";
import { VerseModel } from "@/infrastructure/database/models/VerseModel";
import { auth } from "@/lib/auth";
import { buildLikeStats } from "@/lib/comment-enrich";
import { badRequest, serverError } from "@/lib/get-session";

type Params = { abbrev: string; chapter: string };

export const dynamic = "force-dynamic";

/**
 * Parse `?communities=slug1,slug2,general` into a Mongo predicate for the
 * `communitySlug` field. "general" / "geral" maps to the absent value; any
 * other slug filters in only that community.
 *
 * - `null` returned ⇒ no filter (legacy behavior, return everything).
 * - Empty selection returns "only general" so toggling all chips off still
 *   shows something.
 */
function parseCommunityFilter(url: URL): Record<string, unknown> | null {
  const raw = url.searchParams.get("communities");
  if (raw === null) return null;
  const tokens = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0) {
    // Explicit empty filter ⇒ "general only".
    return { communitySlug: { $in: [null, undefined] } };
  }
  const wantsGeneral = tokens.includes("general") || tokens.includes("geral");
  const slugs = tokens.filter((t) => t !== "general" && t !== "geral");
  if (wantsGeneral && slugs.length === 0) {
    return { communitySlug: { $in: [null, undefined] } };
  }
  if (!wantsGeneral && slugs.length > 0) {
    return { communitySlug: { $in: slugs } };
  }
  return {
    $or: [
      { communitySlug: { $in: [null, undefined] } },
      { communitySlug: { $in: slugs } },
    ],
  };
}

export async function GET(req: Request, { params }: { params: Promise<Params> }) {
  try {
    const { abbrev, chapter } = await params;
    const chapterNum = parseInt(chapter, 10);
    if (isNaN(chapterNum)) return badRequest("Invalid chapter");

    await connectToDatabase();

    const verses = await VerseModel.find({ abbrev, chapter: chapterNum }).select("_id").lean();
    const verseIds = verses.map((v) => v._id);

    const url = new URL(req.url);
    const communityPred = parseCommunityFilter(url);
    const filter: Record<string, unknown> = { verseId: { $in: verseIds } };
    if (communityPred) Object.assign(filter, communityPred);

    const comments = await CommentModel.find(filter).sort({ createdAt: -1 }).lean();

    const session = await auth();
    const stats = await buildLikeStats(
      comments.map((c) => c._id.toString()),
      session?.user?.id,
    );

    const titleComments = comments
      .filter((c) => c.onTitle)
      .map((c) => ({
        _id: c._id.toString(),
        text: c.text,
        tags: c.tags,
        username: c.username,
        bookReference: c.bookReference,
        createdAt: c.createdAt,
        likeCount: stats.countByCommentId.get(c._id.toString()) ?? 0,
        likedByMe: stats.likedByViewer.has(c._id.toString()),
        verified: c.verified ?? false,
        verifiedBy: c.verifiedBy,
        communitySlug: c.communitySlug,
        onTitle: c.onTitle,
      }));

    const verseComments = comments
      .filter((c) => !c.onTitle)
      .map((c) => ({
        _id: c._id.toString(),
        text: c.text,
        tags: c.tags,
        username: c.username,
        bookReference: c.bookReference,
        createdAt: c.createdAt,
        likeCount: stats.countByCommentId.get(c._id.toString()) ?? 0,
        likedByMe: stats.likedByViewer.has(c._id.toString()),
        verified: c.verified ?? false,
        verifiedBy: c.verifiedBy,
        communitySlug: c.communitySlug,
        verseId: c.verseId.toString(),
        onTitle: c.onTitle,
      }));

    return NextResponse.json({ titleComments, verseComments });
  } catch (err) {
    return serverError(err);
  }
}
