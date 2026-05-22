"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useNotification } from "@/contexts/NotificationContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import {
  moderationService,
  type ModerationCursor,
  type AdminUserRow,
} from "@/services/moderation";
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

type Tab = "reports" | "comments" | "users";

function dateFormat(d?: Date | string) {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "";
  return dt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function tabFromUrl(): Tab {
  if (typeof window === "undefined") return "reports";
  const t = new URLSearchParams(window.location.search).get("tab");
  return t === "comments" || t === "users" ? t : "reports";
}

export default function AdminModerationClient({ user }: { user: SessionUser }) {
  const { handleNotification } = useNotification();
  const confirm = useConfirm();

  // Tab state — kept in `?tab=…` so a deep-linked refresh keeps the active
  // pane. We mirror to the URL via history.replaceState so the back button
  // doesn't get polluted with internal tab switches.
  const [tab, setTabState] = useState<Tab>("reports");
  useEffect(() => {
    setTabState(tabFromUrl());
  }, []);
  function setTab(next: Tab) {
    setTabState(next);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url.toString());
  }

  // Reports tab
  const [reports, setReports] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Comments tab (cursor-paginated — no totals, no page numbers).
  const [allComments, setAllComments] = useState<Comment[]>([]);
  const [allLoading, setAllLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<ModerationCursor | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Users tab (cursor-paginated, newest cadastros first).
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersCursor, setUsersCursor] = useState<ModerationCursor | null>(null);
  const [usersQuery, setUsersQuery] = useState("");
  const [usersInput, setUsersInput] = useState("");
  // Gates all three per-row user buttons (promote, disable, delete).
  const [busyEmail, setBusyEmail] = useState<string | null>(null);

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

  const resetAllComments = useCallback(
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

  const loadMoreComments = useCallback(async () => {
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

  const resetUsers = useCallback(
    async (q: string) => {
      setUsersLoading(true);
      try {
        const { items, nextCursor: next } = await moderationService.listUsers({ q });
        setUsers(items);
        setUsersCursor(next);
      } catch {
        handleNotification("error", "Erro ao carregar usuários.");
      } finally {
        setUsersLoading(false);
      }
    },
    [handleNotification],
  );

  const loadMoreUsers = useCallback(async () => {
    if (!usersCursor) return;
    setUsersLoading(true);
    try {
      const { items, nextCursor: next } = await moderationService.listUsers({
        q: usersQuery,
        cursor: usersCursor,
      });
      setUsers((prev) => [...prev, ...items]);
      setUsersCursor(next);
    } catch {
      handleNotification("error", "Erro ao carregar mais usuários.");
    } finally {
      setUsersLoading(false);
    }
  }, [handleNotification, usersCursor, usersQuery]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    resetAllComments(searchQuery);
  }, [resetAllComments, searchQuery]);

  useEffect(() => {
    resetUsers(usersQuery);
  }, [resetUsers, usersQuery]);

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

  async function handleToggleHidden(c: Comment) {
    const hide = !c.hiddenAt;
    setBusyId(c._id!);
    try {
      const updated = await moderationService.setCommentHidden(c._id!, hide);
      setAllComments((prev) =>
        prev.map((x) =>
          x._id === c._id
            ? {
                ...x,
                hiddenAt: updated.hiddenAt,
                hiddenBy: updated.hiddenBy,
                hiddenReason: updated.hiddenReason,
              }
            : x,
        ),
      );
      handleNotification(
        "success",
        hide ? "Comentário ocultado." : "Comentário reexibido.",
      );
    } catch {
      handleNotification("error", "Erro ao ocultar comentário.");
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

  function submitCommentsSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
  }

  function submitUsersSearch(e: React.FormEvent) {
    e.preventDefault();
    setUsersQuery(usersInput.trim());
  }

  async function handleUserModeratorToggle(row: AdminUserRow) {
    const makeMod = !row.moderator;
    const ok = await confirm({
      title: makeMod ? "Promover a moderador?" : "Rebaixar de moderador?",
      description: makeMod
        ? `@${row.username} ganhará acesso ao painel de moderação.`
        : `@${row.username} perderá o acesso ao painel de moderação.`,
      confirmLabel: makeMod ? "Promover" : "Rebaixar",
    });
    if (!ok) return;
    setBusyEmail(row.email);
    try {
      const updated = await moderationService.setModerator(row.email, makeMod);
      setUsers((prev) =>
        prev.map((u) =>
          u.email === row.email ? { ...u, moderator: updated.moderator } : u,
        ),
      );
      handleNotification(
        "success",
        makeMod
          ? `@${updated.username} agora é moderador.`
          : `@${updated.username} deixou de ser moderador.`,
      );
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) handleNotification("error", "Usuário não encontrado.");
      else handleNotification("error", "Erro ao atualizar permissão.");
    } finally {
      setBusyEmail(null);
    }
  }

  async function handleToggleDisabled(row: AdminUserRow) {
    const disable = !row.disabled;
    setBusyEmail(row.email);
    try {
      const updated = await moderationService.setUserDisabled(row.email, disable);
      setUsers((prev) =>
        prev.map((u) =>
          u.email === row.email ? { ...u, disabled: updated.disabled } : u,
        ),
      );
      handleNotification(
        "success",
        disable
          ? `@${updated.username} foi desativado.`
          : `@${updated.username} foi reativado.`,
      );
    } catch {
      handleNotification("error", "Erro ao atualizar status da conta.");
    } finally {
      setBusyEmail(null);
    }
  }

  async function handleDeleteUser(row: AdminUserRow) {
    const ok = await confirm({
      title: "Excluir esta conta?",
      description: `A conta de @${row.username} será removida permanentemente. Os comentários e discussões dele ficam anônimos sob "[usuário removido]". Esta ação não pode ser desfeita.`,
      confirmLabel: "Excluir conta",
      variant: "danger",
    });
    if (!ok) return;
    setBusyEmail(row.email);
    try {
      await moderationService.deleteUser(row.email);
      setUsers((prev) => prev.filter((u) => u.email !== row.email));
      handleNotification("success", `Conta de @${row.username} excluída.`);
    } catch {
      handleNotification("error", "Erro ao excluir conta.");
    } finally {
      setBusyEmail(null);
    }
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "reports", label: "Reports", count: loading ? undefined : reports.length },
    { id: "comments", label: "Comentários" },
    { id: "users", label: "Usuários" },
  ];

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

      <main id="main-content" className="max-w-4xl mx-auto px-6 pt-8 pb-16 flex flex-col gap-6">
        {/* Tab bar — horizontal scroll on narrow viewports. */}
        <nav
          role="tablist"
          aria-label="Seções da moderação"
          className="flex gap-1 border-b border-slate-200 dark:border-slate-700 overflow-x-auto"
        >
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                data-testid={`tab-${t.id}`}
                onClick={() => setTab(t.id)}
                className={
                  active
                    ? "px-4 py-2.5 text-sm font-semibold border-b-2 border-brand text-brand whitespace-nowrap"
                    : "px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 whitespace-nowrap"
                }
              >
                {t.label}
                {typeof t.count === "number" && (
                  <span className="ml-1.5 text-xs font-normal text-slate-400 dark:text-slate-500">
                    ({t.count})
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Reports tab */}
        {tab === "reports" && (
          <section role="tabpanel">
            <div className="flex items-baseline justify-between mb-4">
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                Comentários reportados
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
        )}

        {/* Comments tab */}
        {tab === "comments" && (
          <section role="tabpanel">
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
                onClick={() => resetAllComments(searchQuery)}
                className="text-xs text-brand hover:underline disabled:opacity-50"
                disabled={allLoading}
              >
                {allLoading && allComments.length === 0 ? "Atualizando…" : "Atualizar"}
              </button>
            </div>

            <form onSubmit={submitCommentsSearch} className="mb-4 flex gap-2 flex-wrap">
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
                      {c.hiddenAt && (
                        <span
                          className="inline-flex items-center bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full px-2.5 h-5 text-[11px] font-semibold"
                          title={
                            c.hiddenReason === "account-disabled"
                              ? "Oculto porque a conta do autor foi desativada"
                              : c.hiddenBy
                                ? `Oculto por @${c.hiddenBy}`
                                : "Oculto"
                          }
                        >
                          Oculto
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
                        data-testid={`hide-toggle-${c._id}`}
                        onClick={() => handleToggleHidden(c)}
                        disabled={
                          busyId === c._id ||
                          (!!c.hiddenAt &&
                            c.hiddenReason === "account-disabled")
                        }
                        title={
                          c.hiddenAt && c.hiddenReason === "account-disabled"
                            ? "Reexiba reativando a conta do autor"
                            : undefined
                        }
                        className={
                          c.hiddenAt
                            ? "text-[12px] px-3 py-1.5 rounded-md border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition disabled:opacity-50"
                            : "text-[12px] px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
                        }
                      >
                        {c.hiddenAt ? "Reexibir" : "Ocultar"}
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

                {nextCursor && (
                  <div className="flex items-center justify-center mt-2">
                    <button
                      type="button"
                      onClick={loadMoreComments}
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
        )}

        {/* Users tab — newest cadastros first, with inline promote/demote. */}
        {tab === "users" && (
          <section role="tabpanel">
            <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                Usuários cadastrados
                {!usersLoading && users.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-slate-400 dark:text-slate-500">
                    ({users.length}
                    {usersCursor ? "+" : ""})
                  </span>
                )}
              </h2>
              <button
                type="button"
                onClick={() => resetUsers(usersQuery)}
                className="text-xs text-brand hover:underline disabled:opacity-50"
                disabled={usersLoading}
              >
                {usersLoading && users.length === 0 ? "Atualizando…" : "Atualizar"}
              </button>
            </div>

            <form onSubmit={submitUsersSearch} className="mb-4 flex gap-2 flex-wrap">
              <label htmlFor="users-search" className="sr-only">Buscar usuários</label>
              <input
                id="users-search"
                type="search"
                value={usersInput}
                onChange={(e) => setUsersInput(e.target.value)}
                placeholder="Buscar por username, email ou nome…"
                className="flex-1 min-w-[200px] border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand"
              />
              <button
                type="submit"
                className="text-sm font-semibold px-4 py-2 rounded-md bg-brand text-white hover:opacity-90 transition disabled:opacity-50"
                disabled={usersLoading}
              >
                Buscar
              </button>
              {usersQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setUsersInput("");
                    setUsersQuery("");
                  }}
                  className="text-sm font-semibold px-4 py-2 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Limpar
                </button>
              )}
            </form>

            {usersLoading && users.length === 0 ? (
              <div className="text-center text-slate-400 py-10">Carregando…</div>
            ) : users.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                {usersQuery ? "Nenhum usuário encontrado para essa busca." : "Nenhum usuário cadastrado."}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {users.map((u) => (
                  <div
                    key={u._id}
                    data-testid={`admin-user-${u.username}`}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-3.5 px-[18px] flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/u/${u.username}`}
                        className="font-semibold text-[14px] text-slate-800 dark:text-slate-100 hover:underline"
                      >
                        @{u.username}
                      </Link>
                      {u.displayName && u.displayName !== u.username && (
                        <span className="text-[12px] text-slate-500 dark:text-slate-400">
                          ({u.displayName})
                        </span>
                      )}
                      {u.moderator && (
                        <span className="inline-flex items-center bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full px-2.5 h-5 text-[11px] font-semibold">
                          Moderador
                        </span>
                      )}
                      {u.disabled && (
                        <span
                          data-testid={`user-disabled-badge-${u.username}`}
                          className="inline-flex items-center bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full px-2.5 h-5 text-[11px] font-semibold"
                        >
                          Desativado
                        </span>
                      )}
                      <span className="ml-auto text-[11px] text-slate-400 dark:text-slate-500">
                        Desde {dateFormat(u.createdAt)}
                      </span>
                    </div>
                    <div className="text-[12px] text-slate-500 dark:text-slate-400">
                      {u.email}
                      {u.state && <span className="ml-2 text-slate-400 dark:text-slate-500">· {u.state}</span>}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <Link
                        href={`/u/${u.username}`}
                        className="text-[12px] px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                      >
                        Ver perfil
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleUserModeratorToggle(u)}
                        disabled={busyEmail === u.email}
                        className={
                          u.moderator
                            ? "text-[12px] px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
                            : "text-[12px] px-3 py-1.5 rounded-md bg-brand text-white hover:opacity-90 transition disabled:opacity-50"
                        }
                      >
                        {u.moderator ? "Rebaixar" : "Promover"}
                      </button>
                      {/* A moderator can't disable or delete their own account
                          from here — avoids locking yourself out. */}
                      {u.email !== user.email && (
                        <>
                          <button
                            type="button"
                            data-testid={`disable-toggle-${u.username}`}
                            onClick={() => handleToggleDisabled(u)}
                            disabled={busyEmail === u.email}
                            className={
                              u.disabled
                                ? "text-[12px] px-3 py-1.5 rounded-md bg-amber-600 text-white hover:bg-amber-700 transition disabled:opacity-50"
                                : "text-[12px] px-3 py-1.5 rounded-md border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition disabled:opacity-50"
                            }
                          >
                            {u.disabled ? "Reativar" : "Desativar"}
                          </button>
                          <button
                            type="button"
                            data-testid={`delete-user-${u.username}`}
                            onClick={() => handleDeleteUser(u)}
                            disabled={busyEmail === u.email}
                            className="text-[12px] px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
                          >
                            Excluir
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {usersCursor && (
                  <div className="flex items-center justify-center mt-2">
                    <button
                      type="button"
                      onClick={loadMoreUsers}
                      disabled={usersLoading}
                      className="text-sm font-semibold px-4 py-2 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
                    >
                      {usersLoading ? "Carregando…" : "Carregar mais"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        <p className="text-[11px] text-slate-400 dark:text-slate-600 text-center">
          Logado como <strong>{user.username}</strong> · moderador
        </p>
      </main>
    </div>
  );
}
