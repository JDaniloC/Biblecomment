"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { activeTab, type TabId } from "@/lib/active-tab";
import { NotificationsPanel, useNotifications } from "@/components/NotificationsPanel";

interface SessionUser {
  username: string;
}

const ICON = {
  livros: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  discussoes: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
  comunidades: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  notificacoes: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  entrar: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>,
};

const TAB_BASE =
  "flex-1 flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-medium no-underline";

export function MobileTabBar({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  const current = activeTab(pathname);
  const [notifOpen, setNotifOpen] = useState(false);
  const { unread } = useNotifications();

  function cls(id: TabId) {
    return `${TAB_BASE} ${current === id ? "text-brand" : "text-slate-500 dark:text-slate-400"}`;
  }

  return (
    <>
      <nav
        className="bc-mobile-tabbar md:hidden fixed bottom-0 inset-x-0 z-40 h-14 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex items-stretch pb-[env(safe-area-inset-bottom)]"
        aria-label="Navegação"
        data-testid="mobile-tabbar"
      >
        <Link href="/home" className={cls("livros")} data-testid="tab-livros">
          {ICON.livros}<span>Livros</span>
        </Link>
        <Link href="/discussions" className={cls("discussoes")} data-testid="tab-discussoes">
          {ICON.discussoes}<span>Discussões</span>
        </Link>
        <Link href="/communities" className={cls("comunidades")} data-testid="tab-comunidades">
          {ICON.comunidades}<span>Comunidades</span>
        </Link>
        {user ? (
          <button
            type="button"
            onClick={() => setNotifOpen(true)}
            className={`${cls("notificacoes")} relative bg-transparent border-none cursor-pointer`}
            data-testid="tab-notificacoes"
          >
            {ICON.notificacoes}
            {unread > 0 && (
              <span className="absolute top-1.5 right-[calc(50%-18px)] min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white leading-4 text-center">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
            <span>Notificações</span>
          </button>
        ) : (
          <Link href="/login" className={cls("notificacoes")} data-testid="tab-entrar">
            {ICON.entrar}<span>Entrar</span>
          </Link>
        )}
      </nav>

      {notifOpen && (
        <div
          className="md:hidden fixed inset-0 z-[60] bg-black/40 flex items-end"
          onClick={() => setNotifOpen(false)}
          data-testid="mobile-notif-sheet"
        >
          <div
            className="w-full max-h-[70vh] bg-white dark:bg-slate-900 rounded-t-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <NotificationsPanel onNavigate={() => setNotifOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
