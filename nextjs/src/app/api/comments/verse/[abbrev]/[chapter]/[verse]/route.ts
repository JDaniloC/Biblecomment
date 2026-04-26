import { NextResponse } from "next/server";
import { connectToDatabase } from "@/infrastructure/database/connection";
import { CommentModel } from "@/infrastructure/database/models/CommentModel";
import { VerseModel } from "@/infrastructure/database/models/VerseModel";
import { getSessionUser, unauthorized, badRequest, notFound, serverError } from "@/lib/get-session";

type Params = { abbrev: string; chapter: string; verse: string };

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<Params> }) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { abbrev, chapter, verse } = await params;
    const chapterNum = parseInt(chapter, 10);
    const verseNum = parseInt(verse, 10);
    if (isNaN(chapterNum) || isNaN(verseNum)) return badRequest("Invalid params");

    const body = (await req.json()) as { text?: string; tags?: string[]; onTitle?: boolean };
    const { text, tags = [], onTitle = false } = body;
    if (!text) return badRequest("text é obrigatório");

    await connectToDatabase();

    const verseDoc = await VerseModel.findOne({ abbrev, chapter: chapterNum, verseNumber: verseNum });
    if (!verseDoc) return notFound("Verse not found");

    const bookRef = verseDoc.reference ?? `${abbrev.toUpperCase()} ${chapterNum}:${verseNum}`;

    const comment = await CommentModel.create({
      verseId: verseDoc._id,
      username: user.username,
      onTitle: onTitle ?? false,
      bookReference: bookRef,
      text,
      tags,
      reports: [],
      likes: [],
    });

    return NextResponse.json({
      _id: comment._id.toString(),
      text: comment.text,
      tags: comment.tags,
      username: comment.username,
      bookReference: comment.bookReference,
      createdAt: comment.createdAt,
      likes: comment.likes,
      onTitle: comment.onTitle,
    }, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}
