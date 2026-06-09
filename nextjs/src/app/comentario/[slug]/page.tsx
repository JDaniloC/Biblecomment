import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MongoBookRepository } from "@/infrastructure/repositories/MongoBookRepository";
import { MongoDiscussionRepository } from "@/infrastructure/repositories/MongoDiscussionRepository";
import { resolveBookBySlug, testamentLabel } from "@/lib/book-slug";

// Rendered per request so newly-posted discussions appear immediately and the
// page reflects the current book corpus. Book facts stay cheap via the repo's
// 24h Data Cache; only one indexed discussion query runs per request. Mirrors
// sitemap.ts's force-dynamic approach to DB-backed freshness.
export const dynamic = "force-dynamic";

type Params = { slug: string };

function baseUrl(): string {
  return (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const books = await new MongoBookRepository().findAll();
    const book = resolveBookBySlug(slug, books);
    if (!book) return { title: "Livro não encontrado" };

    const title = `Comentário bíblico de ${book.name}`;
    const description = `Comentário bíblico de ${book.name}: leia os ${book.chapters} capítulos com comentários e discussões da comunidade no Bible Comment.`;
    const url = `/comentario/${slug}`;
    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: { title, description, type: "article", url, locale: "pt_BR" },
      twitter: { card: "summary", title, description },
    };
  } catch {
    return { title: "Comentário bíblico" };
  }
}

export default async function CommentaryBookPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;

  const books = await new MongoBookRepository().findAll();
  const book = resolveBookBySlug(slug, books);
  if (!book) notFound();

  // Top 8 most-active discussions, limited at the DB level (a popular book can
  // accumulate thousands — never fetch the whole collection just to slice 8).
  const topDiscussions = await new MongoDiscussionRepository()
    .findByBookAbbrevPaginated(book.abbrev, 1, 8, "active")
    .catch(() => []);

  const base = baseUrl();
  const intro = book.comment?.trim()
    ? book.comment
    : `${book.name} é um livro do grupo ${book.group} (${testamentLabel(
        book.testament,
      )}), atribuído a ${book.author}, com ${book.chapters} capítulos. Leia e comente cada capítulo abaixo.`;

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: `${base}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Comentário bíblico",
        item: `${base}/comentario`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: book.name,
        item: `${base}/comentario/${slug}`,
      },
    ],
  };

  return (
    <main
      id="main-content"
      className="max-w-4xl mx-auto px-4 py-10"
      data-testid="commentary-hub"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <nav
        aria-label="Trilha de navegação"
        className="text-sm text-stone-500 dark:text-stone-400 mb-4"
      >
        <Link href="/" className="hover:underline">
          Início
        </Link>
        {" › "}
        <Link href="/comentario" className="hover:underline">
          Comentário bíblico
        </Link>
        {" › "}
        <span className="text-stone-700 dark:text-stone-200">{book.name}</span>
      </nav>

      <h1 className="font-lora text-3xl md:text-4xl font-bold text-stone-800 dark:text-stone-100">
        Comentário bíblico de {book.name}
      </h1>
      <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
        {book.author} · {book.group} · {testamentLabel(book.testament)} ·{" "}
        {book.chapters} capítulos
      </p>

      <p className="mt-6 text-stone-600 dark:text-stone-300 leading-relaxed">
        {intro}
      </p>

      <section className="mt-8">
        <h2 className="font-lora text-xl font-bold text-stone-800 dark:text-stone-100 mb-3">
          Capítulos de {book.name}
        </h2>
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
          {Array.from({ length: book.chapters }, (_, i) => i + 1).map((ch) => (
            <Link
              key={ch}
              href={`/verses/${book.abbrev}/${ch}`}
              data-testid={`hub-chapter-${ch}`}
              className="text-center text-sm py-2 rounded-lg border border-stone-200 dark:border-slate-700 text-stone-600 dark:text-slate-300 font-medium hover:border-brand hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-brand transition"
            >
              {ch}
            </Link>
          ))}
        </div>
      </section>

      {topDiscussions.length > 0 && (
        <section className="mt-10">
          <h2 className="font-lora text-xl font-bold text-stone-800 dark:text-stone-100 mb-3">
            Discussões de {book.name}
          </h2>
          <ul className="space-y-3">
            {topDiscussions.map((d) => (
              <li key={d._id}>
                <Link
                  href={`/discussion/${book.abbrev}/${d._id}`}
                  className="block rounded-xl border border-stone-200 dark:border-slate-700 p-4 hover:border-brand/40 transition"
                >
                  {/* title defaults to "" in toEntity when absent — fall back
                      to the opening question for legacy threads. */}
                  <p className="font-semibold text-stone-800 dark:text-stone-100">
                    {d.title || d.question}
                  </p>
                  <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                    {d.verseReference} · {d.answersCount ?? 0} respostas ·{" "}
                    {d.likeCount ?? 0} curtidas
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
