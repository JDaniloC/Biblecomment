"use client";

import { useEffect, useState } from "react";
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
  type Status = "none" | "pending" | "approved";
  const [status, setStatus] = useState<Status>(
    initialIsMember ? "approved" : "none",
  );
  const [role, setRole] = useState<"member" | "moderator">("member");
  const [memberCount, setMemberCount] = useState(community.memberCount);
  const [busy, setBusy] = useState(false);
  // Pending join requests, fetched only when the viewer is a moderator.
  const [pending, setPending] = useState<
    { userId: string; username: string | null; joinedAt?: string }[]
  >([]);

  // Resolve the viewer's real status/role (the initial isMember prop is
  // legacy — it doesn't distinguish pending vs approved, nor expose role).
  useEffect(() => {
    if (!viewer) return;
    let cancelled = false;
    communityService
      .myStatus(community.slug)
      .then((r) => {
        if (!cancelled) {
          setStatus(r.status);
          setRole(r.role);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [viewer, community.slug]);

  // Moderator viewers get the pending list.
  useEffect(() => {
    const isModerator = role === "moderator" || isCreator;
    if (!isModerator || !viewer) return;
    let cancelled = false;
    communityService
      .listRequests(community.slug)
      .then((reqs) => {
        if (!cancelled) setPending(reqs);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [role, isCreator, viewer, community.slug]);
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

  async function handleRequestJoin() {
    if (!viewer || busy) return;
    setBusy(true);
    try {
      await communityService.requestJoin(community.slug);
      setStatus("pending");
    } catch {
      handleNotification("error", "Erro ao solicitar entrada.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancelOrLeave() {
    if (!viewer || busy) return;
    setBusy(true);
    const wasApproved = status === "approved";
    setStatus("none");
    if (wasApproved) setMemberCount((c) => Math.max(0, c - 1));
    try {
      await communityService.cancelOrLeave(community.slug);
    } catch {
      setStatus(wasApproved ? "approved" : "pending");
      if (wasApproved) setMemberCount((c) => c + 1);
      handleNotification("error", "Não foi possível concluir a ação.");
    } finally {
      setBusy(false);
    }
  }

  async function handleApprove(userId: string) {
    if (busy) return;
    setBusy(true);
    try {
      await communityService.approve(community.slug, userId);
      setPending((prev) => prev.filter((r) => r.userId !== userId));
      setMemberCount((c) => c + 1);
    } catch {
      handleNotification("error", "Erro ao aprovar.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReject(userId: string) {
    if (busy) return;
    setBusy(true);
    try {
      await communityService.reject(community.slug, userId);
      setPending((prev) => prev.filter((r) => r.userId !== userId));
    } catch {
      handleNotification("error", "Erro ao recusar.");
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
              <div
                className="flex items-center gap-2"
                data-testid="community-membership-toggle"
                data-status={status}
              >
                {status === "pending" && (
                  <span className="text-xs text-amber-700 dark:text-amber-300 font-semibold">
                    Solicitação enviada
                  </span>
                )}
                <button
                  type="button"
                  onClick={
                    status === "none" ? handleRequestJoin : handleCancelOrLeave
                  }
                  disabled={busy}
                  className={`text-sm font-semibold px-4 py-2 rounded-md transition disabled:opacity-60 ${
                    status === "none"
                      ? "bg-brand text-white hover:bg-brand/90"
                      : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-300 hover:border-red-200 dark:hover:border-red-900/60"
                  }`}
                >
                  {status === "none"
                    ? "Solicitar entrada"
                    : status === "pending"
                      ? "Cancelar"
                      : "Sair"}
                </button>
              </div>
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

        {(role === "moderator" || isCreator) && viewer && (
          <section
            data-testid="community-moderation"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 mb-5"
          >
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-3">
              Moderação · solicitações pendentes ({pending.length})
            </h2>
            {pending.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Nenhuma solicitação pendente.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {pending.map((r) => (
                  <li
                    key={r.userId}
                    data-testid={`pending-request-${r.userId}`}
                    className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0"
                  >
                    {r.username ? (
                      <Link
                        href={`/u/${r.username}`}
                        className="text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-brand"
                      >
                        @{r.username}
                      </Link>
                    ) : (
                      <span className="text-sm text-slate-400 dark:text-slate-500">
                        (usuário removido)
                      </span>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleApprove(r.userId)}
                        disabled={busy}
                        data-testid={`approve-${r.userId}`}
                        className="text-xs font-semibold px-3 py-1.5 rounded-md bg-brand text-white hover:bg-brand/90 disabled:opacity-60"
                      >
                        Aprovar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(r.userId)}
                        disabled={busy}
                        data-testid={`reject-${r.userId}`}
                        className="text-xs font-semibold px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-300 hover:border-red-200 dark:hover:border-red-900/60 disabled:opacity-60"
                      >
                        Recusar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section data-testid="community-comments" className="mb-6">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-3">
            Comentários ({commentsTotal})
          </h2>

          {comments.length === 0 ? (
            <p
              data-testid="community-comments-empty"
              className="text-center text-sm text-slate-400 dark:text-slate-500 py-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
            >
              {status === "approved"
                ? "Comente em qualquer versículo — seus comentários serão priorizados para os outros membros desta comunidade."
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
