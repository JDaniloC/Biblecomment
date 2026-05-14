"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { BadgeCard } from "@/app/profile/_components/BadgeCard";
import { getBadge } from "@/lib/badges/catalog";

interface ViewerSession {
  name: string;
  username: string;
  email?: string | null;
  moderator?: boolean;
}

export interface PublicProfileUser {
  username: string;
  displayName?: string;
  badges: string[];
  belief?: string;
  createdAt: string;
}

export interface PublicProfileComment {
  _id?: string;
  bookReference: string;
  text: string;
  tags: string[];
  createdAt: string | null;
}

interface Props {
  user: PublicProfileUser;
  initialComments: PublicProfileComment[];
  initialHasMore: boolean;
  /** Logged-in viewer's session, or null for anonymous browsing. */
  viewer: ViewerSession | null;
}

const PAGE_SIZE = 20;

function memberSince(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function dateFormat(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type Tab = "badges" | "comments";

export default function PublicProfileClient({ user, initialComments, initialHasMore, viewer }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("badges");
  const [comments, setComments] = useState<PublicProfileComment[]>(initialComments);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deep-link friendly back behavior: prefer router.back() (so users return
  // to wherever they came from — chapter page, feed, etc.). When there is
  // no history (direct landing on /u/foo), fall back to /home.
  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/home");
    }
  }

  const display = user.displayName ?? user.username;
  const initials = getInitials(display);

  const earnedBadges = user.badges
    .map((id) => getBadge(id))
    .filter((b): b is NonNullable<typeof b> => Boolean(b));

  async function loadMore() {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(null);
    try {
      const next = page + 1;
      const res = await fetch(`/api/users/${user.username}/comments?page=${next}`);
      if (!res.ok) throw new Error("fetch failed");
      const json = (await res.json()) as {
        comments: Array<{
          _id?: string;
          bookReference: string;
          text: string;
          tags: string[];
          createdAt?: string | null;
        }>;
      };
      const more: PublicProfileComment[] = json.comments.map((c) => ({
        _id: c._id,
        bookReference: c.bookReference,
        text: c.text,
        tags: c.tags,
        createdAt: c.createdAt ?? null,
      }));
      setComments((prev) => [...prev, ...more]);
      setPage(next);
      if (more.length < PAGE_SIZE) setHasMore(false);
    } catch {
      setError("Erro ao carregar mais comentários.");
    } finally {
      setLoading(false);
    }
  }

  const isMe = viewer?.username === user.username;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <AppHeader user={viewer} loginCallbackUrl={`/u/${user.username}`} />
      <main id="main-content" className="max-w-3xl mx-auto px-4 py-6">
        <button
          type="button"
          onClick={handleBack}
          data-testid="public-profile-back"
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

        <header
          data-testid="public-profile-header"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 flex items-center gap-4 mb-6"
        >
          <div
            aria-hidden="true"
            className="flex-none w-16 h-16 rounded-full bg-brand-tint text-brand flex items-center justify-center font-bold text-xl"
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h1
              data-testid="public-profile-displayname"
              className="font-bold text-xl text-slate-800 dark:text-slate-100 truncate"
            >
              {display}
            </h1>
            <p
              data-testid="public-profile-username"
              className="text-sm text-slate-500 dark:text-slate-400"
            >
              @{user.username}
            </p>
            {user.belief && (
              <p
                data-testid="public-profile-belief"
                className="text-xs mt-2 inline-flex items-center bg-brand-tint text-brand rounded-full px-2.5 py-0.5 font-semibold"
              >
                {user.belief}
              </p>
            )}
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
              Membro desde {memberSince(user.createdAt)}
            </p>
          </div>
          {isMe && (
            <Link
              href="/profile"
              className="flex-none text-xs font-semibold px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Editar perfil
            </Link>
          )}
        </header>

        <nav
          role="tablist"
          aria-label="Seções do perfil"
          className="flex gap-2 border-b border-slate-200 dark:border-slate-700 mb-4"
        >
          <button
            type="button"
            role="tab"
            data-testid="public-profile-tab-badges"
            aria-selected={tab === "badges"}
            onClick={() => setTab("badges")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === "badges"
                ? "border-brand text-brand"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            Conquistas ({earnedBadges.length})
          </button>
          <button
            type="button"
            role="tab"
            data-testid="public-profile-tab-comments"
            aria-selected={tab === "comments"}
            onClick={() => setTab("comments")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === "comments"
                ? "border-brand text-brand"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            Comentários
          </button>
        </nav>

        {tab === "badges" &&
          (earnedBadges.length === 0 ? (
            <p
              data-testid="public-profile-badges-empty"
              className="text-center text-sm text-slate-400 dark:text-slate-500 py-10"
            >
              Nenhuma conquista desbloqueada ainda.
            </p>
          ) : (
            <div
              data-testid="public-profile-badges"
              className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            >
              {earnedBadges.map((b) => (
                <BadgeCard key={b.id} badge={b} earned current={1} target={1} />
              ))}
            </div>
          ))}

        {tab === "comments" &&
          (comments.length === 0 ? (
            <p
              data-testid="public-profile-comments-empty"
              className="text-center text-sm text-slate-400 dark:text-slate-500 py-10"
            >
              Nenhum comentário publicado.
            </p>
          ) : (
            <div data-testid="public-profile-comments" className="flex flex-col gap-3">
              {comments.map((c) => (
                <article
                  key={c._id}
                  data-testid="public-profile-comment-card"
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4"
                >
                  <div className="flex items-center gap-2 mb-2 text-xs">
                    {c.bookReference && (
                      <span className="inline-flex items-center bg-brand-tint rounded px-2 h-5 font-bold text-brand whitespace-nowrap">
                        {c.bookReference}
                      </span>
                    )}
                    <span className="ml-auto text-slate-400 dark:text-slate-500">
                      {dateFormat(c.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                    {c.text}
                  </p>
                </article>
              ))}
              {hasMore && (
                <div className="flex justify-center mt-2">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loading}
                    data-testid="public-profile-load-more"
                    className="text-sm font-semibold px-4 py-2 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
                  >
                    {loading ? "Carregando…" : "Carregar mais"}
                  </button>
                </div>
              )}
              {error && (
                <p className="text-center text-sm text-red-600 dark:text-red-400 py-2">
                  {error}
                </p>
              )}
            </div>
          ))}

      </main>
    </div>
  );
}
