"use client";

import { useUnifiedSearch } from "@/lib/hooks/useUnifiedSearch";
import { HighlightText, UserAvatar, SEARCH_SPIN_KEYFRAMES } from "@/components/SearchPrimitives";

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
    <div className="relative">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "#fff",
          borderRadius: 8,
          padding: "0 10px",
          height: 36,
          boxShadow: "0px 4px 18px 0px rgba(19,125,219,0.12)",
          minWidth: 220,
        }}
      >
        {loading ? (
          <div style={{ width: 13, height: 13, border: "2px solid #137ddb", borderTopColor: "transparent", borderRadius: "50%", flexShrink: 0, animation: "spin 0.7s linear infinite" }} />
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="Buscar versículo ou comentário…"
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          style={{ flex: 1, fontSize: 12, color: "#1a1a1a", background: "transparent", border: "none", outline: "none", width: 180 }}
        />
        {query && (
          <button type="button" onClick={handleClear} style={{ display: "flex", alignItems: "center", color: "#94a3b8", cursor: "pointer", flexShrink: 0 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {open && query.length >= 2 && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, width: 360, background: "#fff", border: "0.667px solid #e2e8f0", borderRadius: 10, boxShadow: "0px 12px 40px 0px rgba(0,0,0,0.14), 0px 2px 8px 0px rgba(0,0,0,0.06)", zIndex: 50, overflow: "hidden", maxHeight: 400, overflowY: "auto" }}>
          {!loading && !hasResults && (
            <div style={{ padding: "20px 16px", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
              Nenhum resultado encontrado
            </div>
          )}

          {results.verses.length > 0 && (
            <div style={{ paddingTop: 12, paddingBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, paddingLeft: 14, paddingRight: 14, paddingBottom: 4 }}>
                <span style={{ fontSize: 10 }}>📖</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#a0aec0", textTransform: "uppercase", letterSpacing: "1px" }}>Escrituras</span>
              </div>
              {results.verses.map((v) => (
                <button
                  key={v._id}
                  type="button"
                  onMouseDown={() => handleSelectVerse(v)}
                  style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 18, paddingRight: 14, height: 34, background: "transparent", border: "none", cursor: "pointer", width: "100%", textAlign: "left", borderRadius: 6, transition: "background 0.12s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(19,125,219,0.04)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", background: "rgba(19,125,219,0.07)", borderRadius: 4, padding: "1px 5px", height: 15, flexShrink: 0, whiteSpace: "nowrap" }}>
                    <span style={{ fontWeight: 700, fontSize: 10, color: "#137ddb", lineHeight: "15px" }}>{v.reference}</span>
                  </span>
                  <span style={{ fontSize: 11, color: "#475569", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", flex: 1, minWidth: 0 }}>
                    <HighlightText text={v.text} query={query} />
                  </span>
                </button>
              ))}
            </div>
          )}

          {results.comments.length > 0 && (
            <div style={{ paddingTop: results.verses.length > 0 ? 6 : 12, paddingBottom: 6, borderTop: results.verses.length > 0 ? "1px solid #f1f5f9" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, paddingLeft: 14, paddingRight: 14, paddingBottom: 4 }}>
                <span style={{ fontSize: 10 }}>💬</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#a0aec0", textTransform: "uppercase", letterSpacing: "1px" }}>Comentários</span>
              </div>
              {results.comments.map((c) => (
                <button
                  key={c._id}
                  type="button"
                  onMouseDown={() => handleSelectComment(c)}
                  style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 18, paddingRight: 14, height: 34, background: "transparent", border: "none", cursor: "pointer", width: "100%", textAlign: "left", borderRadius: 6, transition: "background 0.12s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(19,125,219,0.04)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <UserAvatar username={c.username} size={18} />
                  <span style={{ display: "inline-flex", alignItems: "center", background: "rgba(19,125,219,0.07)", borderRadius: 4, padding: "1px 5px", height: 15, flexShrink: 0, whiteSpace: "nowrap" }}>
                    <span style={{ fontWeight: 700, fontSize: 10, color: "#137ddb", lineHeight: "15px" }}>{c.bookReference}</span>
                  </span>
                  <span style={{ fontSize: 11, color: "#475569", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", flex: 1, minWidth: 0 }}>
                    <HighlightText text={c.text} query={query} />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{SEARCH_SPIN_KEYFRAMES}</style>
    </div>
  );
}
