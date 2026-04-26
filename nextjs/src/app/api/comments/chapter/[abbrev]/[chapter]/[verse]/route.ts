import { NextResponse } from "next/server";
import { connectToDatabase } from "@/infrastructure/database/connection";
import { CommentModel } from "@/infrastructure/database/models/CommentModel";
import { VerseModel } from "@/infrastructure/database/models/VerseModel";
import { serverError } from "@/lib/get-session";

type Params = { abbrev: string; chapter: string; verse: string };

export async function GET(_req: Request, { params }: { params: Promise<Params> }) {
  try {
    const { abbrev, chapter, verse } = await params;
    const chapterNum = parseInt(chapter, 10);
    const verseNum = parseInt(verse, 10);
    if (isNaN(chapterNum) || isNaN(verseNum)) {
      return NextResponse.json({ error: "Invalid params" }, { status: 400 });
    }

    await connectToDatabase();

    const verseDoc = await VerseModel.findOne({ abbrev, chapter: chapterNum, verseNumber: verseNum });
    if (!verseDoc) return NextResponse.json({ titleComments: [], verseComments: [] });

    const comments = await CommentModel.find({ verseId: verseDoc._id }).sort({ createdAt: -1 }).lean();

    const titleComments = comments
      .filter((c) => c.onTitle)
      .map((c) => ({
        _id: c._id.toString(),
        text: c.text,
        tags: c.tags,
        username: c.username,
        bookReference: c.bookReference,
        createdAt: c.createdAt,
        likes: c.likes,
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
        likes: c.likes,
        verseId: c.verseId.toString(),
        onTitle: c.onTitle,
      }));

    return NextResponse.json({ titleComments, verseComments });
  } catch {
    return serverError();
  }
}
