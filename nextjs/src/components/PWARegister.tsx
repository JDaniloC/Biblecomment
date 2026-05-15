"use client";

import { useEffect } from "react";

// Registers the service worker in production builds only. Dev builds skip
// registration to avoid HMR/cache headaches.
export default function PWARegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {
          // Registration failed (HTTP, blocked, etc). Silently ignore —
          // the site continues to work without offline support.
        });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  return null;
}
