"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import SearchInput from "@/components/SearchInput";
import BooksIndex from "@/components/BooksIndex/BooksIndex";
import Login from "@/components/Login";
import Modal from "@/components/Modal";

interface Props {
  onChangeChapter?: (abbrev: string, chapter: number) => boolean | void;
}

export default function Header({ onChangeChapter }: Props) {
  const [showBooks, setShowBooks] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const openBooks = useCallback(() => {
    setShowBooks(true);
    setShowLogin(false);
  }, []);

  const openLogin = useCallback(() => {
    setShowLogin(true);
    setShowBooks(false);
  }, []);

  const closeBooks = useCallback(() => setShowBooks(false), []);
  const closeLogin = useCallback(() => setShowLogin(false), []);

  return (
    <>
      <header className="bg-white dark:bg-slate-900 dark:border-b dark:border-slate-800 shadow-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <Image src="/assets/logo.svg" alt="Bible Comment" width={36} height={36} />
              <div className="hidden sm:block">
                <h1 className="text-sm font-bold text-gray-800 dark:text-slate-100 leading-tight">Bible Comment</h1>
                <sub className="text-xs text-gray-500 dark:text-slate-400">A Program for His Glory</sub>
              </div>
            </Link>
            <SearchInput />
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={openBooks}
              aria-label="Livros — abrir lista de livros"
              className="flex items-center gap-1 text-sm text-gray-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-brand px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800 transition"
            >
              <span className="hidden sm:inline">Livros</span>
              <Image src="/assets/books.svg" alt="" aria-hidden="true" width={16} height={16} />
            </button>
            <button
              type="button"
              onClick={openLogin}
              aria-label="Perfil — abrir painel da conta"
              className="flex items-center gap-1 text-sm text-gray-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-brand px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800 transition"
            >
              <span className="hidden sm:inline">Perfil</span>
              <Image src="/assets/person.svg" alt="" aria-hidden="true" width={16} height={16} />
            </button>
            <Link
              href="/help"
              title="Sobre o Bible Comment"
              aria-label="Sobre o Bible Comment e tutorial"
              className="flex items-center justify-center w-7 h-7 rounded-full border border-gray-300 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 dark:hover:text-brand transition text-sm font-bold leading-none"
            >
              ?
            </Link>
          </div>
        </div>
      </header>

      <Modal show={showBooks} onClose={closeBooks} size="2xl" noPadding>
        <BooksIndex onChangeChapter={onChangeChapter} closeBookComponent={closeBooks} />
      </Modal>

      <Modal show={showLogin} onClose={closeLogin} title="Conta" size="sm">
        <Login />
      </Modal>
    </>
  );
}
