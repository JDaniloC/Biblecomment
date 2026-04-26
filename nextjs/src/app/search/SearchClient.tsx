"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import axios from "axios";

interface SessionUser {
  name: string;
  email: string;
  username: string;
  moderator: boolean;
}

interface SearchResult {
  id: string;
  text: string;
  book_reference: string;
  bookAbbrev?: string;
  verseNumber?: number;
  chapter?: number;
  username: string;
}

export default function SearchClient({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await axios.get<SearchResult[]>(`/api/search?q=${encodeURIComponent(text)}`);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 800);
  }, []);

  const handleSelect = useCallback((result: SearchResult) => {
    if (result.bookAbbrev && result.chapter) {
      router.push(`/chapter/${result.bookAbbrev}/${result.chapter}#${result.verseNumber ?? 1}`);
    } else {
      const refMatch = result.book_reference?.match(/^(\w+)\s(\d+):?(\d*)/);
      if (refMatch) {
        const abbrev = refMatch[1].toLowerCase();
        const chap = refMatch[2];
        router.push(`/chapter/${abbrev}/${chap}`);
      }
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/home" className="text-blue-600 hover:text-blue-800 text-sm">← Livros</Link>
          <h1 className="font-semibold text-gray-800">Buscar Comentários</h1>
          <Link href="/profile" className="text-sm text-gray-500 hover:text-gray-700">{user.name}</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="relative mb-6">
          <Image
            src="/assets/search.svg"
            alt="Buscar"
            width={20}
            height={20}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar comentário..."
            className="w-full border border-gray-300 rounded-lg pl-10 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); setResults([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <Image src="/assets/x.svg" alt="Limpar" width={16} height={16} />
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-8">Buscando...</div>
        ) : results.length > 0 ? (
          <ul className="space-y-3">
            {results.map((r) => (
              <li
                key={r.id}
                role="button"
                onClick={() => handleSelect(r)}
                className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-blue-400 transition"
              >
                <div className="text-xs text-blue-600 font-medium mb-1">{r.book_reference}</div>
                <p className="text-sm text-gray-700">{r.text}</p>
                <div className="text-xs text-gray-400 mt-1">por {r.username}</div>
              </li>
            ))}
          </ul>
        ) : query ? (
          <div className="text-center text-gray-400 py-8">Nenhum resultado encontrado.</div>
        ) : (
          <div className="text-center text-gray-400 py-8">
            <Image src="/assets/search.svg" alt="Buscar" width={48} height={48} className="mx-auto mb-3 opacity-30" />
            <p>Digite algo para buscar comentários</p>
          </div>
        )}
      </main>
    </div>
  );
}
