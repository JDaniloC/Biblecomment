"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") || "/home";
  const justReset = searchParams?.get("reset") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Credenciais inválidas — verifique email/usuário e senha.");
    } else {
      router.push(callbackUrl);
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-stone-50 dark:bg-slate-950">
      {/* Branded panel — desktop only. Visual rest stop reinforcing the
          product before the user types credentials. */}
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
            Estude, comente e cresça em comunidade.
          </h2>
          <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
            Mais de 30.000 versículos abertos ao estudo coletivo. Compartilhe
            comentários devocionais, exegéticos e pessoais com outros leitores.
          </p>
          <blockquote className="border-l-4 border-amber-500 dark:border-amber-600 pl-4 py-1 italic text-stone-700 dark:text-stone-200">
            <p className="font-lora">
              &ldquo;A tua palavra é lâmpada para os meus pés e luz para o meu
              caminho.&rdquo;
            </p>
            <cite className="block mt-2 not-italic text-sm font-semibold text-amber-700 dark:text-amber-300">
              — Salmos 119:105
            </cite>
          </blockquote>
        </div>

        <p className="text-xs text-stone-500 dark:text-stone-400">
          &copy; {new Date().getFullYear()} Bible Comment
        </p>
      </aside>

      {/* Form panel */}
      <main
        id="main-content"
        className="flex flex-col items-center justify-center px-4 py-10 md:py-16"
      >
        <div className="w-full max-w-sm">
          {/* Mobile-only logo */}
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
              Entrar
            </h1>
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
              Acesse sua conta para comentar e participar das discussões.
            </p>
          </header>

          {justReset && !error && (
            <div
              role="status"
              data-testid="reset-success"
              className="mb-4 rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200"
            >
              Senha redefinida com sucesso. Faça login com a nova senha.
            </div>
          )}

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
                htmlFor="login-email"
                className="block text-sm font-medium text-stone-700 dark:text-stone-200 mb-1.5"
              >
                Email ou nome de usuário
              </label>
              <div className="relative">
                <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </span>
                <input
                  id="login-email"
                  type="text"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="voce@exemplo.com ou seu_nome"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-stone-800 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-stone-700 dark:text-stone-200 mb-1.5"
              >
                Senha
              </label>
              <div className="relative">
                <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
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
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm">
            <Link
              href="/forgot-password"
              className="font-medium text-blue-700 dark:text-brand hover:underline"
            >
              Esqueci minha senha
            </Link>
          </p>

          <p className="mt-6 text-center text-sm text-stone-500 dark:text-stone-400">
            Não tem conta?{" "}
            <Link
              href="/register"
              className="font-medium text-blue-700 dark:text-brand underline"
            >
              Cadastrar-se
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
