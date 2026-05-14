"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useNotification } from "@/contexts/NotificationContext";
import { usersService } from "@/services/users";
import Loading from "@/components/Loading";
import { AppHeader } from "@/components/AppHeader";

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
      const data = (await usersService.list(p)) as unknown as UserItem[];
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
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <AppHeader user={user} />

      <main id="main-content" className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="font-semibold text-2xl text-gray-800 dark:text-slate-100 mb-6">Usuários</h1>
        {loading && users.length === 0 ? (
          <Loading />
        ) : users.length === 0 ? (
          <div className="text-center text-gray-400 dark:text-slate-500 py-10">Nenhum usuário encontrado.</div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-800/50 text-left text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  <th scope="col" className="px-4 py-3">Usuário</th>
                  <th scope="col" className="px-4 py-3 hidden sm:table-cell">Crença</th>
                  <th scope="col" className="px-4 py-3 hidden sm:table-cell">Estado</th>
                  <th scope="col" className="px-4 py-3 text-right">Comentários</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition">
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-slate-100">
                      <Link
                        href={`/u/${u.username}`}
                        className="hover:underline text-blue-600 dark:text-brand"
                        data-testid={`users-row-${u.username}`}
                      >
                        {u.username}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-slate-400 hidden sm:table-cell">{u.belief || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-slate-400 hidden sm:table-cell">{u.stateName || "—"}</td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-slate-300">{u.total_comments}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {hasMore && !loading && (
              <div className="p-4 text-center">
                <button
                  onClick={() => { const next = page + 1; setPage(next); load(next); }}
                  className="text-sm text-blue-600 dark:text-brand hover:underline"
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
