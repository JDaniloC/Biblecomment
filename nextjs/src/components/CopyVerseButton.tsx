"use client";

import { useState, useCallback } from "react";
import { useNotification } from "@/contexts/NotificationContext";
import { formatVerseShare, type ShareableVerse } from "@/lib/share-verse";

interface Props {
  verse: ShareableVerse;
  className?: string;
  label?: string;
}

export function CopyVerseButton({ verse, className = "", label = "Copiar com referência" }: Props) {
  const { handleNotification } = useNotification();
  const [copied, setCopied] = useState(false);

  const onClick = useCallback(async () => {
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const text = formatVerseShare(verse, origin);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      handleNotification("success", "Versículo copiado para a área de transferência.");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      handleNotification("error", "Não foi possível copiar. Verifique as permissões do navegador.");
    }
  }, [verse, handleNotification]);

  const accessibleLabel = label || "Copiar versículo com referência";

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={accessibleLabel}
      aria-label={accessibleLabel}
      className={`inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 hover:text-brand dark:hover:text-brand transition px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800 ${className}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {copied ? (
          <polyline points="20 6 9 17 4 12" />
        ) : (
          <>
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </>
        )}
      </svg>
      {label && <span>{copied ? "Copiado!" : label}</span>}
      {!label && copied && <span className="sr-only">Copiado!</span>}
    </button>
  );
}
