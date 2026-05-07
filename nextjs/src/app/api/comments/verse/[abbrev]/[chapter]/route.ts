import { NextResponse } from "next/server";
import { connectToDatabase } from "@/infrastructure/database/connection";
import { CommentModel } from "@/infrastructure/database/models/CommentModel";
import { VerseModel } from "@/infrastructure/database/models/VerseModel";
import { getSessionUser, unauthorized, badRequest, notFound, serverError } from "@/lib/get-session";

type Params = { abbrev: string; chapter: string };

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<Params> }) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { abbrev, chapter } = await params;
    const chapterNum = parseInt(chapter, 10);
    if (isNaN(chapterNum)) return badRequest("Invalid chapter");

    const body = (await req.json()) as { text?: string; tags?: string[]; onTitle?: boolean };
    const { text, tags = [], onTitle = true } = body;
    if (!text) return badRequest("text é obrigatório");

    await connectToDatabase();

    const verse = await VerseModel.findOne({ abbrev, chapter: chapterNum }).sort({ verseNumber: 1 });
    if (!verse) return notFound("Verse not found");

    const bookRef = verse.reference ?? `${abbrev.toUpperCase()} ${chapterNum}`;

    const comment = await CommentModel.create({
      verseId: verse._id,
      username: user.username,
      onTitle: true,
      bookReference: bookRef,
      text,
      tags,
    });

    return NextResponse.json({
      _id: comment._id.toString(),
      text: comment.text,
      tags: comment.tags,
      username: comment.username,
      bookReference: comment.bookReference,
      createdAt: comment.createdAt,
      likeCount: 0,
      likedByMe: false,
      onTitle: comment.onTitle,
    }, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}
