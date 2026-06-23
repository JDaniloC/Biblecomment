"use client";

import { useAudioPlayer } from "@/contexts/AudioPlayerContext";

export function ListenButton({ abbrev, chapter }: { abbrev: string; chapter: number }) {
  const { isChapterAvailable, playChapter, state } = useAudioPlayer();
  if (!isChapterAvailable(abbrev, chapter)) return null;

  const isThisChapter = state.abbrev === abbrev && state.chapter === chapter;
  const playingThis = isThisChapter && state.isPlaying;

  return (
    <button
      type="button"
      data-testid="listen-button"
      aria-label={playingThis ? "Tocando este capítulo" : "Ouvir este capítulo"}
      onClick={() => playChapter(abbrev, chapter)}
      className="inline-flex items-center gap-1 text-sm text-brand px-2 py-1"
    >
      <span aria-hidden>{playingThis ? "❚❚" : "▶"}</span>
      <span className="hidden sm:inline">Ouvir</span>
    </button>
  );
}
