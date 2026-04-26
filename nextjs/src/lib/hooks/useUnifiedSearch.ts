"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

export interface VerseResult {
  _id: string;
  reference: string;
  abbrev: string;
  chapter: number;
  verseNumber: number;
  text: string;
}

export interface CommentResult {
  _id: string;
  bookReference: string;
  text: string;
  username: string;
  abbrev: string;
  chapter: number;
  verse: number;
}

export interface UnifiedResults {
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

export function useUnifiedSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UnifiedResults>({ verses: [], comments: [] });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const hasResults = results.verses.length > 0 || results.comments.length > 0;

  const doSearch = useCallback(
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
    [],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setQuery(v);
      setOpen(true);
      if (v.length >= 2) {
        setLoading(true);
        doSearch(v);
      } else {
        setResults({ verses: [], comments: [] });
        setLoading(false);
      }
    },
    [doSearch],
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setResults({ verses: [], comments: [] });
    setOpen(false);
    setLoading(false);
    inputRef.current?.focus();
  }, []);

  const navigate = useCallback(
    (path: string) => {
      setQuery("");
      setOpen(false);
      setResults({ verses: [], comments: [] });
      router.push(path);
    },
    [router],
  );

  const handleSelectVerse = useCallback(
    (v: VerseResult) => navigate(`/verses/${v.abbrev}/${v.chapter}#${v.verseNumber}`),
    [navigate],
  );

  const handleSelectComment = useCallback(
    (c: CommentResult) => navigate(`/verses/${c.abbrev}/${c.chapter}#${c.verse}`),
    [navigate],
  );

  return {
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
  };
}
