import { NextResponse } from "next/server";
import { connectToDatabase } from "@/infrastructure/database/connection";
import { CommentModel } from "@/infrastructure/database/models/CommentModel";
import { VerseModel } from "@/infrastructure/database/models/VerseModel";
import { auth } from "@/lib/auth";
import { buildLikeStats } from "@/lib/comment-enrich";
import { badRequest, serverError } from "@/lib/get-session";
import { MongoCommunityRepository } from "@/infrastructure/repositories/MongoCommunityRepository";
import { MongoCommunityMembershipRepository } from "@/infrastructure/repositories/MongoCommunityMembershipRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { partitionByApproved } from "@/lib/community-prioritization";

type Params = { abbrev: string; chapter: string };

export const dynamic = "force-dynamic";

/**
 * Usernames approved in the reader's active community (`?community=slug`).
 * Empty / missing / unknown slug → empty set ⇒ everything in `others`.
 * Comment↔community is derived from approved membership (plan_community).
 */
async function approvedUsernames(url: URL): Promise<Set<string>> {
  const slug = url.searchParams.get("community")?.trim().toLowerCase();
  if (!slug) return new Set();
  const community = await new MongoCommunityRepository().findBySlug(slug);
  if (!community?._id) return new Set();
  const ids = await new MongoCommunityMembershipRepository().approvedUserIds(
    community._id,
  );
  if (ids.length === 0) return new Set();
  const users = await new MongoUserRepository().findManyByIds(ids);
  return new Set(users.map((u) => u.username));
}

export async function GET(req: Request, { params }: { params: Promise<Params> }) {
  try {
    const { abbrev, chapter } = await params;
    const chapterNum = parseInt(chapter, 10);
    if (isNaN(chapterNum)) return badRequest("Invalid chapter");

    await connectToDatabase();

    const verses = await VerseModel.find({ abbrev, chapter: chapterNum })
      .select("_id")
      .lean();
    const verseIds = verses.map((v) => v._id);

    const comments = await CommentModel.find({ verseId: { $in: verseIds } })
      .sort({ createdAt: -1 })
      .lean();

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

    const { prioritized, others } = partitionByApproved(
      verseComments,
      await approvedUsernames(new URL(req.url)),
    );

    return NextResponse.json({ titleComments, prioritized, others });
  } catch (err) {
    return serverError(err);
  }
}
