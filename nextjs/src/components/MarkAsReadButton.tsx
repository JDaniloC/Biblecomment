"use client";

import { useState, useTransition } from "react";
import { chapterProgressService } from "@/services/chapter-progress";
import { useNotification } from "@/contexts/NotificationContext";
import { getBadge } from "@/lib/badges/catalog";

interface Props {
  abbrev: string;
  chapter: number;
  initialRead: boolean;
  /** Hides the button when not signed in. */
  enabled: boolean;
}

/**
 * Toggles the user's "I've read this chapter" mark.
 *
 * - On mark: optimistic flip → server call → if `unlockedBadges` returns,
 *   raises a NotificationContext toast for each one ("Conquista desbloqueada: …").
 * - On error: reverts optimistic state and surfaces the error via toast.
 * - Disabled (anonymous viewers): button doesn't render.
 */
export function MarkAsReadButton({ abbrev, chapter, initialRead, enabled }: Props) {
  const [read, setRead] = useState(initialRead);
  const [pending, startTransition] = useTransition();
  const { handleNotification } = useNotification();

  if (!enabled) return null;

  const onClick = () => {
    if (pending) return;
    const next = !read;
    setRead(next); // optimistic
    startTransition(async () => {
      try {
        if (next) {
          const result = await chapterProgressService.markRead(abbrev, chapter);
          for (const id of result.unlockedBadges) {
            const def = getBadge(id);
            handleNotification(
              "success",
              `Conquista desbloqueada: ${def?.name ?? id}`,
            );
          }
        } else {
          await chapterProgressService.unmarkRead(abbrev, chapter);
        }
      } catch (err) {
        setRead(!next); // revert
        const msg = err instanceof Error ? err.message : "Erro ao marcar capítulo.";
        handleNotification("error", msg);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={read}
      data-testid="mark-as-read"
      disabled={pending}
      className={[
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] font-medium",
        "border transition disabled:opacity-60 disabled:cursor-not-allowed",
        read
          ? "bg-brand text-white border-brand hover:bg-brand-tint"
          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-brand hover:text-brand",
      ].join(" ")}
    >
      {read ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      )}
      <span>{read ? "Lido" : "Marcar como lido"}</span>
    </button>
  );
}
