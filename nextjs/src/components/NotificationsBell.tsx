"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { notificationsService } from "@/services/notifications";
import type { Notification } from "@/domain/entities/Notification";

const POLL_INTERVAL_MS = 60_000;

function formatRelative(input?: Date | string): string {
  if (!input) return "";
  const d = typeof input === "string" ? new Date(input) : input;
  if (isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const day = Math.floor(h / 24);
  if (day < 7) return `${day}d`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function NotificationsBell({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items, unread } = await notificationsService.list(1);
      setItems(items);
      setUnread(unread);
    } catch {
      // 401 is expected for unauthenticated visitors — silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  async function handleItemClick(n: Notification) {
    if (!n.read && n._id) {
      try {
        await notificationsService.markRead(n._id);
        setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
        setUnread((u) => Math.max(0, u - 1));
      } catch {
        // ignore
      }
    }
  }

  async function handleMarkAllRead() {
    try {
      await notificationsService.markAllRead();
      setItems((prev) => prev.map((x) => ({ ...x, read: true })));
      setUnread(0);
    } catch {
      // ignore
    }
  }

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
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Notificações</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] text-brand hover:underline"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-500">Carregando…</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                Nenhuma notificação ainda.
              </div>
            ) : (
              items.map((n) => (
                <Link
                  key={n._id}
                  href={n.url}
                  onClick={() => handleItemClick(n)}
                  className={`block px-4 py-3 border-b border-slate-50 dark:border-slate-800 transition-colors ${
                    n.read
                      ? "bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      : "bg-brand-wash hover:bg-brand-tint dark:bg-slate-800/40 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] leading-snug ${n.read ? "text-slate-600 dark:text-slate-300" : "text-slate-800 dark:text-slate-100 font-medium"}`}>
                        {n.message}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {formatRelative(n.createdAt)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
