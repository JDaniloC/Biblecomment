"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_PREFIX = "tutorial:";

function key(name: string): string {
  return `${STORAGE_PREFIX}${name}:completed`;
}

function readFlag(name: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(key(name)) === "1";
  } catch {
    // Private mode / quota errors — treat as "not completed" but don't
    // throw. The user simply sees the tour every visit; not ideal but
    // safer than crashing the page.
    return false;
  }
}

function writeFlag(name: string, completed: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (completed) window.localStorage.setItem(key(name), "1");
    else window.localStorage.removeItem(key(name));
  } catch {
    // Same fallback as readFlag.
  }
}

export interface UseTutorialResult {
  /**
   * Has the tour been finished or skipped on this device?
   * `null` while we haven't yet read localStorage — let consumers decide
   * not to render anything until hydration finishes (avoids a flash where
   * the tour briefly opens for already-completed users).
   */
  isCompleted: boolean | null;
  /** Mark complete (call when the tour finishes or is dismissed). */
  markCompleted: () => void;
  /** Clear the flag — user clicked "Refazer tutorial". */
  reset: () => void;
}

/**
 * Tiny localStorage-backed flag for whether a named tutorial has been
 * finished or skipped. SSR returns `null`; the effect hydrates to a
 * boolean as soon as we're on the client.
 */
export function useTutorial(name: string): UseTutorialResult {
  const [completed, setCompleted] = useState<boolean | null>(null);

  // Hydrate from localStorage on the client. Doing this in an effect (not
  // useState initializer) avoids SSR/CSR mismatch — server can't see
  // localStorage, so initial render is always `null`.
  useEffect(() => {
    setCompleted(readFlag(name));
  }, [name]);

  const markCompleted = useCallback(() => {
    writeFlag(name, true);
    setCompleted(true);
  }, [name]);

  const reset = useCallback(() => {
    writeFlag(name, false);
    setCompleted(false);
  }, [name]);

  return { isCompleted: completed, markCompleted, reset };
}
