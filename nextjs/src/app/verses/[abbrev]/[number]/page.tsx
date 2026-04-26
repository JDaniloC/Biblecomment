import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MongoBookRepository } from "@/infrastructure/repositories/MongoBookRepository";
import { MongoVerseRepository } from "@/infrastructure/repositories/MongoVerseRepository";
import ChapterClient from "@/app/chapter/[abbrev]/[chapter]/ChapterClient";

type Params = { abbrev: string; number: string };

export default async function VersesPage({ params }: { params: Promise<Params> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { abbrev, number } = await params;
  const chapterNum = parseInt(number, 10);

  const bookRepo = new MongoBookRepository();
  const verseRepo = new MongoVerseRepository();

  const [book, verses] = await Promise.all([
    bookRepo.findByAbbrev(abbrev),
    verseRepo.findByAbbrevAndChapter(abbrev, chapterNum),
  ]);

  if (!book) redirect("/home");

  return (
    <ChapterClient
      book={book}
      verses={verses}
      chapter={chapterNum}
      user={session.user}
    />
  );
}
