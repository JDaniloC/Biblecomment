"use client";

import { useState } from "react";
import Link from "next/link";
import type { Book } from "@/domain/entities/Book";

interface Props {
  books: Book[];
}

export default function BooksPanel({ books }: Props) {
  const [search, setSearch] = useState("");

  const filtered = books.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-700 mb-3 text-center">
        Escolha a meditação de hoje
      </h2>
      <input
        type="text"
        placeholder="Filtrar livro..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 mb-3"
      />
      <div className="grid grid-cols-3 gap-1 max-h-64 overflow-y-auto">
        {filtered.map((book) => (
          <Link
            key={book.abbrev}
            href={`/verses/${book.abbrev}/1`}
            className="text-xs text-gray-800 font-medium px-2 py-1.5 rounded border border-gray-200 bg-gray-50 hover:border-blue-400 hover:bg-blue-50 transition truncate"
          >
            {book.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
