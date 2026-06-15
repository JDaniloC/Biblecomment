"use client";

import { useEffect } from "react";

// Registers the service worker in production builds only. Dev builds skip
// registration to avoid HMR/cache headaches.
//
// Registration runs as soon as this effect fires (post-hydration, after the
// first paint) instead of waiting for `window.load`. Deferring to `load` made
// tools that probe for a worker early — PWABuilder, some PWA audits — report
// "no service worker" for this JS-registered SW. The effect already runs off
// the critical render path, so registering eagerly costs nothing on perf.
export default function PWARegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Registration failed (HTTP, blocked, etc). Silently ignore —
      // the site continues to work without offline support.
    });
  }, []);

  return null;
}
