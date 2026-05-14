"use client";

import { useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { communityService } from "@/services/communities";
import { useNotification } from "@/contexts/NotificationContext";
import type { Community } from "@/domain/entities/Community";

interface ViewerSession {
  name: string;
  username: string;
  email?: string | null;
  moderator?: boolean;
}

export interface CommunityCommentItem {
  _id: string;
  text: string;
  username: string;
  bookReference: string;
  tags: string[];
  createdAt: string | null;
}

interface Props {
  community: Community;
  isMember: boolean;
  isCreator: boolean;
  creatorUsername?: string;
  viewer: ViewerSession | null;
  initialComments: CommunityCommentItem[];
  initialCommentsTotal: number;
  commentsPageSize: number;
}

/**
 * Convert a `bookReference` ("GN 1:1" / "GN 1") into a verse permalink so
 * each comment in the list can jump back to its source verse.
 * Falls back to the community page when the parse fails.
 */
function refToHref(ref: string, fallback: string): string {
  const parts = ref.trim().split(/\s+/);
  if (parts.length < 2) return fallback;
  const abbrev = parts[0].toLowerCase();
  const tail = parts[1];
  const colon = tail.indexOf(":");
  const chapter = colon >= 0 ? tail.slice(0, colon) : tail;
  const verse = colon >= 0 ? tail.slice(colon + 1) : null;
  if (!/^\d+$/.test(chapter)) return fallback;
  if (verse && /^\d+$/.test(verse)) {
    return `/chapter/${abbrev}/${chapter}#verse-${verse}`;
  }
  return `/chapter/${abbrev}/${chapter}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function CommunityDetailClient({
  community,
  isMember: initialIsMember,
  isCreator,
  creatorUsername,
  viewer,
  initialComments,
  initialCommentsTotal,
  commentsPageSize,
}: Props) {
  const { handleNotification } = useNotification();
  const [isMember, setIsMember] = useState(initialIsMember);
  const [memberCount, setMemberCount] = useState(community.memberCount);
  const [busy, setBusy] = useState(false);
  const [comments, setComments] = useState(initialComments);
  const [commentsTotal] = useState(initialCommentsTotal);
  const [commentsPage, setCommentsPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  async function loadMoreComments() {
    if (loadingMore || comments.length >= commentsTotal) return;
    setLoadingMore(true);
    try {
      const next = commentsPage + 1;
      const res = await fetch(
        `/api/communities/${community.slug}/comments?page=${next}`,
      );
      if (!res.ok) throw new Error("fetch failed");
      const json = (await res.json()) as { items: CommunityCommentItem[] };
      setComments((prev) => [...prev, ...json.items]);
      setCommentsPage(next);
    } catch {
      handleNotification("error", "Erro ao carregar mais comentários.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function toggleMembership() {
    if (!viewer || busy) return;
    setBusy(true);
    const wasMember = isMember;
    // Optimistic UI — flip first, rollback on error.
    setIsMember(!wasMember);
    setMemberCount((prev) => prev + (wasMember ? -1 : 1));
    try {
      if (wasMember) await communityService.leave(community.slug);
      else await communityService.join(community.slug);
    } catch {
      setIsMember(wasMember);
      setMemberCount((prev) => prev + (wasMember ? 1 : -1));
      handleNotification(
        "error",
        wasMember ? "Erro ao sair da comunidade." : "Erro ao entrar na comunidade.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <AppHeader user={viewer} loginCallbackUrl={`/communities/${community.slug}`} />

      <main id="main-content" className="max-w-3xl mx-auto px-4 py-6">
        <Link
          href="/communities"
          className="text-sm text-slate-500 dark:text-slate-400 hover:text-brand inline-flex items-center gap-1 mb-4"
        >
          ← Comunidades
        </Link>

        <header className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 mb-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1
                className="text-2xl font-bold text-slate-800 dark:text-slate-100 truncate"
                data-testid="community-name"
              >
                {community.name}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                /{community.slug}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-3">
                <span data-testid="community-member-count">{memberCount}</span>{" "}
                {memberCount === 1 ? "membro" : "membros"}
                {creatorUsername && (
                  <>
                    {" · criada por "}
                    <Link
                      href={`/u/${creatorUsername}`}
                      className="text-brand hover:underline"
                    >
                      @{creatorUsername}
                    </Link>
                  </>
                )}
              </p>
            </div>
            {viewer && !isCreator && (
              <button
                type="button"
                onClick={toggleMembership}
                disabled={busy}
                data-testid="community-membership-toggle"
                data-member={isMember ? "true" : "false"}
                className={`text-sm font-semibold px-4 py-2 rounded-md transition disabled:opacity-60 ${
                  isMember
                    ? "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-300 hover:border-red-200 dark:hover:border-red-900/60"
                    : "bg-brand text-white hover:bg-brand/90"
                }`}
              >
                {isMember ? "Sair" : "Entrar"}
              </button>
            )}
            {isCreator && (
              <span
                data-testid="community-creator-badge"
                className="text-xs font-semibold px-3 py-1.5 rounded-md bg-brand-tint text-brand"
              >
                Criada por você
              </span>
            )}
          </div>

          {community.description && (
            <p className="text-sm text-slate-700 dark:text-slate-200 mt-4 whitespace-pre-wrap">
              {community.description}
            </p>
          )}
        </header>

        <section data-testid="community-comments" className="mb-6">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-3">
            Comentários ({commentsTotal})
          </h2>

          {comments.length === 0 ? (
            <p
              data-testid="community-comments-empty"
              className="text-center text-sm text-slate-400 dark:text-slate-500 py-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
            >
              {isMember
                ? "Seja o primeiro a comentar nessa comunidade — escolha-a no campo \"Postar em\" ao escrever um comentário."
                : "Nenhum comentário ainda."}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {comments.map((c) => (
                <li
                  key={c._id}
                  data-testid={`community-comment-${c._id}`}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <Link
                      href={`/u/${c.username}`}
                      className="text-sm font-semibold text-slate-800 dark:text-slate-100 hover:text-brand truncate"
                    >
                      @{c.username}
                    </Link>
                    <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
                      {formatDate(c.createdAt)}
                    </span>
                  </div>
                  <Link
                    href={refToHref(c.bookReference, `/communities/${community.slug}`)}
                    className="inline-block text-xs font-medium text-brand mb-2 hover:underline"
                  >
                    {c.bookReference}
                  </Link>
                  <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap line-clamp-6">
                    {c.text}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {comments.length < commentsTotal && (
            <div className="flex justify-center mt-4">
              <button
                type="button"
                onClick={loadMoreComments}
                disabled={loadingMore}
                data-testid="community-comments-load-more"
                className="text-sm font-semibold px-4 py-2 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
              >
                {loadingMore ? "Carregando…" : "Carregar mais"}
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
