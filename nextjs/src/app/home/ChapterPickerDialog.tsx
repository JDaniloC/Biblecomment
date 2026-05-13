"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Modal from "@/components/Modal";
import type { Book } from "@/domain/entities/Book";

interface Props {
  book: Book | null;
  onClose: () => void;
}

export default function ChapterPickerDialog({ book, onClose }: Props) {
  const [readChapters, setReadChapters] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!book) {
      setReadChapters(new Set());
      return;
    }
    // Clear stale state from the previously opened book before fetching.
    setReadChapters(new Set());
    const controller = new AbortController();
    fetch(`/api/me/read-chapters/${book.abbrev}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { chapters: [] }))
      .then((data: { chapters: number[] }) => {
        setReadChapters(new Set(data.chapters ?? []));
      })
      .catch(() => {
        // Network failures and aborts both land here; falling back to "no
        // reads" keeps the picker functional even if the auxiliary endpoint
        // is unavailable.
      });
    return () => controller.abort();
  }, [book]);

  return (
    <Modal
      show={book !== null}
      onClose={onClose}
      title={book ? `${book.name} — escolha um capítulo` : ""}
      size="lg"
    >
      {book && (
        <div
          data-testid="chapter-picker-grid"
          className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-8 gap-2"
        >
          {Array.from({ length: book.chapters }, (_, i) => i + 1).map((n) => {
            const isRead = readChapters.has(n);
            return (
              <Link
                key={n}
                href={`/verses/${book.abbrev}/${n}`}
                onClick={onClose}
                data-testid={`chapter-picker-chapter-${n}`}
                data-read={isRead ? "true" : "false"}
                title={isRead ? "Capítulo lido" : undefined}
                className={`flex items-center justify-center h-10 rounded-md text-sm font-medium transition ${
                  isRead
                    ? "bg-blue-200 dark:bg-blue-800/60 text-blue-900 dark:text-blue-100 hover:bg-blue-300 dark:hover:bg-blue-700"
                    : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-blue-100 dark:hover:bg-slate-700"
                }`}
              >
                {n}
              </Link>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
