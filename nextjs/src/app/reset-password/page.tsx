"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { usersService } from "@/services/users";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) router.replace("/forgot-password");
  }, [token, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Senha inválida (mínimo 6 caracteres).");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      await usersService.completePasswordReset(token, password);
      router.push("/login?reset=1");
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? "Erro ao redefinir senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-stone-50 dark:bg-slate-950">
      <aside
        aria-hidden="true"
        className="hidden md:flex flex-col justify-between bg-gradient-to-br from-amber-50 to-stone-100 dark:from-slate-900 dark:to-slate-950 p-12 border-r border-stone-200 dark:border-slate-800"
      >
        <Link href="/" className="flex items-center gap-3 no-underline">
          <Image src="/assets/logo.svg" alt="" width={40} height={40} />
          <div>
            <div className="font-bold text-stone-800 dark:text-stone-100 leading-tight">
              Bible Comment
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400">
              A Program for His Glory
            </div>
          </div>
        </Link>

        <div className="space-y-6 max-w-sm">
          <h2 className="font-lora text-3xl lg:text-4xl font-bold text-stone-800 dark:text-stone-100 leading-tight">
            Defina uma nova senha.
          </h2>
          <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
            Escolha uma senha forte com pelo menos 6 caracteres. Use uma
            combinação que você não usa em outros sites.
          </p>
          <ul className="space-y-2 text-sm text-stone-600 dark:text-stone-300">
            <li className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-0.5 text-amber-700 dark:text-amber-300">•</span>
              Mínimo de 6 caracteres.
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-0.5 text-amber-700 dark:text-amber-300">•</span>
              Misture letras, números e símbolos.
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-0.5 text-amber-700 dark:text-amber-300">•</span>
              Não reaproveite senhas de outros serviços.
            </li>
          </ul>
        </div>

        <p className="text-xs text-stone-500 dark:text-stone-400">
          &copy; {new Date().getFullYear()} Bible Comment
        </p>
      </aside>

      <main
        id="main-content"
        className="flex flex-col items-center justify-center px-4 py-10 md:py-16"
      >
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="md:hidden flex items-center justify-center gap-2 mb-8 no-underline"
          >
            <Image src="/assets/logo.svg" alt="" width={32} height={32} />
            <span className="font-bold text-stone-800 dark:text-stone-100">
              Bible Comment
            </span>
          </Link>

          <header className="mb-8">
            <h1 className="font-lora text-3xl font-bold text-stone-800 dark:text-stone-100">
              Redefinir senha
            </h1>
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
              Crie uma nova senha para acessar sua conta.
            </p>
          </header>

          {error && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="reset-password"
                className="block text-sm font-medium text-stone-700 dark:text-stone-200 mb-1.5"
              >
                Nova senha
              </label>
              <div className="relative">
                <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  id="reset-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-stone-800 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="reset-password-confirm"
                className="block text-sm font-medium text-stone-700 dark:text-stone-200 mb-1.5"
              >
                Confirmar nova senha
              </label>
              <div className="relative">
                <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  id="reset-password-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-stone-800 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full inline-flex items-center justify-center gap-2 bg-brand text-white py-2.5 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading && (
                <svg
                  className="animate-spin"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
                  <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              )}
              {loading ? "Redefinindo..." : "Redefinir senha"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-stone-500 dark:text-stone-400">
            Token expirado?{" "}
            <Link
              href="/forgot-password"
              className="font-medium text-blue-700 dark:text-brand underline"
            >
              Solicitar de novo
            </Link>
          </p>

          <div className="mt-8 pt-6 border-t border-stone-200 dark:border-slate-800 text-center text-xs text-stone-400 dark:text-stone-500">
            <Link href="/" className="hover:text-stone-600 dark:hover:text-stone-300 transition">
              ← Voltar à página inicial
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
