"use client";

import Link from "next/link";

interface SessionUser {
  name: string;
  email: string;
  username: string;
  moderator: boolean;
}

interface Props {
  user: SessionUser;
}

export default function AdminClient({ user }: Props) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Painel Admin</h1>
          <Link href="/home" className="text-sm text-blue-600 hover:underline">
            ← Voltar
          </Link>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <p className="text-gray-600 text-sm">Bem-vindo, <strong>{user.name}</strong>.</p>
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/api/backup/comments"
            target="_blank"
            className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-400 transition"
          >
            <h2 className="font-semibold text-gray-800">Backup Comentários</h2>
            <p className="text-sm text-gray-500 mt-1">Exportar todos os comentários em JSON</p>
          </Link>
          <Link
            href="/api/backup/discussions"
            target="_blank"
            className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-400 transition"
          >
            <h2 className="font-semibold text-gray-800">Backup Discussões</h2>
            <p className="text-sm text-gray-500 mt-1">Exportar todas as discussões em JSON</p>
          </Link>
          <Link
            href="/api/backup/users"
            target="_blank"
            className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-400 transition"
          >
            <h2 className="font-semibold text-gray-800">Backup Usuários</h2>
            <p className="text-sm text-gray-500 mt-1">Exportar todos os usuários em JSON</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
