"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import axios from "axios";
import { useNotification } from "@/contexts/NotificationContext";
import Loading from "@/components/Loading";

interface SessionUser {
  name: string;
  email: string;
  username: string;
  moderator: boolean;
}

interface UserItem {
  _id: string;
  username: string;
  email: string;
  belief: string;
  stateName: string;
  total_comments: number;
}

export default function UsersClient({ user }: { user: SessionUser }) {
  const { handleNotification } = useNotification();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const { data } = await axios.get<UserItem[]>(`/api/users?pages=${p}`);
      if (p === 1) setUsers(data);
      else setUsers((prev) => [...prev, ...data]);
      if (data.length < 5) setHasMore(false);
    } catch {
      handleNotification("error", "Erro ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  }, [handleNotification]);

  useEffect(() => { load(1); }, [load]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/home" className="text-blue-600 hover:text-blue-800 text-sm">← Livros</Link>
          <h1 className="font-semibold text-gray-800">Usuários</h1>
          <Link href="/profile" className="text-sm text-gray-500 hover:text-gray-700">{user.name}</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {loading && users.length === 0 ? (
          <Loading />
        ) : users.length === 0 ? (
          <div className="text-center text-gray-400 py-10">Nenhum usuário encontrado.</div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Usuário</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Crença</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Estado</th>
                  <th className="px-4 py-3 text-right">Comentários</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium text-gray-800">{u.username}</td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{u.belief || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{u.stateName || "—"}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{u.total_comments}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {hasMore && !loading && (
              <div className="p-4 text-center">
                <button
                  onClick={() => { const next = page + 1; setPage(next); load(next); }}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Carregar mais
                </button>
              </div>
            )}
            {loading && <div className="p-4"><Loading /></div>}
          </div>
        )}
      </main>
    </div>
  );
}
