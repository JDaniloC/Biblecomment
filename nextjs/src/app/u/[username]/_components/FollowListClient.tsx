"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { followService } from "@/services/follow";
import { useNotification } from "@/contexts/NotificationContext";

interface ViewerSession {
  name: string;
  username: string;
  email?: string | null;
  moderator?: boolean;
}

export interface FollowListItem {
  username: string;
  displayName?: string;
  isFollowing: boolean;
  isMe: boolean;
}

interface Props {
  /** Profile owner (the user whose followers/following are being listed). */
  ownerUsername: string;
  /** "Seguidores de @x" vs "@x está seguindo" — drives copy + API path. */
  direction: "followers" | "following";
  initialItems: FollowListItem[];
  initialTotal: number;
  pageSize: number;
  viewer: ViewerSession | null;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function FollowListClient({
  ownerUsername,
  direction,
  initialItems,
  initialTotal,
  pageSize,
  viewer,
}: Props) {
  const router = useRouter();
  const { handleNotification } = useNotification();
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyUsername, setBusyUsername] = useState<string | null>(null);

  async function handleToggleFollow(username: string, wasFollowing: boolean) {
    if (!viewer || busyUsername) return;
    setBusyUsername(username);
    // Optimistic toggle of the targeted row.
    setItems((prev) =>
      prev.map((u) =>
        u.username === username ? { ...u, isFollowing: !wasFollowing } : u,
      ),
    );
    try {
      if (wasFollowing) await followService.unfollow(username);
      else await followService.follow(username);
    } catch {
      setItems((prev) =>
        prev.map((u) =>
          u.username === username ? { ...u, isFollowing: wasFollowing } : u,
        ),
      );
      handleNotification(
        "error",
        wasFollowing ? "Erro ao deixar de seguir." : "Erro ao seguir usuário.",
      );
    } finally {
      setBusyUsername(null);
    }
  }

  const total = initialTotal;
  const hasMore = items.length < total;

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(`/u/${ownerUsername}`);
    }
  }

  async function loadMore() {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(null);
    try {
      const next = page + 1;
      const res = await fetch(`/api/users/${ownerUsername}/${direction}?page=${next}`);
      if (!res.ok) throw new Error("fetch failed");
      const json = (await res.json()) as { items: FollowListItem[] };
      setItems((prev) => [...prev, ...json.items]);
      setPage(next);
    } catch {
      setError("Erro ao carregar mais usuários.");
    } finally {
      setLoading(false);
    }
  }

  const title =
    direction === "followers"
      ? `Seguidores de @${ownerUsername}`
      : `@${ownerUsername} está seguindo`;
  const emptyLabel =
    direction === "followers"
      ? "Ninguém segue @" + ownerUsername + " ainda."
      : "@" + ownerUsername + " ainda não segue ninguém.";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <AppHeader user={viewer} loginCallbackUrl={`/u/${ownerUsername}/${direction}`} />
      <main id="main-content" className="max-w-2xl mx-auto px-4 py-6">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-brand dark:hover:text-brand mb-4 -ml-1 px-1 py-1 rounded transition"
          aria-label="Voltar"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Voltar
        </button>

        <header className="mb-5">
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {total} {total === 1 ? "pessoa" : "pessoas"}
          </p>
        </header>

        {items.length === 0 ? (
          <p
            data-testid="follow-list-empty"
            className="text-center text-sm text-slate-400 dark:text-slate-500 py-10"
          >
            {emptyLabel}
          </p>
        ) : (
          <ul data-testid="follow-list" className="flex flex-col gap-2">
            {items.map((u) => {
              const name = u.displayName ?? u.username;
              const initials = getInitials(name);
              const showButton = !!viewer && !u.isMe;
              const busy = busyUsername === u.username;
              return (
                <li
                  key={u.username}
                  data-testid={`follow-list-item-${u.username}`}
                  className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 hover:border-brand transition"
                >
                  <Link
                    href={`/u/${u.username}`}
                    className="flex items-center gap-3 min-w-0 flex-1 no-underline"
                  >
                    <span
                      aria-hidden="true"
                      className="flex-none w-10 h-10 rounded-full bg-brand-tint text-brand flex items-center justify-center font-bold text-sm"
                    >
                      {initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {name}
                      </span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">
                        @{u.username}
                      </span>
                    </span>
                  </Link>
                  {showButton && (
                    <button
                      type="button"
                      onClick={() => handleToggleFollow(u.username, u.isFollowing)}
                      disabled={busy}
                      data-testid={`follow-list-toggle-${u.username}`}
                      data-following={u.isFollowing ? "true" : "false"}
                      className={`flex-none text-xs font-semibold px-3 py-1.5 rounded-md transition disabled:opacity-60 ${
                        u.isFollowing
                          ? "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-300 hover:border-red-200 dark:hover:border-red-900/60"
                          : "bg-brand text-white hover:bg-brand/90"
                      }`}
                    >
                      {u.isFollowing ? "Seguindo" : "Seguir"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {hasMore && (
          <div className="flex justify-center mt-5">
            <button
              type="button"
              onClick={loadMore}
              disabled={loading}
              data-testid="follow-list-load-more"
              className="text-sm font-semibold px-4 py-2 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
            >
              {loading ? "Carregando…" : "Carregar mais"}
            </button>
          </div>
        )}
        {error && (
          <p className="text-center text-sm text-red-600 dark:text-red-400 py-2 mt-3">
            {error}
          </p>
        )}
      </main>
    </div>
  );
}
