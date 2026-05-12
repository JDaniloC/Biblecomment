"use client";

import { useCallback, useEffect, useState } from "react";
import { usersService } from "@/services/users";

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

export interface UseTutorialOptions {
  /**
   * If true, `markCompleted` also persists the flag to the user's profile
   * via Server Action (best-effort — failures are logged, not thrown).
   */
  syncServer?: boolean;
  /**
   * Treat the tutorial as already completed without consulting localStorage.
   * Wire from `session.user.tutorialsCompleted.includes(name)` so a user who
   * finished on another device doesn't see the tour on a fresh browser.
   */
  initialFromServer?: boolean;
}

export interface UseTutorialResult {
  /**
   * Has the tour been finished or skipped?
   * `null` while we haven't yet read localStorage — let consumers decide
   * not to render anything until hydration finishes (avoids a flash where
   * the tour briefly opens for already-completed users).
   */
  isCompleted: boolean | null;
  /** Mark complete (call when the tour finishes or is dismissed). */
  markCompleted: () => void;
  /**
   * Clear the local flag — user clicked "Refazer tutorial". Local-only by
   * design: refazer the tour shouldn't reopen it on every other device the
   * user has signed into.
   */
  reset: () => void;
}

/**
 * localStorage-backed flag for whether a named tutorial has been finished
 * or skipped. With `syncServer: true`, completions are also pushed to the
 * user's profile so a fresh device picks them up via the auth session.
 *
 * SSR returns `null`; the effect hydrates to a boolean as soon as we're on
 * the client. With `initialFromServer: true`, hydration short-circuits to
 * `true` because the session already says so.
 */
export function useTutorial(
  name: string,
  options: UseTutorialOptions = {},
): UseTutorialResult {
  const { syncServer = false, initialFromServer = false } = options;
  const [completed, setCompleted] = useState<boolean | null>(null);

  // Hydrate from session-or-localStorage. Doing this in an effect (not the
  // useState initializer) avoids SSR/CSR mismatch — the server can't see
  // localStorage, so initial render is always `null`.
  useEffect(() => {
    if (initialFromServer) {
      setCompleted(true);
      return;
    }
    setCompleted(readFlag(name));
  }, [name, initialFromServer]);

  const markCompleted = useCallback(() => {
    writeFlag(name, true);
    setCompleted(true);
    if (syncServer) {
      // Fire-and-forget — UX shouldn't block on the server. Failures log
      // but don't throw; the next page load reads localStorage anyway.
      usersService.markTutorialCompleted(name).catch((err) => {
        if (typeof console !== "undefined") {
          console.warn("[tutorial] failed to sync completion to server:", err);
        }
      });
    }
  }, [name, syncServer]);

  const reset = useCallback(() => {
    writeFlag(name, false);
    setCompleted(false);
  }, [name]);

  return { isCompleted: completed, markCompleted, reset };
}
