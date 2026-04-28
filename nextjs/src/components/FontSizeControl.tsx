"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "bc-text-scale";
const MIN = 0.85;
const MAX = 1.4;
const STEP = 0.1;
const DEFAULT = 1;

export function FontSizeControl({ className = "" }: { className?: string }) {
  const [scale, setScale] = useState<number>(DEFAULT);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? parseFloat(stored) : NaN;
    const initial = Number.isFinite(parsed) ? Math.min(MAX, Math.max(MIN, parsed)) : DEFAULT;
    setScale(initial);
    document.documentElement.style.setProperty("--bc-text-scale", String(initial));
    setMounted(true);
  }, []);

  function apply(next: number) {
    const clamped = Math.min(MAX, Math.max(MIN, Math.round(next * 10) / 10));
    setScale(clamped);
    document.documentElement.style.setProperty("--bc-text-scale", String(clamped));
    window.localStorage.setItem(STORAGE_KEY, String(clamped));
  }

  if (!mounted) {
    return <div className={`inline-flex items-center gap-1 ${className}`} style={{ width: 64 }} aria-hidden />;
  }

  return (
    <div className={`inline-flex items-center gap-0.5 ${className}`} role="group" aria-label="Tamanho do texto">
      <button
        type="button"
        onClick={() => apply(scale - STEP)}
        disabled={scale <= MIN + 0.001}
        aria-label="Diminuir tamanho do texto"
        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition disabled:opacity-40 disabled:hover:bg-transparent"
      >
        A−
      </button>
      <button
        type="button"
        onClick={() => apply(DEFAULT)}
        aria-label="Resetar tamanho do texto"
        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[10px] font-medium text-slate-400 hover:bg-slate-100 dark:text-slate-500 dark:hover:bg-slate-800 transition"
        title={`${Math.round(scale * 100)}%`}
      >
        {Math.round(scale * 100)}%
      </button>
      <button
        type="button"
        onClick={() => apply(scale + STEP)}
        disabled={scale >= MAX - 0.001}
        aria-label="Aumentar tamanho do texto"
        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition disabled:opacity-40 disabled:hover:bg-transparent"
      >
        A+
      </button>
    </div>
  );
}
