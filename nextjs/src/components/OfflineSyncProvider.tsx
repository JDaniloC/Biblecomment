"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { syncOfflineBible } from "@/lib/offline/bibleSync";

// localStorage flag for the "Disponibilizar a Bíblia offline" toggle.
// Default ON: absence of the key means enabled. Shared with the profile
// settings card (Task 10).
export const OFFLINE_BIBLE_PREF_KEY = "bc-offline-bible";

export function isOfflineBibleEnabled(): boolean {
  if (typeof window === "undefined") return false;
  // Default ON — only an explicit "0" disables it.
  return window.localStorage.getItem(OFFLINE_BIBLE_PREF_KEY) !== "0";
}

// Kicks off the background dataset download and warms the /leitura-offline
// shell so it can hydrate offline. Gating mirrors PWARegister and adds a
// service-worker capability check: production only, SW-capable browser only
// (with no SW the offline shell can never be served, so downloading the
// dataset would be wasted bandwidth), and only when currently online. Runs in
// requestIdleCallback so the first paint is never delayed.
export default function OfflineSyncProvider() {
  const router = useRouter();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (navigator.onLine === false) return;

    const run = () => {
      // Warm the offline reading shell's route chunk while online so the SW's
      // _next/static cache-first rule stores it. Without this, the precached
      // `/leitura-offline` HTML would have no JS to hydrate when served offline.
      router.prefetch("/leitura-offline");
      syncOfflineBible({ enabled: isOfflineBibleEnabled() }).catch(() => {
        // syncOfflineBible never rejects, but guard anyway so a future change
        // can't surface an unhandled rejection on the home screen.
      });
    };

    // requestIdleCallback isn't in Safari < 17; fall back to a short timeout.
    const ric =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(run, { timeout: 4000 })
        : window.setTimeout(run, 1500);

    return () => {
      if (typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(ric as number);
      } else {
        window.clearTimeout(ric as number);
      }
    };
    // router is stable across renders; run this once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
