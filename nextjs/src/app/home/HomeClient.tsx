"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Book } from "@/domain/entities/Book";
import { AppHeader } from "@/components/AppHeader";
import ChapterPickerDialog from "./ChapterPickerDialog";
import {
  feedService,
  type FeedComment,
  type FeedCursor,
  type DiscussionFeedItem,
} from "@/services/feed";

interface Props {
  books: Book[];
  user: { name: string; email: string; username: string; moderator: boolean };
  /**
   * Server-rendered first page of the "recent" feed. When provided, the
   * default tab paints with content on first byte and skips the mount-time
   * axios fetch. Other tabs (popular, discussions) stay lazy because users
   * typically don't visit them on every page load.
   */
  initialRecent?: { items: FeedComment[]; nextCursor: FeedCursor | null };
  /**
   * Map of book abbrev → number of chapters the current user has marked
   * as read. Used to tint each book card (none / partial / complete).
   * Books absent from the map are treated as 0.
   */
  readCountByBook?: Record<string, number>;
}

type ReadTier = "none" | "partial" | "complete";

function readTier(read: number, total: number): ReadTier {
  if (read <= 0) return "none";
  if (read >= total) return "complete";
  return "partial";
}

const BOOK_CARD_TIER_CLASS: Record<ReadTier, string> = {
  none:
    "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700",
  partial:
    "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50",
  complete:
    "bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-700",
};

const testamentLabels: Record<string, string> = {
  VT: "Velho Testamento",
  NT: "Novo Testamento",
};

type Tab = "recent" | "popular" | "discussions";

const TAB_LABEL: Record<Tab, string> = {
  recent: "Recentes",
  popular: "Populares (7d)",
  discussions: "Discussões ativas",
};

function dateFormat(d?: string | Date | null) {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "";
  return dt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function CommentCard({ c }: { c: FeedComment }) {
  return (
    <article className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
        <Link
          href={`/u/${c.username}`}
          className="font-semibold text-slate-800 dark:text-slate-100 hover:underline"
        >
          @{c.username}
        </Link>
        {c.bookReference && (
          <span className="inline-flex items-center bg-brand-tint rounded px-2 h-5 font-bold text-brand whitespace-nowrap">
            {c.bookReference}
          </span>
        )}
        {c.verified && (
          <span
            className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full px-2 h-5 text-[11px] font-semibold"
            title={c.verifiedBy ? `Verificado por @${c.verifiedBy}` : "Verificado"}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Verificado
          </span>
        )}
        <span className="ml-auto text-slate-400 dark:text-slate-500">
          {dateFormat(c.createdAt)}
        </span>
      </div>
      <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed line-clamp-4 whitespace-pre-wrap">
        {c.text}
      </p>
      <div className="mt-3 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          {c.likeCount ?? 0}
        </span>
        {c.link && (
          <Link
            href={`/verses/${c.link.abbrev}/${c.link.chapter}#${c.link.verseNumber}`}
            className="ml-auto text-brand hover:underline"
          >
            Ler em contexto →
          </Link>
        )}
      </div>
    </article>
  );
}

function DiscussionCard({ d }: { d: DiscussionFeedItem }) {
  return (
    <article className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
        <Link
          href={`/u/${d.username}`}
          className="font-semibold text-slate-800 dark:text-slate-100 hover:underline"
        >
          @{d.username}
        </Link>
        {d.verseReference && (
          <span className="inline-flex items-center bg-brand-tint rounded px-2 h-5 font-bold text-brand whitespace-nowrap">
            {d.verseReference}
          </span>
        )}
        <span className="inline-flex items-center bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full px-2 h-5 text-[11px] font-semibold">
          {d.answerCount} resposta{d.answerCount !== 1 ? "s" : ""}
        </span>
        <span className="ml-auto text-slate-400 dark:text-slate-500">
          última: {dateFormat(d.lastAnswerAt)}
        </span>
      </div>
      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-snug line-clamp-2 mb-1">
        {d.question}
      </p>
      {d.commentText && (
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 italic">
          “{d.commentText}”
        </p>
      )}
      <div className="mt-3 text-right">
        <Link
          href={`/discussion/${d.bookAbbrev}/${d._id}`}
          className="text-xs text-brand hover:underline"
        >
          Abrir discussão →
        </Link>
      </div>
    </article>
  );
}

function FeedSection({
  initialRecent,
}: {
  initialRecent?: { items: FeedComment[]; nextCursor: FeedCursor | null };
}) {
  const [tab, setTab] = useState<Tab>("recent");

  const [recent, setRecent] = useState<FeedComment[]>(initialRecent?.items ?? []);
  const [recentCursor, setRecentCursor] = useState<FeedCursor | null>(initialRecent?.nextCursor ?? null);
  const [recentLoaded, setRecentLoaded] = useState(!!initialRecent);

  const [popular, setPopular] = useState<FeedComment[]>([]);
  const [popularLoaded, setPopularLoaded] = useState(false);

  const [discussions, setDiscussions] = useState<DiscussionFeedItem[]>([]);
  const [discussionsLoaded, setDiscussionsLoaded] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRecent = useCallback(async (cursor?: FeedCursor | null) => {
    setLoading(true);
    setError(null);
    try {
      const page = await feedService.recent({ cursor });
      setRecent((prev) => (cursor ? [...prev, ...page.items] : page.items));
      setRecentCursor(page.nextCursor);
      setRecentLoaded(true);
    } catch {
      setError("Erro ao carregar o feed.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPopular = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { items } = await feedService.popular({ windowDays: 7, limit: 10 });
      setPopular(items);
      setPopularLoaded(true);
    } catch {
      setError("Erro ao carregar populares.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDiscussions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { items } = await feedService.discussions({ limit: 10 });
      setDiscussions(items);
      setDiscussionsLoaded(true);
    } catch {
      setError("Erro ao carregar discussões.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "recent" && !recentLoaded) loadRecent(null);
    if (tab === "popular" && !popularLoaded) loadPopular();
    if (tab === "discussions" && !discussionsLoaded) loadDiscussions();
  }, [tab, recentLoaded, popularLoaded, discussionsLoaded, loadRecent, loadPopular, loadDiscussions]);

  return (
    <section className="mb-10">
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          Atividade da comunidade
        </h2>
      </div>

      <div role="tablist" aria-label="Filtros do feed" className="flex flex-wrap gap-2 mb-4">
        {(["recent", "popular", "discussions"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
              tab === t
                ? "bg-brand text-white"
                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 rounded-lg p-3 text-sm mb-3">
          {error}
        </div>
      )}

      {tab === "recent" && (
        <>
          {recent.length === 0 && recentLoaded && !loading ? (
            <EmptyState text="Nenhum comentário ainda." />
          ) : (
            <div className="flex flex-col gap-3">
              {recent.map((c) => (
                <CommentCard key={c._id} c={c} />
              ))}
              {recentCursor && (
                <div className="flex justify-center mt-2">
                  <button
                    type="button"
                    onClick={() => loadRecent(recentCursor)}
                    disabled={loading}
                    className="text-sm font-semibold px-4 py-2 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
                  >
                    {loading ? "Carregando…" : "Carregar mais"}
                  </button>
                </div>
              )}
              {!recentLoaded && loading && <Loading />}
            </div>
          )}
        </>
      )}

      {tab === "popular" && (
        <>
          {popular.length === 0 && popularLoaded && !loading ? (
            <EmptyState text="Nenhum comentário ganhou likes nos últimos 7 dias." />
          ) : (
            <div className="flex flex-col gap-3">
              {popular.map((c) => (
                <CommentCard key={c._id} c={c} />
              ))}
              {!popularLoaded && loading && <Loading />}
            </div>
          )}
        </>
      )}

      {tab === "discussions" && (
        <>
          {discussions.length === 0 && discussionsLoaded && !loading ? (
            <EmptyState text="Nenhuma discussão ativa no momento." />
          ) : (
            <div className="flex flex-col gap-3">
              {discussions.map((d) => (
                <DiscussionCard key={d._id} d={d} />
              ))}
              {!discussionsLoaded && loading && <Loading />}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Loading() {
  return <div className="text-center text-slate-400 py-6 text-sm">Carregando…</div>;
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center text-sm text-slate-500 dark:text-slate-400">
      {text}
    </div>
  );
}

export default function HomeClient({ books, user, initialRecent, readCountByBook }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "VT" | "NT">("all");
  const [pickerBook, setPickerBook] = useState<Book | null>(null);

  const filtered = books.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.abbrev.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || b.testament === filter;
    return matchesSearch && matchesFilter;
  });

  const grouped: Record<string, Book[]> = {};
  for (const book of filtered) {
    if (!grouped[book.group]) grouped[book.group] = [];
    grouped[book.group].push(book);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <AppHeader user={user} />

      <main id="main-content" className="max-w-6xl mx-auto px-4 py-6">
        <FeedSection initialRecent={initialRecent} />

        <section>
          <div className="flex items-baseline gap-3 mb-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Livros</h2>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <label htmlFor="home-book-search" className="sr-only">
              Buscar livro
            </label>
            <input
              id="home-book-search"
              type="text"
              placeholder="Buscar livro..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <div className="flex gap-2">
              {(["all", "VT", "NT"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    filter === t
                      ? "bg-blue-600 text-white"
                      : "bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700"
                  }`}
                >
                  {t === "all" ? "Todos" : testamentLabels[t]}
                </button>
              ))}
            </div>
          </div>

          {Object.keys(grouped).map((group) => (
            <div key={group} className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                {group}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {grouped[group].map((book) => {
                  const readCount = readCountByBook?.[book.abbrev] ?? 0;
                  const tier = readTier(readCount, book.chapters);
                  return (
                    <button
                      key={book.abbrev}
                      type="button"
                      onClick={() => setPickerBook(book)}
                      data-testid={`book-${book.abbrev}`}
                      data-read-tier={tier}
                      title={
                        readCount > 0
                          ? `${readCount}/${book.chapters} capítulos lidos`
                          : undefined
                      }
                      className={`text-left border rounded-lg p-3 hover:border-blue-400 dark:hover:border-brand hover:shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${BOOK_CARD_TIER_CLASS[tier]}`}
                    >
                      <div className="text-xs text-gray-400 dark:text-slate-500 uppercase mb-1">
                        {book.abbrev}
                      </div>
                      <div className="text-sm font-medium text-gray-800 dark:text-slate-100 leading-tight">
                        {book.name}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                        {readCount > 0 ? `${readCount}/${book.chapters} cap.` : `${book.chapters} cap.`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <p className="text-center text-gray-400 dark:text-slate-500 py-10">
              Nenhum livro encontrado.
            </p>
          )}
        </section>
      </main>

      <ChapterPickerDialog book={pickerBook} onClose={() => setPickerBook(null)} />
    </div>
  );
}
