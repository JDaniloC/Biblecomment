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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Bible Comment</h1>
          <div className="flex items-center gap-3">
            <Link href="/search" className="text-sm text-blue-600 hover:underline hidden sm:block">Buscar</Link>
            <Link href="/discussions" className="text-sm text-purple-600 hover:underline hidden sm:block">Discussões</Link>
            <Link href="/users" className="text-sm text-gray-500 hover:underline hidden sm:block">Usuários</Link>
            <Link href="/profile" className="text-sm text-gray-600 hover:text-gray-800 hidden sm:block">{user.name}</Link>
            {user.moderator && (
              <Link href="/backup" className="text-sm text-orange-600 hover:underline hidden sm:block">Backup</Link>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm text-red-500 hover:text-red-700"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="Buscar livro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <div className="flex gap-2">
            {(["all", "VT", "NT"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filter === t
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {t === "all" ? "Todos" : testamentLabels[t]}
              </button>
            ))}
          </div>
        </div>

        {Object.keys(grouped).map((group) => (
          <div key={group} className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {group}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {grouped[group].map((book) => (
                <Link
                  key={book.abbrev}
                  href={`/verses/${book.abbrev}/1`}
                  className="bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-400 hover:shadow-sm transition"
                >
                  <div className="text-xs text-gray-400 uppercase mb-1">
                    {book.abbrev}
                  </div>
                  <div className="text-sm font-medium text-gray-800 leading-tight">
                    {book.name}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {book.chapters} cap.
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-10">
            Nenhum livro encontrado.
          </p>
        )}
      </main>
    </div>
  );
}
