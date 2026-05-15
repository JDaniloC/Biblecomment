"use client";

import { useEffect, useRef, useState } from "react";
import { NotificationsPanel, useNotifications } from "@/components/NotificationsPanel";

export function NotificationsBell({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const { unread } = useNotifications();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `${unread} notificações não lidas` : "Notificações"}
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-md text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white leading-4 text-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-[360px] sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+6px)] sm:translate-x-0 sm:translate-y-0 sm:w-[340px] sm:max-w-none max-h-[440px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-[0px_8px_30px_0px_rgba(0,0,0,0.14),0px_2px_8px_0px_rgba(0,0,0,0.06)] z-50 flex flex-col overflow-hidden">
          <NotificationsPanel onNavigate={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
