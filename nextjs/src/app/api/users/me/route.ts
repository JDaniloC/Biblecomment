import { NextResponse } from "next/server";
import { getSessionUser, unauthorized, serverError } from "@/lib/get-session";
import { UserModel } from "@/infrastructure/database/models/UserModel";
import { CommentModel } from "@/infrastructure/database/models/CommentModel";
import { VerseModel } from "@/infrastructure/database/models/VerseModel";
import { connectToDatabase } from "@/infrastructure/database/connection";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    await connectToDatabase();

    const userData = await UserModel.findOne({ email: user.email }).lean();
    if (!userData) return unauthorized();

    const userComments = await CommentModel.find({ username: userData.username }).select("verseId").lean();

    const verseIds = [...new Set(userComments.map((c) => c.verseId.toString()))];
    const verses = await VerseModel.find({ _id: { $in: verseIds } }).select("abbrev chapter").lean();

    const bookAbbrevs = new Set<string>();
    const chapterKeys = new Set<string>();
    for (const v of verses) {
      bookAbbrevs.add(v.abbrev);
      chapterKeys.add(`${v.abbrev}:${v.chapter}`);
    }

    const safeUser = {
      email: userData.email,
      username: userData.username,
      belief: userData.belief ?? "",
      stateName: userData.state ?? "",
      createdAt: (userData as { createdAt?: Date }).createdAt?.toISOString() ?? null,
      booksCount: bookAbbrevs.size,
      chaptersCount: chapterKeys.size,
      commentsCount: userComments.length,
    };

    return NextResponse.json(safeUser);
  } catch {
    return serverError();
  }
}
