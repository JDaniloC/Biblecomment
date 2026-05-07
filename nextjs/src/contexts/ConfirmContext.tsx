"use client";

import React, { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";

type Variant = "default" | "danger";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(async () => false);

interface PendingState extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingState | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...opts, resolve });
    });
  }, []);

  const close = useCallback((ok: boolean) => {
    setPending((curr) => {
      curr?.resolve(ok);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!pending) return;
    previousActiveRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    // Focus the confirm button (last focusable) so Enter is the affirmative
    // path, matching native confirm() behavior.
    if (focusables && focusables.length > 0) {
      focusables[focusables.length - 1].focus();
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(false);
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const list = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
      previousActiveRef.current?.focus?.();
    };
  }, [pending, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => close(false)}
            aria-hidden="true"
          />
          <div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="relative z-10 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 focus:outline-none"
          >
            <h2 id={titleId} className="text-base font-semibold text-slate-800 dark:text-slate-100">
              {pending.title}
            </h2>
            {pending.description && (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {pending.description}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => close(false)}
                className="px-4 h-9 rounded-md text-sm font-medium text-slate-700 dark:text-slate-200 bg-transparent border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                {pending.cancelLabel ?? "Cancelar"}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                data-variant={pending.variant ?? "default"}
                className={[
                  "px-4 h-9 rounded-md text-sm font-semibold text-white border-none transition cursor-pointer",
                  pending.variant === "danger"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-brand hover:opacity-90",
                ].join(" ")}
              >
                {pending.confirmLabel ?? "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}
