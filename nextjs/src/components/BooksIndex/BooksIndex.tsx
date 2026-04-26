"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useNotification } from "@/contexts/NotificationContext";
import { Book } from "@/domain/entities/Book";
import api from "@/services/api";

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

const FEATURED = new Set(["gn", "sl", "pv", "jo", "mt", "ef", "ap"]);

export default function BooksIndex({ initialBooks, onChangeChapter, closeBookComponent }: Props) {
  const router = useRouter();
  const { handleNotification } = useNotification();
  const [books, setBooks] = useState<Book[]>(initialBooks ?? []);
  const [query, setQuery] = useState("");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (books.length === 0) {
      api.get<Book[]>("/books")
        .then(({ data }) => setBooks(data))
        .catch(() => handleNotification("error", "Erro ao carregar livros."));
    }
  }, [handleNotification, books.length]);

  useEffect(() => {
    searchRef.current?.focus();
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
    const featured = FEATURED.has(book.abbrev);
    const isSelected = selectedBook?.abbrev === book.abbrev;
    return (
      <button
        key={book.abbrev}
        type="button"
        onClick={() => handleBookClick(book)}
        className="flex items-center gap-[5px] w-full rounded-[4px] transition-colors text-left px-[6px] py-[4px] hover:bg-[#f7fafc] group"
        style={{ minHeight: "27.5px" }}
      >
        <span
          className="rounded-[2.5px] flex-shrink-0"
          style={{
            width: 5,
            height: 5,
            background: isSelected ? "#137ddb" : featured ? "#ed8936" : "transparent",
            border: isSelected || featured ? "none" : "1px solid #e2e8f0",
          }}
        />
        <span
          className="text-[13px] leading-[19.5px] truncate transition-colors"
          style={{
            color: isSelected ? "#137ddb" : "#333",
            fontWeight: isSelected ? 600 : featured ? 600 : 400,
          }}
        >
          {book.name}
        </span>
      </button>
    );
  }

  function renderColumn(col: ColumnGroup) {
    const colBooks = col.groups.flatMap((g) => bookMap[g] ?? []);
    if (colBooks.length === 0) return null;
    return (
      <div key={col.label} className="flex flex-col gap-[6px] min-w-[130px]">
        <div className="border-b border-[#f1f5f9] pb-[5px]">
          <p className="text-[10px] font-semibold text-[#a0aec0] uppercase tracking-[1px] whitespace-nowrap">
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
    <div className="flex flex-col" style={{ width: "min(900px, 95vw)" }}>
      <div className="flex items-center gap-3 px-5 py-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <form onSubmit={handleSearchSubmit} className="flex-1">
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedBook(null); }}
            placeholder="Busque um livro, capítulo ou palavra-chave…"
            className="w-full text-[17px] text-[#1a1a1a] placeholder:text-[rgba(26,26,26,0.5)] outline-none bg-transparent"
          />
        </form>
        {(query || closeBookComponent) && (
          <button
            type="button"
            onClick={() => {
              if (query) { setQuery(""); setSelectedBook(null); searchRef.current?.focus(); }
              else closeBookComponent?.();
            }}
            className="text-slate-400 hover:text-slate-600 transition flex-shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      <div className="h-px bg-[#e2e8f0] mx-0" />

      <div className="flex-1 overflow-y-auto">
        {selectedBook ? (
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={() => setSelectedBook(null)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <h3 className="font-semibold text-slate-800 text-[15px]">{selectedBook.name}</h3>
              <span className="text-slate-400 text-sm">— Escolha o capítulo</span>
            </div>
            <div className="grid grid-cols-8 gap-1.5">
              {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => handleChapterClick(ch)}
                  className="text-center text-sm py-2 rounded-lg border border-[#e2e8f0] text-slate-600 font-medium hover:border-[#137ddb] hover:bg-blue-50 hover:text-[#137ddb] transition"
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>
        ) : filteredBooks ? (
          <div className="p-5">
            {filteredBooks.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">Nenhum livro encontrado para &ldquo;{query}&rdquo;</p>
            ) : (
              <div className="flex flex-col gap-1">
                {filteredBooks.map((book) => (
                  <button
                    key={book.abbrev}
                    type="button"
                    onClick={() => { setQuery(""); handleBookClick(book); }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#f7fafc] transition text-left"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-sm flex-shrink-0"
                      style={{ background: FEATURED.has(book.abbrev) ? "#ed8936" : "#e2e8f0" }}
                    />
                    <span className="text-[14px] text-slate-700 font-medium">{book.name}</span>
                    <span className="text-[12px] text-slate-400 ml-auto">{book.chapters} capítulos</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="px-5 py-5 flex flex-col gap-[20px] overflow-x-auto">
            <div className="flex flex-col gap-[14px]">
              <p className="text-[10px] font-bold text-[#cbd5e0] uppercase tracking-[1.2px]">Antigo Testamento</p>
              <div className="flex gap-8 flex-wrap">
                {AT_COLUMNS.map(renderColumn)}
              </div>
            </div>

            <div className="flex flex-col gap-[14px]">
              <p className="text-[10px] font-bold text-[#cbd5e0] uppercase tracking-[1.2px]">Novo Testamento</p>
              <div className="flex gap-8 flex-wrap">
                {NT_COLUMNS.map(renderColumn)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
