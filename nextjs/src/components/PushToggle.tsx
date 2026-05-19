"use client";

import { useCallback, useEffect, useState } from "react";

type Status =
  | "loading"
  | "unsupported" // no SW / PushManager
  | "unconfigured" // server has no VAPID key
  | "denied" // OS/browser permission blocked
  | "on"
  | "off"
  | "busy";

function urlBase64ToBuffer(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out.buffer;
}

/**
 * Opt-in toggle for Web Push. Self-contained: feature-detects, fetches
 * the VAPID key, manages the PushSubscription + server registration.
 * Renders nothing when push is unsupported or unconfigured.
 */
export function PushToggle() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window)
      ) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      try {
        const res = await fetch("/api/push/public-key");
        const { publicKey } = await res.json();
        if (!publicKey) {
          if (!cancelled) setStatus("unconfigured");
          return;
        }
        if (Notification.permission === "denied") {
          if (!cancelled) setStatus("denied");
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setStatus(sub ? "on" : "off");
      } catch {
        if (!cancelled) setStatus("unsupported");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = useCallback(async () => {
    setStatus("busy");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus(perm === "denied" ? "denied" : "off");
        return;
      }
      const { publicKey } = await fetch("/api/push/public-key").then((r) =>
        r.json(),
      );
      if (!publicKey) {
        setStatus("unconfigured");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBuffer(publicKey),
      });
      const ok = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      }).then((r) => r.ok);
      setStatus(ok ? "on" : "off");
    } catch {
      setStatus("off");
    }
  }, []);

  const disable = useCallback(async () => {
    setStatus("busy");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => undefined);
        await sub.unsubscribe().catch(() => undefined);
      }
      setStatus("off");
    } catch {
      setStatus("on");
    }
  }, []);

  if (status === "loading" || status === "unsupported" || status === "unconfigured") {
    return null;
  }

  const base =
    "w-full flex items-center justify-between gap-3 px-4 py-2.5 text-[12px] border-b border-slate-100 dark:border-slate-800";

  if (status === "denied") {
    return (
      <div className={`${base} text-slate-400 dark:text-slate-500`}>
        <span>Notificações bloqueadas no navegador.</span>
      </div>
    );
  }

  const on = status === "on";
  return (
    <div className={`${base} text-slate-600 dark:text-slate-300`}>
      <span>{on ? "Notificações push ativadas" : "Receber notificações push"}</span>
      <button
        type="button"
        disabled={status === "busy"}
        onClick={on ? disable : enable}
        className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold transition disabled:opacity-60 ${
          on
            ? "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            : "bg-brand text-white hover:opacity-90"
        }`}
      >
        {status === "busy" ? "…" : on ? "Desativar" : "Ativar"}
      </button>
    </div>
  );
}
