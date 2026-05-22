import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MongoBookRepository } from "@/infrastructure/repositories/MongoBookRepository";
import { MongoVerseRepository } from "@/infrastructure/repositories/MongoVerseRepository";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { MongoUserChapterReadRepository } from "@/infrastructure/repositories/MongoUserChapterReadRepository";
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

export default async function VersesPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ offline?: string }>;
}) {
  // `?offline=1` renders a session-free snapshot. The service worker
  // pre-caches this variant so a chapter stays readable offline without
  // ever persisting one user's personalized view (badges, "marcar como
  // lido") into a cache another user could hit on a shared device.
  const { offline } = await searchParams;
  const offlineSnapshot = offline === "1";

  // Reading verses & comments is intentionally public — Bible Comment is
  // an open platform. Auth gates write actions (composer, like, report,
  // delete) inside ChapterClient instead.
  const session = offlineSnapshot ? null : await auth();

  const { abbrev, number } = await params;
  const chapterNum = parseInt(number, 10);

  const bookRepo = new MongoBookRepository();
  const verseRepo = new MongoVerseRepository();
  const commentRepo = new MongoCommentRepository();

  const [book, verses] = await Promise.all([
    bookRepo.findByAbbrev(abbrev),
    verseRepo.findByAbbrevAndChapter(abbrev, chapterNum),
  ]);

  if (!book) redirect("/");

  const tutorialAlreadyCompleted =
    session?.user?.tutorialsCompleted?.includes(CHAPTER_TUTORIAL_NAME) ?? false;

  // Pre-compute comment counts and the optional "already read" check in
  // parallel. Counts are surfaced as initial props so ChapterClient renders
  // verse badges + title-comments counter on first paint instead of after
  // an axios round-trip from a mount-time useEffect.
  const verseIds = verses.map((v) => v._id).filter((id): id is string => !!id);
  const userId = session?.user?.id ?? null;
  const [{ countMap, titleCount }, readChapters] = await Promise.all([
    commentRepo.countsForChapter(verseIds),
    userId
      ? new MongoUserChapterReadRepository().findChaptersForBook(userId, abbrev)
      : Promise.resolve<number[]>([]),
  ]);
  const alreadyRead = readChapters.includes(chapterNum);

  return (
    <ChapterClient
      book={book}
      verses={verses}
      chapter={chapterNum}
      user={session?.user ?? null}
      tutorialAlreadyCompleted={tutorialAlreadyCompleted}
      alreadyRead={alreadyRead}
      initialCountMap={countMap}
      initialTitleCount={titleCount}
    />
  );
}
