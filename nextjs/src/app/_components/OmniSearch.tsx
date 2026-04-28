"use client";

import { useUnifiedSearch } from "@/lib/hooks/useUnifiedSearch";
import { HighlightText, UserAvatar } from "@/components/SearchPrimitives";

export default function OmniSearch() {
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
    <div className="relative w-full max-w-[560px] mx-auto">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (results.verses.length > 0) handleSelectVerse(results.verses[0]);
          else if (results.comments.length > 0) handleSelectComment(results.comments[0]);
        }}
      >
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-lg px-3 h-10 shadow-[0px_4px_18px_0px_rgba(19,125,219,0.15)]">
          {loading ? (
            <div className="w-[15px] h-[15px] border-2 border-brand border-t-transparent rounded-full flex-shrink-0 animate-spin" />
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          )}
          <label htmlFor="omni-search-input" className="sr-only">
            Buscar versículos ou comentários
          </label>
          <input
            id="omni-search-input"
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Buscar versículos ou comentários…"
            aria-label="Buscar versículos ou comentários"
            className="flex-1 text-[13px] text-[#1a1a1a] dark:text-slate-100 bg-transparent border-none outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Limpar busca"
              className="flex items-center text-slate-400 dark:text-slate-500 cursor-pointer flex-shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </form>

      {open && query.length >= 2 && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[10px] shadow-[0px_12px_40px_0px_rgba(0,0,0,0.14),0px_2px_8px_0px_rgba(0,0,0,0.06)] z-50 overflow-hidden max-h-[430px] overflow-y-auto">
          {!loading && !hasResults && (
            <div className="px-4 py-6 text-center text-slate-400 dark:text-slate-500 text-[13px]">
              Nenhum resultado para &ldquo;{query}&rdquo;
            </div>
          )}

          {results.verses.length > 0 && (
            <div className="pt-3.5 pb-2">
              <div className="flex items-center gap-1.5 px-4 pb-1.5">
                <span className="text-[11px]">📖</span>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[1px]">
                  Escrituras
                </span>
              </div>
              {results.verses.map((verse) => (
                <button
                  key={verse._id}
                  type="button"
                  onMouseDown={() => handleSelectVerse(verse)}
                  className="flex items-center gap-2.5 pl-[22px] pr-4 h-[38px] bg-transparent border-none cursor-pointer w-full text-left rounded-md transition-colors duration-100 hover:bg-brand-hover"
                >
                  <span className="inline-flex items-center bg-brand-tint rounded px-[5px] h-4 flex-shrink-0 whitespace-nowrap">
                    <span className="font-bold text-[11px] text-brand leading-[16.5px]">{verse.reference}</span>
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-300 leading-[18px] overflow-hidden whitespace-nowrap text-ellipsis flex-1 min-w-0">
                    <HighlightText text={verse.text} query={query} />
                  </span>
                </button>
              ))}
            </div>
          )}

          {results.comments.length > 0 && (
            <div className={`pb-2 ${results.verses.length > 0 ? "pt-2 border-t border-slate-100 dark:border-slate-800" : "pt-3.5"}`}>
              <div className="flex items-center gap-1.5 px-4 pb-1.5">
                <span className="text-[11px]">💬</span>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[1px]">
                  Comentários
                </span>
              </div>
              {results.comments.map((comment) => (
                <button
                  key={comment._id}
                  type="button"
                  onMouseDown={() => handleSelectComment(comment)}
                  className="flex items-center gap-2.5 pl-[22px] pr-4 h-[38px] bg-transparent border-none cursor-pointer w-full text-left rounded-md transition-colors duration-100 hover:bg-brand-hover"
                >
                  <UserAvatar username={comment.username} size={20} />
                  <span className="inline-flex items-center bg-brand-tint rounded px-[5px] h-4 flex-shrink-0 whitespace-nowrap">
                    <span className="font-bold text-[11px] text-brand leading-[16.5px]">{comment.bookReference}</span>
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-300 leading-[18px] overflow-hidden whitespace-nowrap text-ellipsis flex-1 min-w-0">
                    <HighlightText text={comment.text} query={query} />
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
