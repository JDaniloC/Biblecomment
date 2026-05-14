"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useNotification } from "@/contexts/NotificationContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { moderationService, type ModerationCursor } from "@/services/moderation";
import { commentsService } from "@/services/comments";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationsBell } from "@/components/NotificationsBell";
import type { Comment } from "@/domain/entities/Comment";

interface SessionUser {
  name: string;
  email: string;
  username: string;
  moderator: boolean;
}

function dateFormat(d?: Date | string) {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "";
  return dt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function AdminModerationClient({ user }: { user: SessionUser }) {
  const { handleNotification } = useNotification();
  const confirm = useConfirm();
  const [reports, setReports] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // All-comments browser (ux-review #8). Cursor-paginated: no totals, no
  // page numbers — clicking "Carregar mais" appends the next slice using
  // the createdAt+id of the last visible row.
  const [allComments, setAllComments] = useState<Comment[]>([]);
  const [allLoading, setAllLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<ModerationCursor | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Promote/demote form
  const [promoteEmail, setPromoteEmail] = useState("");
  const [promoteSubmitting, setPromoteSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items } = await moderationService.listReports(1);
      setReports(items);
    } catch {
      handleNotification("error", "Erro ao carregar reports.");
    } finally {
      setLoading(false);
    }
  }, [handleNotification]);

  const resetAll = useCallback(
    async (q: string) => {
      setAllLoading(true);
      try {
        const { items, nextCursor: next } = await moderationService.listAllComments({ q });
        setAllComments(items);
        setNextCursor(next);
      } catch {
        handleNotification("error", "Erro ao carregar comentários.");
      } finally {
        setAllLoading(false);
      }
    },
    [handleNotification],
  );

  const loadMore = useCallback(async () => {
    if (!nextCursor) return;
    setAllLoading(true);
    try {
      const { items, nextCursor: next } = await moderationService.listAllComments({
        q: searchQuery,
        cursor: nextCursor,
      });
      setAllComments((prev) => [...prev, ...items]);
      setNextCursor(next);
    } catch {
      handleNotification("error", "Erro ao carregar mais comentários.");
    } finally {
      setAllLoading(false);
    }
  }, [handleNotification, nextCursor, searchQuery]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    resetAll(searchQuery);
  }, [resetAll, searchQuery]);

  async function handleClear(id: string) {
    const ok = await confirm({
      title: "Limpar reports deste comentário?",
      description: "O comentário sairá da fila de moderação. Você poderá revisitá-lo se ele for reportado novamente.",
      confirmLabel: "Limpar",
    });
    if (!ok) return;
    setBusyId(id);
    try {
      await moderationService.clearReports(id);
      setReports((prev) => prev.filter((c) => c._id !== id));
      handleNotification("success", "Reports limpos.");
    } catch {
      handleNotification("error", "Erro ao limpar reports.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Deletar este comentário?",
      description: "A exclusão é permanente e não pode ser desfeita.",
      confirmLabel: "Deletar",
      variant: "danger",
    });
    if (!ok) return;
    setBusyId(id);
    try {
      await commentsService.delete(id);
      setReports((prev) => prev.filter((c) => c._id !== id));
      handleNotification("success", "Comentário deletado.");
    } catch {
      handleNotification("error", "Erro ao deletar comentário.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleVerified(id: string) {
    setBusyId(id);
    try {
      const updated = await moderationService.toggleVerified(id);
      setAllComments((prev) =>
        prev.map((c) =>
          c._id === id
            ? {
                ...c,
                verified: updated.verified,
                verifiedBy: updated.verifiedBy,
                verifiedAt: updated.verifiedAt,
              }
            : c,
        ),
      );
      handleNotification(
        "success",
        updated.verified ? "Comentário verificado." : "Verificação removida.",
      );
    } catch {
      handleNotification("error", "Erro ao atualizar verificação.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteFromAll(id: string) {
    const ok = await confirm({
      title: "Deletar este comentário?",
      description: "A exclusão é permanente e não pode ser desfeita.",
      confirmLabel: "Deletar",
      variant: "danger",
    });
    if (!ok) return;
    setBusyId(id);
    try {
      await commentsService.delete(id);
      setAllComments((prev) => prev.filter((c) => c._id !== id));
      // Removing a comment also takes it out of the report queue if it was there.
      setReports((prev) => prev.filter((c) => c._id !== id));
      handleNotification("success", "Comentário deletado.");
    } catch {
      handleNotification("error", "Erro ao deletar comentário.");
    } finally {
      setBusyId(null);
    }
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
  }

  async function handlePromote(makeMod: boolean) {
    if (!promoteEmail.trim()) return;
    setPromoteSubmitting(true);
    try {
      const updated = await moderationService.setModerator(promoteEmail.trim(), makeMod);
      handleNotification(
        "success",
        makeMod
          ? `${updated.username} agora é moderador.`
          : `${updated.username} deixou de ser moderador.`,
      );
      setPromoteEmail("");
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) handleNotification("error", "Usuário não encontrado.");
      else handleNotification("error", "Erro ao atualizar permissão.");
    } finally {
      setPromoteSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f9f9f7] dark:bg-slate-950">
      <header className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 h-[60px] flex items-center px-6 gap-3">
        <Link href="/" className="flex items-center gap-[7px] px-2 py-[5px] rounded-md text-[13px] font-medium text-slate-500 dark:text-slate-400 no-underline hover:bg-slate-100 dark:hover:bg-slate-800">
          ← Voltar
        </Link>
        <div className="w-px h-[18px] bg-slate-200 dark:bg-slate-700 mx-1" />
        <span className="text-[15px] font-bold text-slate-800 dark:text-slate-100">Moderação</span>
        <div className="flex-1" />
        <NotificationsBell />
        <ThemeToggle />
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-[13px] text-slate-400 dark:text-slate-500 bg-transparent border-none cursor-pointer hover:text-slate-600 dark:hover:text-slate-300">
          Sair
        </button>
      </header>

      <main id="main-content" className="max-w-4xl mx-auto px-6 pt-8 pb-16 flex flex-col gap-8">
        {/* Reports list */}
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              Comentários reportados
              {!loading && <span className="ml-2 text-sm font-normal text-slate-400 dark:text-slate-500">({reports.length})</span>}
            </h1>
            <button
              type="button"
              onClick={load}
              className="text-xs text-brand hover:underline disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Atualizando…" : "Atualizar"}
            </button>
          </div>

          {loading ? (
            <div className="text-center text-slate-400 py-10">Carregando…</div>
          ) : reports.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Nenhum comentário reportado no momento.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {reports.map((c) => (
                <div
                  key={c._id}
                  className="bg-white dark:bg-slate-900 border-l-4 border-y border-r border-slate-200 dark:border-slate-700 border-l-red-400 rounded-r-[10px] py-3.5 px-[18px]"
                >
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Link
                      href={`/u/${c.username}`}
                      className="font-semibold text-[13px] text-slate-800 dark:text-slate-100 hover:underline"
                    >
                      @{c.username}
                    </Link>
                    {c.bookReference && (
                      <span className="inline-flex items-center bg-brand-tint rounded px-[7px] h-5 shrink-0">
                        <span className="font-bold text-xs text-brand leading-[18px] whitespace-nowrap">
                          {c.bookReference}
                        </span>
                      </span>
                    )}
                    <span className="inline-flex items-center bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full px-2.5 h-5 text-[11px] font-semibold">
                      {(c.reportCount ?? 0)} report{(c.reportCount ?? 0) !== 1 ? "s" : ""}
                    </span>
                    <span className="ml-auto text-[11px] text-slate-400 dark:text-slate-500">
                      {dateFormat(c.createdAt)}
                    </span>
                  </div>
                  <p className="text-[13px] text-gray-700 dark:text-slate-200 leading-[22.75px] m-0 mb-3 whitespace-pre-wrap">
                    {c.text}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      Reportado por: {(c.reporters ?? []).join(", ")}
                    </span>
                    <div className="ml-auto flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleClear(c._id!)}
                        disabled={busyId === c._id}
                        className="text-[12px] px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
                      >
                        Limpar reports
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(c._id!)}
                        disabled={busyId === c._id}
                        className="text-[12px] px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
                      >
                        Deletar comentário
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* All comments browser */}
        <section>
          <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              Todos os comentários
              {!allLoading && allComments.length > 0 && (
                <span className="ml-2 text-sm font-normal text-slate-400 dark:text-slate-500">
                  ({allComments.length}
                  {nextCursor ? "+" : ""})
                </span>
              )}
            </h2>
            <button
              type="button"
              onClick={() => resetAll(searchQuery)}
              className="text-xs text-brand hover:underline disabled:opacity-50"
              disabled={allLoading}
            >
              {allLoading && allComments.length === 0 ? "Atualizando…" : "Atualizar"}
            </button>
          </div>

          <form onSubmit={submitSearch} className="mb-4 flex gap-2 flex-wrap">
            <label htmlFor="mod-search" className="sr-only">Buscar comentários</label>
            <input
              id="mod-search"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por texto, usuário ou referência…"
              className="flex-1 min-w-[200px] border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <button
              type="submit"
              className="text-sm font-semibold px-4 py-2 rounded-md bg-brand text-white hover:opacity-90 transition disabled:opacity-50"
              disabled={allLoading}
            >
              Buscar
            </button>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSearchQuery("");
                }}
                className="text-sm font-semibold px-4 py-2 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Limpar
              </button>
            )}
          </form>

          {allLoading && allComments.length === 0 ? (
            <div className="text-center text-slate-400 py-10">Carregando…</div>
          ) : allComments.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              {searchQuery ? "Nenhum comentário encontrado para essa busca." : "Nenhum comentário cadastrado."}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {allComments.map((c) => (
                <div
                  key={c._id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-3.5 px-[18px]"
                >
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Link
                      href={`/u/${c.username}`}
                      className="font-semibold text-[13px] text-slate-800 dark:text-slate-100 hover:underline"
                    >
                      @{c.username}
                    </Link>
                    {c.bookReference && (
                      <span className="inline-flex items-center bg-brand-tint rounded px-[7px] h-5 shrink-0">
                        <span className="font-bold text-xs text-brand leading-[18px] whitespace-nowrap">
                          {c.bookReference}
                        </span>
                      </span>
                    )}
                    {c.verified && (
                      <span
                        className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full px-2.5 h-5 text-[11px] font-semibold"
                        title={c.verifiedBy ? `Verificado por @${c.verifiedBy}` : "Verificado"}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Verificado
                      </span>
                    )}
                    {(c.reportCount ?? 0) > 0 && (
                      <span className="inline-flex items-center bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full px-2.5 h-5 text-[11px] font-semibold">
                        {c.reportCount} report{c.reportCount !== 1 ? "s" : ""}
                      </span>
                    )}
                    <span className="ml-auto text-[11px] text-slate-400 dark:text-slate-500">
                      {dateFormat(c.createdAt)}
                    </span>
                  </div>
                  <p className="text-[13px] text-gray-700 dark:text-slate-200 leading-[22.75px] m-0 mb-3 whitespace-pre-wrap">
                    {c.text}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <button
                      type="button"
                      onClick={() => handleToggleVerified(c._id!)}
                      disabled={busyId === c._id}
                      className={
                        c.verified
                          ? "text-[12px] px-3 py-1.5 rounded-md border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition disabled:opacity-50"
                          : "text-[12px] px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-50"
                      }
                    >
                      {c.verified ? "Desverificar" : "Verificar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteFromAll(c._id!)}
                      disabled={busyId === c._id}
                      className="text-[12px] px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
                    >
                      Deletar
                    </button>
                  </div>
                </div>
              ))}

              {/* Cursor-based "load more" — no totals, no page numbers. */}
              {nextCursor && (
                <div className="flex items-center justify-center mt-2">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={allLoading}
                    className="text-sm font-semibold px-4 py-2 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
                  >
                    {allLoading ? "Carregando…" : "Carregar mais"}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Moderator promotion */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
            Permissões de moderador
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Promova ou rebaixe um usuário pelo email cadastrado.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={promoteEmail}
              onChange={(e) => setPromoteEmail(e.target.value)}
              placeholder="email@usuario.com"
              className="flex-1 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <button
              type="button"
              onClick={() => handlePromote(true)}
              disabled={promoteSubmitting || !promoteEmail.trim()}
              className="text-sm font-semibold px-4 py-2 rounded-md bg-brand text-white hover:opacity-90 transition disabled:opacity-50"
            >
              Promover
            </button>
            <button
              type="button"
              onClick={() => handlePromote(false)}
              disabled={promoteSubmitting || !promoteEmail.trim()}
              className="text-sm font-semibold px-4 py-2 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
            >
              Rebaixar
            </button>
          </div>
        </section>

        <p className="text-[11px] text-slate-400 dark:text-slate-600 text-center">
          Logado como <strong>{user.username}</strong> · moderador
        </p>
      </main>
    </div>
  );
}
