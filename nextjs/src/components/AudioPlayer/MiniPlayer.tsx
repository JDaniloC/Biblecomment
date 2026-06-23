"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";

const RATES = [0.75, 1, 1.25, 1.5, 2];

export function MiniPlayer() {
  const { state, toggle, seekBy, setRate, next, stop } = useAudioPlayer();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Hidden until a chapter is engaged.
  if (!mounted || state.abbrev == null || state.chapter == null || state.status === "idle") {
    return null;
  }

  const label = `${state.abbrev.toUpperCase()} ${state.chapter}`;
  const isPlaying = state.isPlaying && state.status !== "error";

  const bar = (
    <div
      data-testid="mini-player"
      className="fixed inset-x-0 z-50 px-3 pb-[env(safe-area-inset-bottom)]
                 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] md:bottom-0"
    >
      <div className="mx-auto max-w-2xl flex items-center gap-2 rounded-t-xl md:rounded-xl
                      bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700
                      shadow-lg px-3 py-2">
        <button
          type="button"
          aria-label={isPlaying ? "Pausar" : "Tocar"}
          data-testid="mini-player-toggle"
          onClick={toggle}
          className="shrink-0 w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center"
        >
          {isPlaying ? "❚❚" : "▶"}
        </button>
        <button type="button" aria-label="Voltar 15 segundos" onClick={() => seekBy(-15000)}
                className="shrink-0 text-sm px-2 py-1 text-slate-600 dark:text-slate-300">-15s</button>
        <button type="button" aria-label="Avançar 15 segundos" onClick={() => seekBy(15000)}
                className="shrink-0 text-sm px-2 py-1 text-slate-600 dark:text-slate-300">+15s</button>

        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{label}</p>
          <p className="truncate text-xs text-slate-500">
            {state.status === "loading" ? "Carregando…"
              : state.status === "error" ? "Erro ao tocar"
              : "Bíblia narrada"}
          </p>
        </div>

        <select
          aria-label="Velocidade"
          data-testid="mini-player-rate"
          value={state.rate}
          onChange={(e) => setRate(Number(e.target.value))}
          className="shrink-0 text-sm bg-transparent border border-slate-300 dark:border-slate-600 rounded px-1 py-0.5"
        >
          {RATES.map((r) => (
            <option key={r} value={r}>{r}×</option>
          ))}
        </select>

        <button type="button" aria-label="Próximo capítulo" onClick={next}
                className="shrink-0 text-sm px-2 py-1 text-slate-600 dark:text-slate-300">⏭</button>
        <button type="button" aria-label="Fechar player" data-testid="mini-player-close" onClick={stop}
                className="shrink-0 text-slate-400 px-1">✕</button>
      </div>
    </div>
  );

  return createPortal(bar, document.body);
}
