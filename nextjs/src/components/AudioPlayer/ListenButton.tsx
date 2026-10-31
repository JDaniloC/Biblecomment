"use client";

import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { listenAction } from "@/lib/audio/player-state";

export function ListenButton({ abbrev, chapter }: { abbrev: string; chapter: number }) {
  const { isChapterAvailable, playChapter, toggle, state } = useAudioPlayer();
  if (!isChapterAvailable(abbrev, chapter)) return null;

  const isThisChapter = state.abbrev === abbrev && state.chapter === chapter;
  const playingThis = isThisChapter && state.isPlaying;

  return (
    <button
      type="button"
      data-testid="listen-button"
      aria-label={playingThis ? "Pausar este capítulo" : "Ouvir este capítulo"}
      // Pause/resume what is already playing here; only start over from scratch.
      onClick={() =>
        listenAction(state, abbrev, chapter) === "toggle" ? toggle() : void playChapter(abbrev, chapter)
      }
      className="inline-flex items-center gap-1 text-sm text-brand px-2 py-1"
    >
      <span aria-hidden>{playingThis ? "❚❚" : "▶"}</span>
      <span className="hidden sm:inline">Ouvir</span>
    </button>
  );
}
