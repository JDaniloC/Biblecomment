import { NextResponse } from "next/server";
import { connectToDatabase } from "@/infrastructure/database/connection";
import { CommentModel } from "@/infrastructure/database/models/CommentModel";
import { VerseModel } from "@/infrastructure/database/models/VerseModel";
import { auth } from "@/lib/auth";
import { buildLikeStats } from "@/lib/comment-enrich";
import { badRequest, serverError } from "@/lib/get-session";

type Params = { abbrev: string; chapter: string; verse: string };

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<Params> }) {
  try {
    const { abbrev, chapter, verse } = await params;
    const chapterNum = parseInt(chapter, 10);
    const verseNum = parseInt(verse, 10);
    if (isNaN(chapterNum) || isNaN(verseNum)) return badRequest("Invalid params");

    await connectToDatabase();

    const verseDoc = await VerseModel.findOne({ abbrev, chapter: chapterNum, verseNumber: verseNum });
    if (!verseDoc) return NextResponse.json({ titleComments: [], verseComments: [] });

    const comments = await CommentModel.find({ verseId: verseDoc._id }).sort({ createdAt: -1 }).lean();
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
        verseId: c.verseId.toString(),
        onTitle: c.onTitle,
      }));

    return NextResponse.json({ titleComments, verseComments });
  } catch (err) {
    return serverError(err);
  }
}
