import type { Metadata } from "next";
import Link from "next/link";
import { MongoBookRepository } from "@/infrastructure/repositories/MongoBookRepository";
import type { Book } from "@/domain/entities/Book";
import { bookSlug, testamentLabel } from "@/lib/book-slug";

// Rendered per request so the list reflects the current book corpus (and, in
// tests, the freshly-seeded DB rather than the build-time snapshot). The book
// list itself stays cheap via the repo's 24h Data Cache. Mirrors sitemap.ts.
export const dynamic = "force-dynamic";

function baseUrl(): string {
  return (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export const metadata: Metadata = {
  title: "Bíblia comentada — comentário bíblico de todos os livros",
  description:
    "Bíblia comentada online: comentário bíblico de cada livro da Bíblia, com discussões e estudos bíblicos da comunidade no Bible Comment.",
  alternates: { canonical: "/comentario" },
  openGraph: {
    title: "Bíblia comentada — comentário bíblico de todos os livros",
    description:
      "Comentário bíblico de todos os livros da Bíblia, com discussões e estudos da comunidade.",
    type: "website",
    url: "/comentario",
    locale: "pt_BR",
  },
};

// Antigo Testamento first, then Novo; any unexpected code falls to the end.
const TESTAMENT_ORDER = ["VT", "NT"];

export default async function CommentaryIndexPage() {
  const books = await new MongoBookRepository().findAll().catch(() => [] as Book[]);

  const byTestament = new Map<string, Book[]>();
  for (const b of books) {
    const arr = byTestament.get(b.testament) ?? [];
    arr.push(b);
    byTestament.set(b.testament, arr);
  }
  const orderedTestaments = [
    ...TESTAMENT_ORDER.filter((t) => byTestament.has(t)),
    ...[...byTestament.keys()].filter((t) => !TESTAMENT_ORDER.includes(t)),
  ];

  const base = baseUrl();
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
    ],
  };

  return (
    <main
      id="main-content"
      className="max-w-4xl mx-auto px-4 py-10"
      data-testid="commentary-index"
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
        <span className="text-stone-700 dark:text-stone-200">
          Comentário bíblico
        </span>
      </nav>

      <h1 className="font-lora text-3xl md:text-4xl font-bold text-stone-800 dark:text-stone-100">
        Bíblia comentada — comentário bíblico de todos os livros
      </h1>
      <p className="mt-4 text-stone-600 dark:text-stone-300 leading-relaxed">
        Explore o comentário bíblico de cada livro da Bíblia. Leia os capítulos,
        veja os comentários e participe das discussões e estudos bíblicos da
        comunidade.
      </p>

      {orderedTestaments.map((t) => (
        <section key={t} className="mt-8">
          <h2 className="font-lora text-xl font-bold text-stone-800 dark:text-stone-100 mb-3">
            {testamentLabel(t)}
          </h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(byTestament.get(t) ?? []).map((b) => (
              <li key={b.abbrev}>
                <Link
                  href={`/comentario/${bookSlug(b.name)}`}
                  className="block rounded-lg px-3 py-2 text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 transition"
                >
                  {b.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
