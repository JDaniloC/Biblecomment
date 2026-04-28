"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useNotification } from "@/contexts/NotificationContext";
import { discussionsService } from "@/services/discussions";
import Loading from "@/components/Loading";

interface SessionUser {
  name: string;
  email: string;
  username: string;
  moderator: boolean;
}

interface DiscussionSummary {
  _id: string;
  question: string;
  username: string;
  bookAbbrev: string;
  verseReference: string;
  answersCount: number;
  createdAt: string;
}

export default function DiscussionsClient({ user }: { user: SessionUser }) {
  const { handleNotification } = useNotification();
  const [discussions, setDiscussions] = useState<DiscussionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const data = (await discussionsService.listAll(p)) as unknown as DiscussionSummary[];
      if (p === 1) setDiscussions(data);
      else setDiscussions((prev) => [...prev, ...data]);
      if (data.length < 5) setHasMore(false);
    } catch {
      handleNotification("error", "Erro ao carregar discussões.");
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
          <h1 className="font-semibold text-gray-800">Discussões</h1>
          <Link href="/profile" className="text-sm text-gray-500 hover:text-gray-700">{user.name}</Link>
        </div>
      </header>

      <main id="main-content" className="max-w-3xl mx-auto px-4 py-6">
        {loading && discussions.length === 0 ? (
          <Loading />
        ) : discussions.length === 0 ? (
          <div className="text-center text-gray-400 py-10">Nenhuma discussão encontrada.</div>
        ) : (
          <div className="space-y-4">
            {discussions.map((d) => (
              <Link
                key={d._id}
                href={`/discussion/${d.bookAbbrev}/${d._id}`}
                className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-purple-400 transition"
              >
                <div className="text-xs text-purple-600 font-medium mb-1">{d.verseReference}</div>
                <p className="text-sm font-semibold text-gray-800 mb-2">{d.question}</p>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>por {d.username}</span>
                  <span>{d.answersCount} resposta{d.answersCount !== 1 ? "s" : ""}</span>
                </div>
              </Link>
            ))}

            {hasMore && !loading && (
              <button
                onClick={() => { const next = page + 1; setPage(next); load(next); }}
                className="w-full mt-2 text-sm text-purple-600 hover:underline py-2"
              >
                Carregar mais
              </button>
            )}
            {loading && <Loading />}
          </div>
        )}
      </main>
    </div>
  );
}
