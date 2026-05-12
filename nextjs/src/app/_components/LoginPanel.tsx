"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import Link from "next/link";
import type { Session } from "next-auth";
import { login } from "@/services/auth";
import { useNotification } from "@/contexts/NotificationContext";

interface Props {
  session: Session | null;
}

export default function LoginPanel({ session }: Props) {
  const router = useRouter();
  const { handleNotification } = useNotification();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  if (session?.user) {
    return (
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-gray-700">
          Bem-vindo, <strong>{session.user.name}</strong>!
        </p>
        <div className="flex gap-3">
          <Link
            href="/home"
            className="bg-blue-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Ir para os Livros
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-sm text-red-500 hover:text-red-700 border border-red-300 px-4 py-2 rounded-lg transition"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoginMode) {
      const result = await login(email, password);
      if (result.ok) {
        handleNotification("success", "Login realizado com sucesso!");
        router.refresh();
      } else {
        handleNotification("error", result.error ?? "Credenciais inválidas");
      }
    } else {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username: name, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsLoginMode(true);
        handleNotification("success", "Cadastro realizado! Faça login.");
      } else {
        handleNotification("error", data.error ?? "Erro ao cadastrar");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-gray-700 text-center mb-1">
        {isLoginMode ? "Entrar na conta" : "Criar conta"}
      </h2>
      <input
        type="email"
        value={email}
        placeholder="E-mail"
        onChange={(e) => setEmail(e.target.value)}
        required
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
      />
      {!isLoginMode && (
        <input
          type="text"
          value={name}
          maxLength={15}
          placeholder="Nome de usuário"
          onChange={(e) => setName(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
        />
      )}
      <input
        type="password"
        value={password}
        placeholder="Senha"
        onChange={(e) => setPassword(e.target.value)}
        required
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
      />
      <button
        type="submit"
        className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 rounded-lg transition"
      >
        {isLoginMode ? "Entrar" : "Cadastrar"}
      </button>
      <hr />
      <button
        type="button"
        onClick={() => setIsLoginMode((v) => !v)}
        className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 rounded-lg transition"
      >
        {isLoginMode ? "Não tenho conta" : "Já tenho conta"}
      </button>
    </form>
  );
}
