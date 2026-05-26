"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

const DISMISS_KEY = "bc:email-verify-banner-dismissed";

export function EmailVerificationBanner() {
  const { data: session, status } = useSession();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(typeof window !== "undefined" && sessionStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (status !== "authenticated") return null;
  if (session.user.emailVerified) return null;
  if (dismissed) return null;

  return (
    <div
      role="status"
      data-testid="email-verification-banner"
      className="w-full bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/50 px-4 py-2 flex items-center gap-3 text-sm"
    >
      <span className="text-amber-800 dark:text-amber-200 flex-1">
        Verifique seu e-mail para comentar e ganhar o selo de verificado.
      </span>
      <Link
        href="/profile?verify=1"
        data-testid="email-verification-banner-cta"
        className="font-semibold text-amber-900 dark:text-amber-100 underline whitespace-nowrap"
      >
        Verificar agora
      </Link>
      <button
        type="button"
        aria-label="Dispensar"
        onClick={() => {
          sessionStorage.setItem(DISMISS_KEY, "1");
          setDismissed(true);
        }}
        className="text-amber-700 dark:text-amber-300 hover:opacity-70"
      >
        ✕
      </button>
    </div>
  );
}
