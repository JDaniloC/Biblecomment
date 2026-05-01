import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MongoBookRepository } from "@/infrastructure/repositories/MongoBookRepository";
import { MongoVerseRepository } from "@/infrastructure/repositories/MongoVerseRepository";
import ChapterClient from "@/app/chapter/[abbrev]/[chapter]/ChapterClient";
import { CHAPTER_TUTORIAL_NAME } from "@/lib/tutorial-config";

type Params = { abbrev: string; number: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { abbrev, number } = await params;
  const chapterNum = parseInt(number, 10);
  if (Number.isNaN(chapterNum)) return { title: "Capítulo inválido" };

  try {
    const bookRepo = new MongoBookRepository();
    const book = await bookRepo.findByAbbrev(abbrev);
    if (!book) return { title: "Capítulo não encontrado" };

    const title = `${book.name} ${chapterNum}`;
    const description = `Leia ${book.name} ${chapterNum} com comentários da comunidade no Bible Comment.`;
    const url = `/verses/${abbrev}/${chapterNum}`;

    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: { title, description, type: "article", url, locale: "pt_BR" },
      twitter: { card: "summary", title, description },
    };
  } catch {
    // DB unreachable at metadata time — fall back to a generic title so
    // the page itself can still render (it does its own DB call too).
    return { title: `${abbrev.toUpperCase()} ${chapterNum}` };
  }
}

export default async function VersesPage({ params }: { params: Promise<Params> }) {
  // Reading verses & comments is intentionally public — Bible Comment is
  // an open platform. Auth gates write actions (composer, like, report,
  // delete) inside ChapterClient instead.
  const session = await auth();

  const { abbrev, number } = await params;
  const chapterNum = parseInt(number, 10);

  const bookRepo = new MongoBookRepository();
  const verseRepo = new MongoVerseRepository();

  const [book, verses] = await Promise.all([
    bookRepo.findByAbbrev(abbrev),
    verseRepo.findByAbbrevAndChapter(abbrev, chapterNum),
  ]);

  if (!book) redirect("/");

  const tutorialAlreadyCompleted =
    session?.user?.tutorialsCompleted?.includes(CHAPTER_TUTORIAL_NAME) ?? false;

  return (
    <ChapterClient
      book={book}
      verses={verses}
      chapter={chapterNum}
      user={session?.user ?? null}
      tutorialAlreadyCompleted={tutorialAlreadyCompleted}
    />
  );
}
