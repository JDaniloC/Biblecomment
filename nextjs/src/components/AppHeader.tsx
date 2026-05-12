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

/**
 * Canonical app-shell header used by every authenticated/dashboard-style
 * page (chapter, /home, /profile, /search, /discussions, etc.).
 *
 * Visual bar is full-width; content is centered at max-w-6xl so big screens
 * don't stretch the navigation across 2000+ pixels.
 *
 * Logo destination is dynamic: anonymous → "/" (landing), authenticated →
 * "/home" (dashboard). The user is responsible for passing `user` correctly.
 */
export function AppHeader({ user, loginCallbackUrl, trailing }: Props) {
  const logoHref = user ? "/home" : "/";

  return (
    <header className="h-[68px] bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 flex-shrink-0">
      <div className="h-full max-w-6xl mx-auto flex items-center px-3 md:px-6 gap-3 md:gap-6">
        <Link href={logoHref} className="flex items-center gap-3 flex-shrink-0 no-underline" aria-label="Bible Comment — início">
          <img src="/assets/logo.svg" alt="" aria-hidden="true" width={42} height={42} className="block w-9 h-9 md:w-[42px] md:h-[42px]" />
          <div className="hidden sm:block">
            <div className="font-bold text-[15px] text-slate-800 dark:text-slate-100 leading-[22.5px] whitespace-nowrap">BibleComment</div>
            <div className="font-light text-[11px] text-[#888] dark:text-slate-400 leading-[16.5px] whitespace-nowrap">A Program for His Glory</div>
          </div>
        </Link>

        <nav className="hidden md:flex gap-5 flex-shrink-0">
          <Link href="/home" data-tour="livros-link" className="font-medium text-sm text-slate-800 dark:text-slate-100 no-underline">Livros</Link>
          <Link href="/discussions" className="font-medium text-sm text-slate-800 dark:text-slate-100 no-underline">Discussões</Link>
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
