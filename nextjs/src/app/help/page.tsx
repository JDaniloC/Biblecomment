import Link from "next/link";
import Image from "next/image";
import Introduction from "./Introduction";
import AboutComment from "./AboutComment";
import AboutActions from "./AboutActions";
import HelpAccount from "./HelpAccount";
import { Logo } from "@/components/Logo";

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-stone-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-stone-100 dark:hover:bg-slate-800 transition"
          >
            <Image src="/assets/backArrow.svg" alt="Voltar" width={20} height={20} className="dark:invert dark:opacity-80" />
          </Link>
          <div className="flex items-center gap-2">
            <Logo alt="Bible Comment" width={24} height={24} className="opacity-70" />
            <h1 className="text-base font-bold text-stone-800 dark:text-stone-100">Sobre o Bible Comment</h1>
          </div>
        </div>
      </header>

      <main id="main-content" className="max-w-5xl mx-auto px-4 py-10 space-y-12">
        <Introduction />
        <AboutComment />
        <AboutActions />
        <HelpAccount />
      </main>

      <footer className="border-t border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-5 px-4 mt-8">
        <div className="max-w-5xl mx-auto text-center text-xs text-stone-400 dark:text-stone-500">
          Bible Comment &mdash; A Program for His Glory &mdash;{" "}
          <a
            href="https://github.com/JDaniloC/Biblecomment"
            className="hover:text-stone-600 dark:hover:text-stone-300 transition underline"
          >
            Código do projeto
          </a>
        </div>
      </footer>
    </div>
  );
}
