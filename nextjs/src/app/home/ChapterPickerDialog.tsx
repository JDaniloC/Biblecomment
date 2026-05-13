"use client";

import Link from "next/link";
import Modal from "@/components/Modal";
import type { Book } from "@/domain/entities/Book";

interface Props {
  book: Book | null;
  onClose: () => void;
}

export default function ChapterPickerDialog({ book, onClose }: Props) {
  return (
    <Modal
      show={book !== null}
      onClose={onClose}
      title={book ? `${book.name} — escolha um capítulo` : ""}
      size="lg"
    >
      {book && (
        <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-8 gap-2">
          {Array.from({ length: book.chapters }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={`/verses/${book.abbrev}/${n}`}
              onClick={onClose}
              className="flex items-center justify-center h-10 rounded-md bg-gray-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 text-sm font-medium text-gray-700 dark:text-slate-200 transition"
            >
              {n}
            </Link>
          ))}
        </div>
      )}
    </Modal>
  );
}
