"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useConfirm } from "@/contexts/ConfirmContext";

interface SessionUser {
  name?: string | null;
  username: string;
  email?: string | null;
  moderator?: boolean;
}

interface Props {
  /** When null, the component renders an "Entrar" CTA instead. */
  user: SessionUser | null;
  /** Callback URL appended to the login link when not signed in. */
  loginCallbackUrl?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const ICONS = {
  user: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  message: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  heart: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  settings: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M4.93 19.07l1.41-1.41M19.07 19.07l-1.41-1.41M20 12h2M2 12h2M12 20v2M12 2v2"/></svg>,
  shield: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  signout: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  book: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  help: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

/**
 * Auth menu — avatar + dropdown when logged in, or Entrar CTA when out.
 *
 * Extracted from ChapterClient.tsx so the same widget can be reused in
 * AppHeader and HomeHeader without duplicating state machine, dropdown
 * markup, and click-outside backdrop logic.
 */
export function AuthMenu({ user, loginCallbackUrl }: Props) {
  const [open, setOpen] = useState(false);
  const confirm = useConfirm();

  const handleSignOut = async () => {
    setOpen(false);
    const ok = await confirm({
      title: "Sair da conta?",
      description: "Você precisará entrar novamente para comentar e curtir.",
      confirmLabel: "Sair",
      cancelLabel: "Cancelar",
      variant: "danger",
    });
    if (!ok) return;
    signOut({ callbackUrl: "/" });
  };

  if (!user) {
    const href = loginCallbackUrl
      ? `/login?callbackUrl=${encodeURIComponent(loginCallbackUrl)}`
      : "/login";
    return (
      <Link
        href={href}
        className="flex-shrink-0 inline-flex items-center h-9 px-3 rounded-md bg-brand text-white text-sm font-semibold no-underline whitespace-nowrap hover:opacity-90 transition"
      >
        Entrar
      </Link>
    );
  }

  const initials = getInitials(user.name || user.username || "U");

  return (
    <div className="relative flex-shrink-0" data-tour="user-menu">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu da conta"
        aria-expanded={open}
        className="w-9 h-9 rounded-full bg-brand border-2 border-brand flex items-center justify-center cursor-pointer"
      >
        <span className="font-bold text-[13px] text-white leading-[13px]">{initials}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[49]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 w-[200px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[10px] shadow-[0px_8px_30px_0px_rgba(0,0,0,0.14),0px_2px_8px_0px_rgba(0,0,0,0.06)] overflow-hidden z-50">
            <div className="px-4 pt-3 pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="font-bold text-sm text-slate-800 dark:text-slate-100 leading-[21px] whitespace-nowrap overflow-hidden text-ellipsis">
                {user.name ?? user.username}
              </div>
              <div className="font-normal text-xs text-slate-400 dark:text-slate-500 leading-[18px]">@{user.username}</div>
            </div>
            {/* Mobile-only nav: the AppHeader hides "Livros"/"Discussões"/"?" below md.
                Surface them here so phone users can still navigate the site. */}
            <div className="md:hidden">
              <Link href="/home" onClick={() => setOpen(false)} className="flex items-center gap-2.5 h-[35.5px] pl-4 no-underline">
                <span className="text-slate-600 dark:text-slate-300 flex">{ICONS.book}</span>
                <span className="font-medium text-[13px] text-slate-600 dark:text-slate-300 whitespace-nowrap">Livros</span>
              </Link>
              <Link href="/discussions" onClick={() => setOpen(false)} className="flex items-center gap-2.5 h-[35.5px] pl-4 no-underline">
                <span className="text-slate-600 dark:text-slate-300 flex">{ICONS.message}</span>
                <span className="font-medium text-[13px] text-slate-600 dark:text-slate-300 whitespace-nowrap">Discussões</span>
              </Link>
              <Link href="/help" onClick={() => setOpen(false)} className="flex items-center gap-2.5 h-[35.5px] pl-4 no-underline">
                <span className="text-slate-600 dark:text-slate-300 flex">{ICONS.help}</span>
                <span className="font-medium text-[13px] text-slate-600 dark:text-slate-300 whitespace-nowrap">Ajuda</span>
              </Link>
              <div className="h-px bg-slate-100 dark:bg-slate-800" />
            </div>
            <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2.5 h-[35.5px] pl-4 no-underline">
              <span className="text-slate-600 dark:text-slate-300 flex">{ICONS.user}</span>
              <span className="font-medium text-[13px] text-slate-600 dark:text-slate-300 whitespace-nowrap">Meu Perfil</span>
            </Link>
            <Link href="/profile?tab=comments" onClick={() => setOpen(false)} className="flex items-center gap-2.5 h-[35.5px] pl-4 no-underline">
              <span className="text-slate-600 dark:text-slate-300 flex">{ICONS.message}</span>
              <span className="font-medium text-[13px] text-slate-600 dark:text-slate-300 whitespace-nowrap">Meus Comentários</span>
            </Link>
            <Link href="/profile?tab=favorites" onClick={() => setOpen(false)} className="flex items-center gap-2.5 h-[35.5px] pl-4 no-underline">
              <span className="text-slate-600 dark:text-slate-300 flex">{ICONS.heart}</span>
              <span className="font-medium text-[13px] text-slate-600 dark:text-slate-300 whitespace-nowrap">Favoritos</span>
            </Link>
            <div className="h-px bg-slate-100 dark:bg-slate-800" />
            <Link href="/profile?tab=config" onClick={() => setOpen(false)} className="flex items-center gap-2.5 h-[35.5px] pl-4 no-underline">
              <span className="text-slate-600 dark:text-slate-300 flex">{ICONS.settings}</span>
              <span className="font-medium text-[13px] text-slate-600 dark:text-slate-300">Configurações</span>
            </Link>
            {user.moderator && (
              <Link href="/admin/moderation" onClick={() => setOpen(false)} className="flex items-center gap-2.5 h-[35.5px] pl-4 no-underline">
                <span className="text-amber-600 dark:text-amber-400 flex">{ICONS.shield}</span>
                <span className="font-medium text-[13px] text-amber-700 dark:text-amber-300">Moderação</span>
              </Link>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 h-[35.5px] pl-4 bg-transparent border-none cursor-pointer text-left hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <span className="text-red-600 dark:text-red-400 flex">{ICONS.signout}</span>
              <span className="font-medium text-[13px] text-red-600 dark:text-red-400">Sair</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
