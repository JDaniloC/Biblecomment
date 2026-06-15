"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChapterReader } from "@/components/ChapterReader/ChapterReader";
import { getChapter, type ChapterVerse } from "@/lib/offline/bibleStore";
import { Verse } from "@/domain/entities/Verse";
import { parseChapterPath } from "./parseChapterPath";

// Map the compact stored shape { n, t } back to the Verse shape ChapterReader
// renders. No _id offline (comments aren't available), so selection/badges are
// inert — exactly what we want for the dataset-only view.
function toVerses(abbrev: string, chapter: number, stored: ChapterVerse[]): Verse[] {
  return stored.map((v) => ({
    abbrev,
    chapter,
    verseNumber: v.n,
    text: v.t,
  }));
}

// Resolve the book's display name from the cached /api/books list (the SW
// serves it from cache while offline). Returns null on any miss/error so the
// title degrades gracefully to the abbreviation.
async function resolveBookName(abbrev: string): Promise<string | null> {
  try {
    const res = await fetch("/api/books");
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const books = Array.isArray(data)
      ? (data as { abbrev: string; name?: string }[])
      : ((data as { books?: { abbrev: string; name?: string }[] }).books ?? []);
    return books.find((b) => b.abbrev === abbrev)?.name ?? null;
  } catch {
    return null;
  }
}

type LoadState =
  | { kind: "loading" }
  | {
      kind: "ready";
      abbrev: string;
      chapter: number;
      bookName: string | null;
      verses: Verse[];
    }
  | { kind: "unavailable" };

export default function LeituraOfflinePage() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    const target = parseChapterPath(window.location.pathname);
    if (!target) {
      setState({ kind: "unavailable" });
      return;
    }
    Promise.all([
      getChapter(target.abbrev, target.chapter),
      resolveBookName(target.abbrev),
    ])
      .then(([stored, bookName]) => {
        if (cancelled) return;
        if (!stored || stored.length === 0) {
          setState({ kind: "unavailable" });
          return;
        }
        setState({
          kind: "ready",
          abbrev: target.abbrev,
          chapter: target.chapter,
          bookName,
          verses: toVerses(target.abbrev, target.chapter, stored),
        });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "unavailable" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#f9f9f7] dark:bg-slate-950">
      {/* Offline banner */}
      <div
        data-testid="offline-reader-banner"
        className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/50 px-6 py-2.5 text-center"
      >
        <span className="text-[13px] font-semibold text-amber-800 dark:text-amber-200">
          Você está offline — lendo a Bíblia salva no aparelho.
        </span>
      </div>

      <main id="main-content" className="flex-1 overflow-y-auto">
        <div className="max-w-[680px] mx-auto px-6 py-10">
          {state.kind === "loading" && (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-2 border-[#137ddb] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {state.kind === "unavailable" && (
            <div className="text-center py-16">
              <h1 className="font-serif font-bold text-slate-800 dark:text-slate-100 text-2xl mb-3">
                Capítulo indisponível offline
              </h1>
              <p className="text-[14px] text-slate-500 dark:text-slate-400 mb-6">
                Este capítulo ainda não foi baixado. Conecte-se à internet para
                lê-lo e sincronizar a Bíblia para leitura offline.
              </p>
              <Link
                href="/"
                className="text-sm px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition text-gray-600 dark:text-slate-300"
              >
                Voltar para os livros
              </Link>
            </div>
          )}

          {state.kind === "ready" && (
            <>
              <h1 className="font-serif font-bold text-slate-800 dark:text-slate-100 tracking-[1.9px] uppercase text-[clamp(24px,4vw,38px)] text-center mt-2 mb-6">
                {state.bookName ?? state.abbrev.toUpperCase()} {state.chapter}
              </h1>

              <ChapterReader
                abbrev={state.abbrev}
                chapter={state.chapter}
                verses={state.verses}
              />

              <p
                data-testid="comments-online-note"
                className="mt-10 text-center text-[13px] text-slate-400 dark:text-slate-500"
              >
                Comentários disponíveis quando você estiver online.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
