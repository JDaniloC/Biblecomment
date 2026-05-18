"use client";

import { useState, useCallback } from "react";
import Modal from "@/components/Modal";
import { useNotification } from "@/contexts/NotificationContext";
import {
  formatCommentShareUrl,
  formatCommentShare,
  clampForCard,
} from "@/lib/share-comment";

interface Props {
  commentId: string;
  text: string;
  username: string;
  /** Human reference, e.g. "Gênesis 1:1" (comment.bookReference). */
  reference: string;
  className?: string;
}

const ICON_BTN =
  "flex items-center gap-[5px] px-2 h-[26px] rounded-[5px] border-none bg-transparent cursor-pointer font-medium text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap ml-0.5";

export function ShareCommentButton({
  commentId,
  text,
  username,
  reference,
  className = "",
}: Props) {
  const { handleNotification } = useNotification();
  const [open, setOpen] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = formatCommentShareUrl(commentId, origin);
  const ogUrl = `${origin}/api/og/comment/${commentId}`;
  const shareText = formatCommentShare(
    { text: clampForCard(text), username, reference },
    shareUrl,
  );

  const onWebShare = useCallback(async () => {
    const nav = navigator as Navigator & {
      canShare?: (d: ShareData) => boolean;
    };
    try {
      // Try sharing the actual image file where supported (iOS Safari etc).
      try {
        const blob = await (await fetch(ogUrl)).blob();
        const file = new File([blob], "comentario.png", { type: "image/png" });
        if (nav.canShare?.({ files: [file] })) {
          await nav.share({ files: [file], text: shareText, url: shareUrl });
          return;
        }
      } catch {
        /* fall through to text/url share */
      }
      await nav.share({ text: shareText, url: shareUrl });
    } catch (e) {
      // User dismissed the native sheet — not an error.
      if ((e as Error)?.name !== "AbortError") {
        handleNotification("error", "Não foi possível compartilhar.");
      }
    }
  }, [ogUrl, shareText, shareUrl, handleNotification]);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      handleNotification("success", "Link e texto copiados.");
    } catch {
      handleNotification("error", "Não foi possível copiar.");
    }
  }, [shareText, handleNotification]);

  const canWebShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        title="Compartilhar comentário"
        aria-label="Compartilhar comentário"
        className={`${ICON_BTN} ${className}`}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        Compartilhar
      </button>

      <Modal
        show={open}
        onClose={() => setOpen(false)}
        title="Compartilhar comentário"
        size="md"
        ariaLabel="Compartilhar comentário"
      >
        <div className="flex flex-col gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ogUrl}
            alt="Pré-visualização do card do comentário"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700"
          />
          <div className="flex flex-wrap gap-2">
            {canWebShare && (
              <button
                type="button"
                onClick={onWebShare}
                className="flex-1 min-w-[120px] bg-brand text-white text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition"
              >
                Compartilhar
              </button>
            )}
            <button
              type="button"
              onClick={onCopy}
              className="flex-1 min-w-[120px] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Copiar link + texto
            </button>
            <a
              href={ogUrl}
              download="comentario.png"
              className="flex-1 min-w-[120px] text-center border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Baixar imagem
            </a>
          </div>
        </div>
      </Modal>
    </>
  );
}
