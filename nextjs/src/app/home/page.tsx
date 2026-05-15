import { auth } from "@/lib/auth";
import { MongoBookRepository } from "@/infrastructure/repositories/MongoBookRepository";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { MongoCommentLikeRepository } from "@/infrastructure/repositories/MongoCommentLikeRepository";
import { MongoVerseRepository } from "@/infrastructure/repositories/MongoVerseRepository";
import { MongoUserChapterReadRepository } from "@/infrastructure/repositories/MongoUserChapterReadRepository";
import { GetAllBooksUseCase } from "@/application/use-cases/BookUseCases";
import { GetRecentFeedUseCase } from "@/application/use-cases/FeedUseCases";
import HomeClient from "./HomeClient";

const INITIAL_FEED_LIMIT = 10;

export default async function HomePage() {
  const session = await auth();
  const booksUseCase = new GetAllBooksUseCase(new MongoBookRepository());

  // The book grid is public. Anonymous visitors get only the (cached) books
  // — the social feed and per-user read tints require an account, so we
  // skip those queries and let HomeClient render the create-account CTA.
  if (!session?.user) {
    const books = await booksUseCase.execute();
    return <HomeClient books={books} user={null} />;
  }

  const recentUseCase = new GetRecentFeedUseCase(
    new MongoCommentRepository(),
    new MongoCommentLikeRepository(),
    new MongoVerseRepository(),
  );
  const readRepo = new MongoUserChapterReadRepository();

  // Books are cached via unstable_cache so the parallel fan-out is cheap on
  // warm renders; the recent feed query is what we actually save a hop on by
  // running it here instead of from a client-side useEffect after hydration.
  const [books, recent, readCountByBook] = await Promise.all([
    booksUseCase.execute(),
    recentUseCase.execute({ cursor: null, limit: INITIAL_FEED_LIMIT }),
    readRepo.countByUserPerBook(session.user.id),
  ]);

  // Use-case returns Date instances; the client component types cursors as
  // ISO strings, so normalize here at the wire boundary.
  const initialRecent = {
    items: recent.items,
    nextCursor: recent.nextCursor
      ? { createdAt: recent.nextCursor.createdAt.toISOString(), id: recent.nextCursor.id }
      : null,
  };

  return (
    <HomeClient
      books={books}
      user={session.user}
      initialRecent={initialRecent}
      readCountByBook={readCountByBook}
    />
  );
}
