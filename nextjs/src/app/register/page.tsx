"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usersService } from "@/services/users";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!acceptedTerms) {
      setError("É necessário aceitar os Termos de Uso e a Política de Privacidade.");
      return;
    }

    setLoading(true);
    try {
      await usersService.register({ email, username, password, acceptedTerms: true });
      router.push("/login");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e.response?.data?.error ?? e.message ?? "Erro ao cadastrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
          Bible Comment
        </h1>
        <h2 className="text-lg font-semibold mb-4 text-center text-gray-600">
          Criar Conta
        </h2>

        {error && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4 text-sm" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="register-username" className="block text-sm font-medium text-gray-700 mb-1">
              Nome de usuário
            </label>
            <input
              id="register-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label htmlFor="register-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label htmlFor="register-password" className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div className="flex items-start gap-2 pt-1">
            <input
              id="register-consent"
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              required
              className="mt-1 h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
            />
            <label htmlFor="register-consent" className="text-sm text-gray-600 leading-snug">
              Li e aceito a{" "}
              <Link href="/privacy" className="text-blue-600 hover:underline" target="_blank">
                Política de Privacidade
              </Link>{" "}
              e os{" "}
              <Link href="/terms" className="text-blue-600 hover:underline" target="_blank">
                Termos de Uso
              </Link>
              .
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !acceptedTerms}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? "Cadastrando..." : "Cadastrar"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Já tem conta?{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
