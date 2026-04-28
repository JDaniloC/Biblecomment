"use client";

import { useUnifiedSearch } from "@/lib/hooks/useUnifiedSearch";
import { HighlightText, UserAvatar } from "@/components/SearchPrimitives";

export default function SearchInput() {
  const {
    inputRef,
    query,
    results,
    loading,
    open,
    hasResults,
    setOpen,
    handleChange,
    handleClear,
    handleSelectVerse,
    handleSelectComment,
  } = useUnifiedSearch();

  return (
    <div className="relative w-full max-w-[280px] sm:max-w-none">
      <div className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-lg px-2.5 h-9 min-w-0 sm:min-w-[220px] shadow-[0px_4px_18px_0px_rgba(19,125,219,0.12)]">
        {loading ? (
          <div className="w-[13px] h-[13px] border-2 border-brand border-t-transparent rounded-full flex-shrink-0 animate-spin" />
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" aria-hidden="true">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
        )}
        <label htmlFor="header-search" className="sr-only">
          Buscar versículo ou comentário
        </label>
        <input
          id="header-search"
          ref={inputRef}
          type="text"
          value={query}
          placeholder="Buscar versículo ou comentário…"
          aria-label="Buscar versículo ou comentário"
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="flex-1 min-w-0 text-xs text-[#1a1a1a] dark:text-slate-100 bg-transparent border-none outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Limpar busca"
            className="flex items-center text-slate-400 dark:text-slate-500 cursor-pointer flex-shrink-0"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {open && query.length >= 2 && (
        <div className="absolute top-[calc(100%+4px)] left-0 w-[min(360px,calc(100vw-2rem))] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[10px] shadow-[0px_12px_40px_0px_rgba(0,0,0,0.14),0px_2px_8px_0px_rgba(0,0,0,0.06)] z-50 overflow-hidden max-h-[400px] overflow-y-auto">
          {!loading && !hasResults && (
            <div className="px-4 py-5 text-center text-slate-400 dark:text-slate-500 text-xs">
              Nenhum resultado encontrado
            </div>
          )}

          {results.verses.length > 0 && (
            <div className="pt-3 pb-1.5">
              <div className="flex items-center gap-[5px] px-3.5 pb-1">
                <span className="text-[10px]">📖</span>
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[1px]">Escrituras</span>
              </div>
              {results.verses.map((v) => (
                <button
                  key={v._id}
                  type="button"
                  onMouseDown={() => handleSelectVerse(v)}
                  className="flex items-center gap-2 pl-[18px] pr-3.5 h-[34px] bg-transparent border-none cursor-pointer w-full text-left rounded-md transition-colors duration-100 hover:bg-brand-hover"
                >
                  <span className="inline-flex items-center bg-brand-tint rounded px-[5px] h-[15px] flex-shrink-0 whitespace-nowrap">
                    <span className="font-bold text-[10px] text-brand leading-[15px]">{v.reference}</span>
                  </span>
                  <span className="text-[11px] text-slate-600 dark:text-slate-300 overflow-hidden whitespace-nowrap text-ellipsis flex-1 min-w-0">
                    <HighlightText text={v.text} query={query} />
                  </span>
                </button>
              ))}
            </div>
          )}

          {results.comments.length > 0 && (
            <div className={`pb-1.5 ${results.verses.length > 0 ? "pt-1.5 border-t border-slate-100 dark:border-slate-800" : "pt-3"}`}>
              <div className="flex items-center gap-[5px] px-3.5 pb-1">
                <span className="text-[10px]">💬</span>
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[1px]">Comentários</span>
              </div>
              {results.comments.map((c) => (
                <button
                  key={c._id}
                  type="button"
                  onMouseDown={() => handleSelectComment(c)}
                  className="flex items-center gap-2 pl-[18px] pr-3.5 h-[34px] bg-transparent border-none cursor-pointer w-full text-left rounded-md transition-colors duration-100 hover:bg-brand-hover"
                >
                  <UserAvatar username={c.username} size={18} />
                  <span className="inline-flex items-center bg-brand-tint rounded px-[5px] h-[15px] flex-shrink-0 whitespace-nowrap">
                    <span className="font-bold text-[10px] text-brand leading-[15px]">{c.bookReference}</span>
                  </span>
                  <span className="text-[11px] text-slate-600 dark:text-slate-300 overflow-hidden whitespace-nowrap text-ellipsis flex-1 min-w-0">
                    <HighlightText text={c.text} query={query} />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
