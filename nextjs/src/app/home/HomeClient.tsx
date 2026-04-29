"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { Book } from "@/domain/entities/Book";

interface Props {
  books: Book[];
  user: { name: string; email: string; username: string; moderator: boolean };
}

const testamentLabels: Record<string, string> = {
  VT: "Velho Testamento",
  NT: "Novo Testamento",
};

export default function HomeClient({ books, user }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "VT" | "NT">("all");

  const filtered = books.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.abbrev.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || b.testament === filter;
    return matchesSearch && matchesFilter;
  });

  const grouped: Record<string, Book[]> = {};
  for (const book of filtered) {
    if (!grouped[book.group]) grouped[book.group] = [];
    grouped[book.group].push(book);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 shadow-sm sticky top-0 z-10 dark:border-b dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100">Bible Comment</h1>
          <div className="flex items-center gap-3">
            <Link href="/search" className="text-sm text-blue-600 dark:text-brand hover:underline hidden sm:block">Buscar</Link>
            <Link href="/discussions" className="text-sm text-purple-600 dark:text-purple-400 hover:underline hidden sm:block">Discussões</Link>
            <Link href="/users" className="text-sm text-gray-500 dark:text-slate-400 hover:underline hidden sm:block">Usuários</Link>
            <Link href="/profile" className="text-sm text-gray-600 dark:text-slate-300 hover:text-gray-800 dark:hover:text-slate-100 hidden sm:block">{user.name}</Link>
            {user.moderator && (
              <Link href="/backup" className="text-sm text-orange-600 dark:text-orange-400 hover:underline hidden sm:block">Backup</Link>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main id="main-content" className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <label htmlFor="home-book-search" className="sr-only">
            Buscar livro
          </label>
          <input
            id="home-book-search"
            type="text"
            placeholder="Buscar livro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <div className="flex gap-2">
            {(["all", "VT", "NT"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filter === t
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700"
                }`}
              >
                {t === "all" ? "Todos" : testamentLabels[t]}
              </button>
            ))}
          </div>
        </div>

        {Object.keys(grouped).map((group) => (
          <div key={group} className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              {group}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {grouped[group].map((book) => (
                <Link
                  key={book.abbrev}
                  href={`/verses/${book.abbrev}/1`}
                  className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 hover:border-blue-400 dark:hover:border-brand hover:shadow-sm transition"
                >
                  <div className="text-xs text-gray-400 dark:text-slate-500 uppercase mb-1">
                    {book.abbrev}
                  </div>
                  <div className="text-sm font-medium text-gray-800 dark:text-slate-100 leading-tight">
                    {book.name}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                    {book.chapters} cap.
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="text-center text-gray-400 dark:text-slate-500 py-10">
            Nenhum livro encontrado.
          </p>
        )}
      </main>
    </div>
  );
}
