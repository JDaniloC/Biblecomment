"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { confirmEmailVerificationAction } from "@/app/actions/email-verification";
import { Logo } from "@/components/Logo";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? "";
  const { update: updateSession } = useSession();

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    if (!token || submitting) return;
    setSubmitting(true);
    setError("");
    const res = await confirmEmailVerificationAction(token);
    if (res.ok) {
      // Refresh JWT before showing success so subsequent page loads
      // (e.g. /profile) pick up the new emailVerified flag and, for
      // email-change confirmations, the promoted email address.
      await updateSession({
        emailVerified: true,
        pendingEmail: null,
        ...(res.data.newEmail ? { email: res.data.newEmail } : {}),
      });
      setDone(true);
    } else {
      setError(res.error);
    }
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-8 shadow-sm">
        <div className="flex flex-col items-center mb-6">
          <Logo width={40} height={40} />
          <h1 className="font-lora text-2xl font-bold text-stone-800 dark:text-stone-100 mt-3 text-center">
            Confirmar e-mail
          </h1>
        </div>

        {!token && (
          <p className="text-sm text-red-600 dark:text-red-400 text-center">
            Link inválido. Solicite um novo no seu perfil.
          </p>
        )}

        {token && !done && !error && (
          <>
            <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed text-center mb-6">
              Clique abaixo para confirmar a verificação do seu e-mail no Bible Comment.
            </p>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              data-testid="verify-email-confirm"
              className="w-full bg-brand text-white py-2.5 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition"
            >
              {submitting ? "Confirmando…" : "Confirmar verificação"}
            </button>
          </>
        )}

        {done && (
          <div className="text-center" data-testid="verify-email-success">
            <p className="text-sm text-green-700 dark:text-green-400 mb-4">
              E-mail verificado com sucesso!
            </p>
            <button
              type="button"
              onClick={() => router.push("/home")}
              className="w-full bg-brand text-white py-2.5 rounded-lg font-semibold hover:opacity-90 transition"
            >
              Voltar para o app
            </button>
          </div>
        )}

        {error && (
          <div role="alert" className="text-center" data-testid="verify-email-error">
            <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
            <Link
              href="/profile?verify=1"
              className="inline-block text-sm font-semibold text-brand underline"
            >
              Solicitar novo link
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
