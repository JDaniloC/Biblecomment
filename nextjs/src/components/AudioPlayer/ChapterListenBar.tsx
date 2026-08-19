"use client";

import { useEffect, useState } from "react";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";

/**
 * Mobile-only "start listening" prompt, pinned to the same bottom slot the
 * MiniPlayer uses once engaged. Fills the idle gap so *some* audio bar is
 * always visible while reading a chapter with narration, instead of the
 * entry point being buried in the header's "⋮" menu.
 */
export function ChapterListenBar({ abbrev, chapter }: { abbrev: string; chapter: number }) {
  const { isChapterAvailable, playChapter, state } = useAudioPlayer();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // MiniPlayer owns this slot once anything is engaged, for any chapter.
  if (!mounted || state.status !== "idle" || !isChapterAvailable(abbrev, chapter)) {
    return null;
  }

  return (
    <div
      data-testid="chapter-listen-bar"
      // z-[45]: below Modal's z-50 (so an open modal's backdrop correctly
      // dims this instead of it painting through), above MobileTabBar's z-40.
      className="md:hidden fixed inset-x-0 z-[45] px-3 pb-[env(safe-area-inset-bottom)]
                 bottom-[calc(3.5rem+env(safe-area-inset-bottom))]"
    >
      <button
        type="button"
        data-testid="chapter-listen-bar-button"
        aria-label="Ouvir este capítulo"
        onClick={() => playChapter(abbrev, chapter)}
        className="mx-auto max-w-2xl w-full flex items-center justify-center gap-2 rounded-t-xl
                   bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700
                   shadow-lg px-3 py-2.5 text-sm font-medium text-brand"
      >
        <span aria-hidden>▶</span>
        Ouvir este capítulo
      </button>
    </div>
  );
}
