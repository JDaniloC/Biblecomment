"use client";

import Link from "next/link";
import OmniSearch from "@/app/_components/OmniSearch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationsBell } from "@/components/NotificationsBell";
import { AuthMenu } from "@/components/AuthMenu";

interface SessionUser {
  name?: string | null;
  username: string;
  email?: string | null;
  moderator?: boolean;
}

interface Props {
  user: SessionUser | null;
  /** Pass-through to AuthMenu for the post-login bounce-back. */
  loginCallbackUrl?: string;
  /** Optional extra controls rendered before the AuthMenu (e.g. FontSizeControl on chapter pages). */
  trailing?: React.ReactNode;
}

// Matches NotificationsBell and ThemeToggle so the header row reads as
// one icon strip rather than two distinct toolbars.
const NAV_LINK_CLASS =
  "inline-flex items-center justify-center w-9 h-9 rounded-md text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors no-underline";

/**
 * Canonical app-shell header used by every authenticated/dashboard-style
 * page (chapter, /home, /profile, /search, /discussions, etc.).
 *
 * Visual bar is full-width; content is centered at max-w-6xl so big screens
 * don't stretch the navigation across 2000+ pixels.
 *
 * Logo always points to "/" (the landing). Authenticated users get a separate
 * Home icon button at the start of the nav for one-tap access to /home.
 */
export function AppHeader({ user, loginCallbackUrl, trailing }: Props) {
  return (
    <header className="h-[68px] bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 flex-shrink-0">
      <div className="h-full max-w-6xl mx-auto flex items-center px-3 md:px-6 gap-3 md:gap-4">
        <Link href="/" className="flex items-center gap-3 flex-shrink-0 no-underline" aria-label="Bible Comment — início">
          <img src="/assets/logo.svg" alt="" aria-hidden="true" width={42} height={42} className="block w-9 h-9 md:w-[42px] md:h-[42px]" />
          <div className="hidden sm:block">
            <div className="font-bold text-[15px] text-slate-800 dark:text-slate-100 leading-[22.5px] whitespace-nowrap">BibleComment</div>
            <div className="font-light text-[11px] text-[#888] dark:text-slate-400 leading-[16.5px] whitespace-nowrap">A Program for His Glory</div>
          </div>
        </Link>

        <nav className="hidden md:flex gap-1 flex-shrink-0" aria-label="Navegação principal">
          {user && (
            // Home goes to /home (Livros), so the dedicated Livros icon
            // would be a duplicate destination — keep only the home icon
            // for signed-in users.
            <Link
              href="/home"
              aria-label="Início"
              title="Início"
              data-testid="header-home-link"
              data-tour="livros-link"
              className={NAV_LINK_CLASS}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 11l9-8 9 8" />
                <path d="M5 10v10a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1V10" />
              </svg>
            </Link>
          )}
          {!user && (
            // Anonymous viewers don't have a "minha home" — surface the
            // books icon so the chapter index is still one click away.
            <Link
              href="/home"
              aria-label="Livros"
              title="Livros"
              data-testid="header-books-link"
              className={NAV_LINK_CLASS}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </Link>
          )}
          <Link
            href="/discussions"
            aria-label="Discussões"
            title="Discussões"
            data-testid="header-discussions-link"
            className={NAV_LINK_CLASS}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </Link>
          <Link
            href="/communities"
            aria-label="Comunidades"
            title="Comunidades"
            data-testid="header-communities-link"
            className={NAV_LINK_CLASS}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </Link>
        </nav>

        <div data-tour="omnisearch" className="flex-1 min-w-0">
          <OmniSearch />
        </div>

        {trailing}
        {user && <NotificationsBell />}
        <ThemeToggle />
        <AuthMenu user={user} loginCallbackUrl={loginCallbackUrl} />

        <Link
          href="/help"
          aria-label="Ajuda e tutorial"
          className="hidden md:flex items-center justify-center w-7 h-7 rounded-full border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-brand hover:text-brand transition text-sm font-bold leading-none no-underline"
        >
          ?
        </Link>
      </div>
    </header>
  );
}
