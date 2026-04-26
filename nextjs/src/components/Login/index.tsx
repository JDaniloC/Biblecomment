"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { login, logout } from "@/services/auth";
import { useNotification } from "@/contexts/NotificationContext";

export default function Login() {
  const router = useRouter();
  const { data: session } = useSession();
  const { handleNotification } = useNotification();

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const handleToggle = () => setIsLoginMode((prev) => !prev);

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
      try {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, username: name, password }),
        });
        const data = await res.json();
        if (res.ok) {
          setIsLoginMode(true);
          handleNotification("success", "Cadastro realizado com sucesso!");
        } else {
          handleNotification("error", data.error ?? "Erro ao cadastrar");
        }
      } catch (err) {
        handleNotification("error", String(err));
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  if (session?.user) {
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-gray-600">Bem-vindo, <strong>{session.user.name}</strong></p>
        <button
          type="button"
          onClick={handleLogout}
          className="text-sm text-red-500 hover:text-red-700 border border-red-300 px-4 py-1.5 rounded-lg transition"
        >
          Sair
        </button>
      </div>
    );
  }

  return (
    <div className="login-container w-full">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full">
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
          onClick={handleToggle}
          className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 rounded-lg transition"
        >
          {isLoginMode ? "Cadastrar" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
