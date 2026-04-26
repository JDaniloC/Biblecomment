"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface VerseResult {
  _id: string;
  reference: string;
  abbrev: string;
  chapter: number;
  verseNumber: number;
  text: string;
}

interface CommentResult {
  _id: string;
  bookReference: string;
  text: string;
  username: string;
  abbrev: string;
  chapter: number;
  verse: number;
}

interface UnifiedResults {
  verses: VerseResult[];
  comments: CommentResult[];
}

function debounce<T extends (...args: Parameters<T>) => void>(fn: T, ms: number) {
  let t: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + query.length);
  const after = text.slice(idx + query.length);
  return (
    <span>
      {before}
      <span
        style={{
          background: "rgba(19,125,219,0.12)",
          color: "#137ddb",
          borderRadius: "2px",
          paddingLeft: "1px",
          paddingRight: "1px",
        }}
      >
        {match}
      </span>
      {after}
    </span>
  );
}

function UserAvatar({ username }: { username: string }) {
  const initial = (username ?? "?")[0].toUpperCase();
  const colors = [
    "#137ddb", "#7c3aed", "#ea580c", "#059669",
    "#d97706", "#db2777", "#0891b2", "#65a30d",
  ];
  const color = colors[initial.charCodeAt(0) % colors.length];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 20,
        height: 20,
        borderRadius: "50%",
        background: color,
        color: "#fff",
        fontSize: 10,
        fontWeight: 700,
        flexShrink: 0,
        fontFamily: "Inter, sans-serif",
      }}
    >
      {initial}
    </span>
  );
}

export default function OmniSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UnifiedResults>({ verses: [], comments: [] });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasResults = results.verses.length > 0 || results.comments.length > 0;

  const search = useCallback(
    debounce(async (q: string) => {
      if (!q || q.length < 2) {
        setResults({ verses: [], comments: [] });
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/search/unified?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults({
          verses: Array.isArray(data?.verses) ? data.verses : [],
          comments: Array.isArray(data?.comments) ? data.comments : [],
        });
      } catch {
        setResults({ verses: [], comments: [] });
      } finally {
        setLoading(false);
      }
    }, 400),
    []
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setQuery(v);
      setOpen(true);
      if (v.length >= 2) {
        setLoading(true);
        search(v);
      } else {
        setResults({ verses: [], comments: [] });
        setLoading(false);
      }
    },
    [search]
  );

  const handleSelectVerse = useCallback(
    (v: VerseResult) => {
      setQuery("");
      setOpen(false);
      router.push(`/verses/${v.abbrev}/${v.chapter}#${v.verseNumber}`);
    },
    [router]
  );

  const handleSelectComment = useCallback(
    (c: CommentResult) => {
      setQuery("");
      setOpen(false);
      router.push(`/verses/${c.abbrev}/${c.chapter}#${c.verse}`);
    },
    [router]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setResults({ verses: [], comments: [] });
    setOpen(false);
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (results.verses.length > 0) handleSelectVerse(results.verses[0]);
      else if (results.comments.length > 0) handleSelectComment(results.comments[0]);
    },
    [results, handleSelectVerse, handleSelectComment]
  );

  return (
    <div className="relative w-full" style={{ maxWidth: 560, margin: "0 auto" }}>
      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#fff",
            borderRadius: 8,
            padding: "0 12px",
            height: 40,
            boxShadow: "0px 4px 18px 0px rgba(19,125,219,0.15)",
          }}
        >
          {loading ? (
            <div
              style={{
                width: 15,
                height: 15,
                border: "2px solid #137ddb",
                borderTopColor: "transparent",
                borderRadius: "50%",
                flexShrink: 0,
                animation: "spin 0.7s linear infinite",
              }}
            />
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Buscar versículos ou comentários…"
            style={{
              flex: 1,
              fontSize: 13,
              color: "#1a1a1a",
              background: "transparent",
              border: "none",
              outline: "none",
              fontFamily: "Inter, sans-serif",
            }}
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              style={{ display: "flex", alignItems: "center", color: "#94a3b8", cursor: "pointer", flexShrink: 0 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </form>

      {open && query.length >= 2 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "0.667px solid #e2e8f0",
            borderRadius: 10,
            boxShadow: "0px 12px 40px 0px rgba(0,0,0,0.14), 0px 2px 8px 0px rgba(0,0,0,0.06)",
            zIndex: 50,
            overflow: "hidden",
            maxHeight: 430,
            overflowY: "auto",
          }}
        >
          {!loading && !hasResults && (
            <div style={{ padding: "24px 16px", textAlign: "center", color: "#94a3b8", fontSize: 13, fontFamily: "Inter, sans-serif" }}>
              Nenhum resultado para &ldquo;{query}&rdquo;
            </div>
          )}

          {results.verses.length > 0 && (
            <div style={{ paddingTop: 14, paddingBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 16, paddingRight: 16, paddingBottom: 6 }}>
                <span style={{ fontSize: 11 }}>📖</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#a0aec0", textTransform: "uppercase", letterSpacing: "1px", fontFamily: "Inter, sans-serif" }}>
                  Escrituras
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {results.verses.map((verse) => (
                  <button
                    key={verse._id}
                    type="button"
                    onMouseDown={() => handleSelectVerse(verse)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      paddingLeft: 22,
                      paddingRight: 16,
                      height: 38,
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      width: "100%",
                      textAlign: "left",
                      borderRadius: 6,
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(19,125,219,0.04)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        background: "rgba(19,125,219,0.07)",
                        borderRadius: 4,
                        padding: "1px 5px",
                        height: 16,
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'Merriweather', Georgia, serif",
                          fontWeight: 700,
                          fontSize: 11,
                          color: "#137ddb",
                          lineHeight: "16.5px",
                        }}
                      >
                        {verse.reference}
                      </span>
                    </span>
                    <span
                      style={{
                        fontFamily: "'Merriweather', Georgia, serif",
                        fontSize: 12,
                        color: "#475569",
                        lineHeight: "18px",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <HighlightText text={verse.text} query={query} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.comments.length > 0 && (
            <div style={{ paddingTop: results.verses.length > 0 ? 8 : 14, paddingBottom: 8, borderTop: results.verses.length > 0 ? "1px solid #f1f5f9" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 16, paddingRight: 16, paddingBottom: 6 }}>
                <span style={{ fontSize: 11 }}>💬</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#a0aec0", textTransform: "uppercase", letterSpacing: "1px", fontFamily: "Inter, sans-serif" }}>
                  Comentários
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {results.comments.map((comment) => (
                  <button
                    key={comment._id}
                    type="button"
                    onMouseDown={() => handleSelectComment(comment)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      paddingLeft: 22,
                      paddingRight: 16,
                      height: 38,
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      width: "100%",
                      textAlign: "left",
                      borderRadius: 6,
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(19,125,219,0.04)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <UserAvatar username={comment.username} />
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        background: "rgba(19,125,219,0.07)",
                        borderRadius: 4,
                        padding: "1px 5px",
                        height: 16,
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'Merriweather', Georgia, serif",
                          fontWeight: 700,
                          fontSize: 11,
                          color: "#137ddb",
                          lineHeight: "16.5px",
                        }}
                      >
                        {comment.bookReference}
                      </span>
                    </span>
                    <span
                      style={{
                        fontFamily: "'Merriweather', Georgia, serif",
                        fontSize: 12,
                        color: "#475569",
                        lineHeight: "18px",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <HighlightText text={comment.text} query={query} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
