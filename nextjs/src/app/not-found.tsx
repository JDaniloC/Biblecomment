import Link from "next/link";
import { auth } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";

/**
 * Branded 404 page. Rendered for any path that doesn't resolve to a route or
 * when a Server Component calls `notFound()`. Uses a verse-themed copy block
 * instead of the default Next.js "This page could not be found" string.
 */
export default async function NotFound() {
  const session = await auth();
  const viewer = session?.user
    ? {
        name: session.user.name ?? session.user.username,
        username: session.user.username,
        email: session.user.email,
        moderator: session.user.moderator,
      }
    : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col">
      <AppHeader user={viewer} />

      <main
        id="main-content"
        className="flex-1 flex items-center justify-center px-4 py-10"
      >
        <div
          data-testid="not-found-card"
          className="max-w-xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 sm:p-10 text-center shadow-sm"
        >
          <p className="text-[64px] sm:text-[80px] font-extrabold text-brand leading-none tracking-tight select-none">
            404
          </p>
          <h1 className="mt-2 text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
            Versículo não encontrado
          </h1>

          <blockquote className="mt-5 px-4 py-3 border-l-4 border-brand bg-brand-tint/30 dark:bg-brand-tint/10 rounded-r-md text-left text-sm text-slate-700 dark:text-slate-200 italic">
            "Buscai e achareis; batei e abrir-se-vos-á."
            <span className="block not-italic text-xs text-slate-500 dark:text-slate-400 mt-1">
              Mateus 7:7
            </span>
          </blockquote>

          <p className="mt-5 text-sm text-slate-600 dark:text-slate-300">
            Essa página não existe — talvez tenha sido removida ou o link
            esteja com um erro de digitação. Vamos voltar para um caminho
            conhecido?
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
            <Link
              href={viewer ? "/home" : "/"}
              data-testid="not-found-primary"
              className="inline-flex items-center gap-2 bg-brand text-white font-semibold text-sm px-4 py-2 rounded-md hover:bg-brand/90 transition no-underline"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 11l9-8 9 8" />
                <path d="M5 10v10a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1V10" />
              </svg>
              {viewer ? "Minha home" : "Página inicial"}
            </Link>
            <Link
              href="/communities"
              className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition no-underline"
            >
              Comunidades
            </Link>
            <Link
              href="/discussions"
              className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition no-underline"
            >
              Discussões
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export const metadata = {
  title: "Página não encontrada — Bible Comment",
};
