import { auth } from "@/lib/auth";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import BooksIndex from "@/components/BooksIndex/BooksIndex";
import { MongoBookRepository } from "@/infrastructure/repositories/MongoBookRepository";
import { MongoVerseRepository } from "@/infrastructure/repositories/MongoVerseRepository";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { connectToDatabase } from "@/infrastructure/database/connection";
import OmniSearch from "./_components/OmniSearch";
import type { Book } from "@/domain/entities/Book";
import type { Verse } from "@/domain/entities/Verse";
import type { Comment } from "@/domain/entities/Comment";

async function getPageData(): Promise<{
  books: Book[];
  verse: Verse | null;
  comment: Comment | null;
}> {
  try {
    await connectToDatabase();

    const bookRepo  = new MongoBookRepository();
    const verseRepo = new MongoVerseRepository();
    const commRepo  = new MongoCommentRepository();

    const today       = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 0);
    const dayOfYear   = Math.floor((today.getTime() - startOfYear.getTime()) / 86400000);

    const [books, comment] = await Promise.all([
      bookRepo.findAll(),
      commRepo.findDailyFeatured(dayOfYear),
    ]);

    let verse: Verse | null = null;
    if (comment?.verseId) {
      verse = await verseRepo.findById(comment.verseId);
    }

    return { books, verse, comment };
  } catch {
    return { books: [], verse: null, comment: null };
  }
}

function formatReference(verse: Verse): string {
  if (verse.reference) return verse.reference;
  return `${verse.abbrev.toUpperCase()} ${verse.chapter}:${verse.verseNumber}`;
}

export default async function RootPage() {
  const [session, { books, verse, comment }] = await Promise.all([
    auth(),
    getPageData(),
  ]);

  const isLoggedIn = !!session?.user;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-slate-950 flex flex-col">
      <Header />

      {!isLoggedIn && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-900/40">
          <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Crie uma conta gratuita para comentar, favoritar versículos e participar dos debates.
            </p>
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/login"
                className="text-sm font-medium text-amber-900 dark:text-amber-200 hover:underline"
              >
                Entrar
              </Link>
              <Link
                href="/register"
                className="text-sm font-semibold bg-amber-600 text-white px-4 py-1.5 rounded-lg hover:bg-amber-700 transition"
              >
                Cadastrar-se
              </Link>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1">
        <section className="bg-gradient-to-b from-white to-stone-50 dark:from-slate-900 dark:to-slate-950 pt-12 pb-10 px-4">
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-8">
            <h1 className="text-4xl font-bold text-stone-800 dark:text-stone-100 tracking-tight leading-tight">
              Sua Biblioteca Bíblica
            </h1>
            <p className="text-stone-500 dark:text-stone-400 text-lg">
              30.000+ versículos · Comentários · Reflexões
            </p>
          </div>
          <OmniSearch />
        </section>

        {verse && (
          <section className="px-4 pb-10">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-px flex-1 bg-stone-200 dark:bg-slate-700" />
                <span className="text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
                  Versículo do Dia
                </span>
                <div className="h-px flex-1 bg-stone-200 dark:bg-slate-700" />
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-6 md:p-8 shadow-sm">
                <blockquote className="font-lora text-xl md:text-2xl leading-relaxed text-stone-800 dark:text-stone-100 mb-4">
                  &ldquo;{verse.text}&rdquo;
                </blockquote>
                <cite className="block text-sm font-semibold text-amber-700 dark:text-amber-300 not-italic mb-5">
                  — {formatReference(verse)}
                </cite>

                {comment && (
                  <div className="border-t border-amber-200 dark:border-amber-900/40 pt-4">
                    <p className="text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold mb-2">
                      {comment.tags.includes("exegetico")
                        ? "Comentário Exegético"
                        : comment.tags.includes("devocional")
                        ? "Comentário Devocional"
                        : "Comentário em destaque"}
                    </p>
                    <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed line-clamp-4">
                      {comment.text}
                    </p>
                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-2">por {comment.username}</p>
                  </div>
                )}

                <div className="mt-5 flex items-center gap-4 flex-wrap">
                  <Link
                    href={`/verses/${verse.abbrev}/${verse.chapter}#${verse.verseNumber}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-800 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-200 hover:underline transition"
                  >
                    Ler o capítulo completo
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="px-4 pb-16">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-px flex-1 bg-stone-200" />
              <span className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                Navegue pelos Livros
              </span>
              <div className="h-px flex-1 bg-stone-200" />
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-slate-700 shadow-sm p-6">
              <BooksIndex initialBooks={books} />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-6 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-400 dark:text-stone-500">
          <div className="flex items-center gap-2">
            <Image src="/assets/logo.svg" alt="Bible Comment" width={20} height={20} className="opacity-60" />
            <span>Bible Comment &mdash; A Program for His Glory</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/help" className="hover:text-stone-600 dark:hover:text-stone-300 transition">Sobre</Link>
            {isLoggedIn && (
              <Link href="/profile" className="hover:text-stone-600 dark:hover:text-stone-300 transition">Perfil</Link>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
