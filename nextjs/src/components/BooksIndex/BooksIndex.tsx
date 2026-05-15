"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNotification } from "@/contexts/NotificationContext";
import { Book } from "@/domain/entities/Book";
import { getReadingForDate } from "@/lib/reading-plan";
import axios from "axios";

interface Props {
  initialBooks?: Book[];
  onChangeChapter?: (abbrev: string, chapter: number) => boolean | void;
  closeBookComponent?: () => void;
}

type ColumnGroup = { label: string; groups: string[] };

const AT_COLUMNS: ColumnGroup[] = [
  { label: "Pentateuco",         groups: ["Pentateuco"] },
  { label: "Históricos",         groups: ["Históricos"] },
  { label: "Poéticos",           groups: ["Poéticos"] },
  { label: "Proféticos Maiores", groups: ["Profetas Maiores"] },
  { label: "Proféticos Menores", groups: ["Profetas Menores"] },
];

const NT_COLUMNS: ColumnGroup[] = [
  { label: "Evangelhos e Atos",  groups: ["Evangelhos", "Atos"] },
  { label: "Epístolas de Paulo", groups: ["Cartas Paulinas"] },
  { label: "Epístolas Gerais",   groups: ["Hebreus", "Cartas Gerais"] },
  { label: "Profecia",           groups: ["Apocalipse"] },
];

export default function BooksIndex({ initialBooks, onChangeChapter, closeBookComponent }: Props) {
  const router = useRouter();
  const { handleNotification } = useNotification();
  const [books, setBooks] = useState<Book[]>(initialBooks ?? []);
  const [query, setQuery] = useState("");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Today's chapter according to the Reavivados Por Sua Palavra plan. Set
  // inside an effect (not at render time) so SSR and the first client paint
  // agree; the badge is purely a client-side enhancement.
  const [todayAbbrev, setTodayAbbrev] = useState<string | null>(null);
  const [todayChapter, setTodayChapter] = useState<number | null>(null);
  const [todayBookName, setTodayBookName] = useState<string | null>(null);
  const [todayCycleLabel, setTodayCycleLabel] = useState<string | null>(null);
  useEffect(() => {
    // Try the runtime override stored in AppConfig (a moderator can edit
    // /api/config/reading-plan if RPSP slips). Fall back to the compiled
    // default — getReadingForDate without an anchor uses DEFAULT_ANCHOR.
    let cancelled = false;
    const apply = (anchor?: { anchorDateUtc: number; anchorIndex: number }) => {
      if (cancelled) return;
      const r = anchor
        ? getReadingForDate(new Date(), anchor)
        : getReadingForDate(new Date());
      setTodayAbbrev(r.abbrev);
      setTodayChapter(r.chapter);
      setTodayBookName(r.bookName);
      setTodayCycleLabel(r.cycleLabel);
    };
    fetch("/api/config/reading-plan")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (
          data &&
          typeof data.anchorDateUtc === "number" &&
          typeof data.anchorIndex === "number"
        ) {
          apply({ anchorDateUtc: data.anchorDateUtc, anchorIndex: data.anchorIndex });
        } else {
          apply();
        }
      })
      .catch(() => apply());
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (books.length === 0) {
      axios.get<Book[]>("/api/books")
        .then(({ data }) => setBooks(data))
        .catch(() => handleNotification("error", "Erro ao carregar livros."));
    }
  }, [handleNotification, books.length]);

  useEffect(() => {
    // preventScroll: BooksIndex is mounted both inside the books modal
    // (where the modal sits in the viewport already) AND inline at the
    // bottom of the home page. Without preventScroll, the home-page mount
    // would jump the user past the hero on initial load.
    searchRef.current?.focus({ preventScroll: true });
  }, []);

  const bookMap = useMemo(() => {
    const m: Record<string, Book[]> = {};
    books.forEach((b) => {
      (m[b.group] ??= []).push(b);
    });
    return m;
  }, [books]);

  const filteredBooks = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase().trim();
    return books.filter((b) => b.name.toLowerCase().includes(q) || b.abbrev.toLowerCase().includes(q));
  }, [books, query]);

  const handleBookClick = useCallback((book: Book) => {
    if (selectedBook?.abbrev === book.abbrev) {
      setSelectedBook(null);
    } else {
      setSelectedBook(book);
    }
  }, [selectedBook]);

  const handleChapterClick = useCallback((chapter: number) => {
    if (!selectedBook) return;
    const abbrev = selectedBook.abbrev;
    if (onChangeChapter) {
      const changed = onChangeChapter(abbrev, chapter);
      if (changed) {
        closeBookComponent?.();
        window.history.replaceState(null, "", `/verses/${abbrev}/${chapter}`);
      }
    } else {
      router.push(`/verses/${abbrev}/${chapter}`);
      closeBookComponent?.();
    }
  }, [selectedBook, onChangeChapter, closeBookComponent, router]);

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (filteredBooks && filteredBooks.length === 1) {
      setSelectedBook(filteredBooks[0]);
      setQuery("");
    }
  }, [filteredBooks]);

  function renderBookItem(book: Book) {
    const isToday = todayAbbrev === book.abbrev;
    const isSelected = selectedBook?.abbrev === book.abbrev;
    return (
      <button
        key={book.abbrev}
        type="button"
        onClick={() => handleBookClick(book)}
        data-today={isToday ? "true" : undefined}
        title={isToday ? `Leitura de hoje pelo Reavivados Por Sua Palavra: ${book.name} ${todayChapter}` : undefined}
        className="flex items-center gap-[5px] w-full rounded-[4px] min-h-[27.5px] transition-colors text-left px-1.5 py-1 hover:bg-slate-50 dark:hover:bg-slate-800 group"
      >
        <span
          className={`w-[5px] h-[5px] rounded-[2.5px] flex-shrink-0 ${
            isSelected
              ? "bg-brand"
              : isToday
                ? "bg-orange-400"
                : "bg-transparent border border-slate-200 dark:border-slate-700"
          }`}
        />
        <span
          className={`text-[13px] leading-[19.5px] truncate transition-colors ${
            isSelected ? "text-brand font-semibold" : isToday ? "text-orange-700 dark:text-orange-300 font-semibold" : "text-[#333] dark:text-slate-100 font-normal"
          }`}
        >
          {book.name}
        </span>
        {isToday && todayChapter !== null && (
          <span className="ml-auto flex-shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300">
            cap {todayChapter}
          </span>
        )}
      </button>
    );
  }

  function renderColumn(col: ColumnGroup) {
    const colBooks = col.groups.flatMap((g) => bookMap[g] ?? []);
    if (colBooks.length === 0) return null;
    return (
      <div key={col.label} className="flex flex-col gap-[6px] min-w-[110px] flex-1">
        <div className="border-b border-[#f1f5f9] dark:border-slate-800 pb-[5px]">
          <p className="text-[10px] font-semibold text-[#a0aec0] dark:text-slate-500 uppercase tracking-[1px] whitespace-nowrap">
            {col.label}
          </p>
        </div>
        <div className="flex flex-col gap-px">
          {colBooks.map(renderBookItem)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-[900px]">
      <div className="flex items-center gap-3 px-5 py-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" aria-hidden="true">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <form onSubmit={handleSearchSubmit} className="flex-1">
          <label htmlFor="books-index-search" className="sr-only">
            Buscar livro
          </label>
          <input
            id="books-index-search"
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedBook(null); }}
            placeholder="Busque um livro, capítulo ou palavra-chave…"
            className="w-full text-[17px] text-[#1a1a1a] dark:text-slate-100 placeholder:text-[rgba(26,26,26,0.5)] dark:placeholder:text-slate-500 outline-none bg-transparent"
          />
        </form>
        {(query || closeBookComponent) && (
          <button
            type="button"
            onClick={() => {
              if (query) { setQuery(""); setSelectedBook(null); searchRef.current?.focus(); }
              else closeBookComponent?.();
            }}
            aria-label={query ? "Limpar busca" : "Fechar"}
            className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition flex-shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      <div className="h-px bg-[#e2e8f0] dark:bg-slate-700 mx-0" />

      {/* Leitura do dia (RPSP) — banner clicável que destaca o livro/cap
          do dia. Só aparece depois que o useEffect hidrata, evitando
          mismatch entre SSR e CSR ao redor da virada do dia UTC. */}
      {todayAbbrev && todayChapter && (
        <Link
          href={`/verses/${todayAbbrev}/${todayChapter}`}
          onClick={() => closeBookComponent?.()}
          data-testid="reading-plan-today"
          className="flex items-center gap-3 px-5 py-3 mx-0 border-b border-[#e2e8f0] dark:border-slate-700 bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-950/40 transition no-underline"
        >
          <span
            aria-hidden="true"
            className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-400/15 dark:bg-orange-400/10 text-orange-600 dark:text-orange-300 flex items-center justify-center"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </span>
          <span className="flex flex-col min-w-0 flex-1">
            <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wide">
              Reavivados Por Sua Palavra
            </span>
            <span className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 truncate">
              Leitura de hoje: {todayBookName} {todayChapter}
            </span>
          </span>
          {todayCycleLabel && (
            <span className="hidden sm:block flex-shrink-0 text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {todayCycleLabel}
            </span>
          )}
        </Link>
      )}

      <div className="flex-1 overflow-y-auto">
        {selectedBook ? (
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={() => setSelectedBook(null)}
                aria-label="Voltar para lista de livros"
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-[15px]">{selectedBook.name}</h3>
              <span className="text-slate-400 dark:text-slate-500 text-sm">— Escolha o capítulo</span>
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
              {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => handleChapterClick(ch)}
                  className="text-center text-sm py-2 rounded-lg border border-[#e2e8f0] dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium hover:border-[#137ddb] hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-[#137ddb] transition"
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>
        ) : filteredBooks ? (
          <div className="p-5">
            {filteredBooks.length === 0 ? (
              <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-6">Nenhum livro encontrado para &ldquo;{query}&rdquo;</p>
            ) : (
              <div className="flex flex-col gap-1">
                {filteredBooks.map((book) => (
                  <button
                    key={book.abbrev}
                    type="button"
                    onClick={() => { setQuery(""); handleBookClick(book); }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#f7fafc] dark:hover:bg-slate-800 transition text-left"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-sm flex-shrink-0 ${
                        todayAbbrev === book.abbrev ? "bg-orange-400" : "bg-slate-200 dark:bg-slate-700"
                      }`}
                    />
                    <span className="text-[14px] text-slate-700 dark:text-slate-200 font-medium">{book.name}</span>
                    <span className="text-[12px] text-slate-400 dark:text-slate-500 ml-auto">{book.chapters} capítulos</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="px-5 py-5 flex flex-col gap-[20px] overflow-x-auto">
            <div className="flex flex-col gap-[14px]">
              <p className="text-[10px] font-bold text-[#cbd5e0] dark:text-slate-500 uppercase tracking-[1.2px]">Antigo Testamento</p>
              <div className="flex gap-4 md:gap-8 flex-wrap">
                {AT_COLUMNS.map(renderColumn)}
              </div>
            </div>

            <div className="flex flex-col gap-[14px]">
              <p className="text-[10px] font-bold text-[#cbd5e0] dark:text-slate-500 uppercase tracking-[1.2px]">Novo Testamento</p>
              <div className="flex gap-4 md:gap-8 flex-wrap">
                {NT_COLUMNS.map(renderColumn)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
