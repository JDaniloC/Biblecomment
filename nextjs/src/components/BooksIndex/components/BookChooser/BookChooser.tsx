"use client";

import { memo, useCallback } from "react";
import { Book } from "@/domain/entities/Book";
import { Loading } from "@/components/Partials";

interface Props {
  books: Book[];
  onSelectBook: (abbrev: string, chaptersAmount: number) => void;
}

function BookChooser({ books, onSelectBook }: Props) {
  const onBookClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const abbrev = e.currentTarget.getAttribute("data-abbrev") ?? "";
    const max = parseInt(e.currentTarget.getAttribute("data-length") ?? "0", 10);
    onSelectBook(abbrev, max);
  }, [onSelectBook]);

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-gray-500 text-sm">
        <Loading />
        <p>Carregando livros...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1 max-h-80 overflow-y-auto px-2">
      {books.map((book) => (
        <button
          key={book.abbrev}
          type="button"
          data-abbrev={book.abbrev}
          data-length={book.chapters}
          onClick={onBookClick}
          className="text-xs text-gray-800 font-medium px-2 py-1.5 rounded border border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50 transition text-left truncate"
        >
          {book.name}
        </button>
      ))}
    </div>
  );
}

export default memo(BookChooser);
