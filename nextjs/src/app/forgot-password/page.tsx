"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usersService } from "@/services/users";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await usersService.requestPasswordReset(email);
    } finally {
      setLoading(false);
      setSubmitted(true);
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
            Recupere o acesso à sua conta.
          </h2>
          <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
            Enviaremos um link seguro para o seu e-mail. Ele expira em 30 minutos
            e só pode ser usado uma vez.
          </p>
          <blockquote className="border-l-4 border-amber-500 dark:border-amber-600 pl-4 py-1 italic text-stone-700 dark:text-stone-200">
            <p className="font-lora">
              &ldquo;O Senhor é o meu pastor; nada me faltará.&rdquo;
            </p>
            <cite className="block mt-2 not-italic text-sm font-semibold text-amber-700 dark:text-amber-300">
              — Salmos 23:1
            </cite>
          </blockquote>
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
              Esqueci minha senha
            </h1>
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
              Digite o e-mail da sua conta. Se ele estiver cadastrado, você
              receberá as instruções de redefinição.
            </p>
          </header>

          {submitted ? (
            <div
              role="status"
              data-testid="forgot-success"
              className="rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-4 text-sm text-emerald-800 dark:text-emerald-200"
            >
              <p className="font-medium">Verifique seu e-mail.</p>
              <p className="mt-1">
                Se houver uma conta cadastrada com esse endereço, enviamos um
                link de redefinição. Ele expira em 30 minutos.
              </p>
              <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-300/80">
                Não chegou? Cheque a pasta de spam ou{" "}
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setEmail("");
                  }}
                  className="underline"
                >
                  tentar de novo
                </button>
                .
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="forgot-email"
                  className="block text-sm font-medium text-stone-700 dark:text-stone-200 mb-1.5"
                >
                  Email
                </label>
                <div className="relative">
                  <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </span>
                  <input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="voce@exemplo.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-stone-800 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
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
                {loading ? "Enviando..." : "Enviar link de redefinição"}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-stone-500 dark:text-stone-400">
            Lembrou da senha?{" "}
            <Link
              href="/login"
              className="font-medium text-blue-700 dark:text-brand underline"
            >
              Entrar
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
