import { NextResponse } from "next/server";
import { connectToDatabase } from "@/infrastructure/database/connection";
import { CommentModel } from "@/infrastructure/database/models/CommentModel";
import { VerseModel } from "@/infrastructure/database/models/VerseModel";
import { auth } from "@/lib/auth";
import { buildLikeStats } from "@/lib/comment-enrich";
import { badRequest, serverError } from "@/lib/get-session";

type Params = { abbrev: string; chapter: string };

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<Params> }) {
  try {
    const { abbrev, chapter } = await params;
    const chapterNum = parseInt(chapter, 10);
    if (isNaN(chapterNum)) return badRequest("Invalid chapter");

    await connectToDatabase();

    const verses = await VerseModel.find({ abbrev, chapter: chapterNum }).select("_id").lean();
    const verseIds = verses.map((v) => v._id);

    const comments = await CommentModel.find({
      verseId: { $in: verseIds },
    }).sort({ createdAt: -1 }).lean();

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
        verseId: c.verseId.toString(),
        onTitle: c.onTitle,
      }));

    return NextResponse.json({ titleComments, verseComments });
  } catch (err) {
    return serverError(err);
  }
}
