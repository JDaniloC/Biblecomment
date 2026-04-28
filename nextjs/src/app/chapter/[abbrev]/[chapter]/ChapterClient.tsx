"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useNotification } from "@/contexts/NotificationContext";
import { commentsService } from "@/services/comments";
import { Book } from "@/domain/entities/Book";
import { Verse } from "@/domain/entities/Verse";
import type { CommentData } from "@/lib/comment-data";
import OmniSearch from "@/app/_components/OmniSearch";
import { CopyVerseButton } from "@/components/CopyVerseButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationsBell } from "@/components/NotificationsBell";
import { FontSizeControl } from "@/components/FontSizeControl";
import { TAG_META, TAG_ORDER, getTagMeta } from "@/lib/tag-meta";
import {
  toggleLikeAction,
  reportCommentAction,
  deleteCommentAction,
  createCommentAction,
  updateCommentAction,
} from "@/app/actions/comments";

interface SessionUser {
  name: string;
  email: string;
  username: string;
  moderator: boolean;
}

interface Props {
  book: Book;
  verses: Verse[];
  chapter: number;
  user: SessionUser;
}

const MIN_LEN = 200;
const MAX_LEN = 1000;

function dateFormat(str: string) {
  try {
    return new Date(str).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return str;
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ChapterClient({ book, verses, chapter, user }: Props) {
  const router = useRouter();
  const { handleNotification } = useNotification();

  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [isTitleMode, setIsTitleMode] = useState(false);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [titleComments, setTitleComments] = useState<CommentData[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [countMap, setCountMap] = useState<Record<string, number>>({});
  const [titleCount, setTitleCount] = useState(0);

  const [composing, setComposing] = useState(false);
  const [composeText, setComposeText] = useState("");
  const [composeTags, setComposeTags] = useState<Record<string, boolean>>({
    devocional: false, exegese: false, pessoal: false, inspirado: false,
  });
  const [composeSubmitting, setComposeSubmitting] = useState(false);
  const [editingComment, setEditingComment] = useState<CommentData | null>(null);
  const [editText, setEditText] = useState("");
  const [editTags, setEditTags] = useState<Record<string, boolean>>({
    devocional: false, exegese: false, pessoal: false, inspirado: false,
  });

  const [showUserMenu, setShowUserMenu] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const prevChapter = chapter > 1 ? chapter - 1 : null;
  const nextChapter = chapter < book.chapters ? chapter + 1 : null;

  const activeComments = isTitleMode ? titleComments : comments;

  const loadCounts = useCallback(async () => {
    try {
      const res = await commentsService.getForChapter(book.abbrev, chapter);
      const tc = (res.titleComments ?? []) as unknown as CommentData[];
      const vc = (res.verseComments ?? []) as unknown as CommentData[];
      setTitleCount(tc.length);
      const map: Record<string, number> = {};
      vc.forEach((c) => {
        if (c.verseId) map[c.verseId] = (map[c.verseId] ?? 0) + 1;
      });
      setCountMap(map);
    } catch {
    }
  }, [book.abbrev, chapter]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const openTitlePanel = useCallback(async () => {
    setIsTitleMode(true);
    setSelectedVerse(null);
    setComposing(false);
    setLoadingComments(true);
    try {
      const res = await commentsService.getForChapter(book.abbrev, chapter);
      setTitleComments((res.titleComments ?? []) as unknown as CommentData[]);
    } catch {
      handleNotification("error", "Erro ao carregar comentários do capítulo.");
    } finally {
      setLoadingComments(false);
    }
  }, [book.abbrev, chapter, handleNotification]);

  const openVersePanel = useCallback(async (verse: Verse) => {
    if (selectedVerse?._id === verse._id && !isTitleMode) {
      setSelectedVerse(null);
      setComposing(false);
      return;
    }
    setIsTitleMode(false);
    setSelectedVerse(verse);
    setComposing(false);
    setLoadingComments(true);
    try {
      const res = await commentsService.getForVerse(book.abbrev, chapter, verse.verseNumber);
      setComments((res.verseComments ?? []) as unknown as CommentData[]);
    } catch {
      handleNotification("error", "Erro ao carregar comentários.");
    } finally {
      setLoadingComments(false);
    }
  }, [book.abbrev, chapter, isTitleMode, selectedVerse, handleNotification]);

  const handleClose = useCallback(() => {
    setSelectedVerse(null);
    setIsTitleMode(false);
    setComposing(false);
    setComments([]);
    setTitleComments([]);
  }, []);

  const resetCompose = useCallback(() => {
    setComposeText("");
    setComposeTags({ devocional: false, exegese: false, pessoal: false, inspirado: false });
    setComposing(false);
  }, []);

  const handleCompose = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (composeText.length < MIN_LEN || composeText.length > MAX_LEN) {
      handleNotification("info", `Comentário deve ter entre ${MIN_LEN} e ${MAX_LEN} caracteres.`);
      return;
    }
    const tagList = Object.entries(composeTags).filter(([, v]) => v).map(([k]) => k);
    setComposeSubmitting(true);
    try {
      const verseId = isTitleMode
        ? `${book.abbrev}/${chapter}`
        : `${book.abbrev}/${chapter}/${selectedVerse?.verseNumber ?? 1}`;
      const result = await createCommentAction(verseId, {
        onTitle: isTitleMode,
        text: composeText,
        tags: tagList,
      });
      if (!result.ok) {
        handleNotification("error", result.error || "Erro ao publicar.");
        return;
      }
      const created = result.data as unknown as CommentData;
      handleNotification("success", "Comentário publicado!");
      if (isTitleMode) {
        setTitleComments((prev) => [created, ...prev]);
        setTitleCount((n) => n + 1);
      } else {
        setComments((prev) => [created, ...prev]);
        if (selectedVerse?._id) {
          setCountMap((prev) => ({ ...prev, [selectedVerse._id!]: (prev[selectedVerse._id!] ?? 0) + 1 }));
        }
      }
      resetCompose();
    } finally {
      setComposeSubmitting(false);
    }
  }, [composeText, composeTags, isTitleMode, book.abbrev, chapter, selectedVerse, handleNotification, resetCompose]);

  const handleLike = useCallback(async (id: string) => {
    const result = await toggleLikeAction(id);
    if (!result.ok) {
      handleNotification("error", "Erro ao curtir.");
      return;
    }
    // The Server Action returns the domain Comment (Date typed as Date),
    // but Next.js serializes Date → string at the boundary, matching
    // CommentData. The double cast acknowledges that.
    const updater = (prev: CommentData[]) =>
      prev.map((c) => (c._id === id ? (result.data as unknown as CommentData) : c));
    setComments(updater);
    setTitleComments(updater);
  }, [handleNotification]);

  const handleReport = useCallback(async (id: string) => {
    const result = await reportCommentAction(id);
    if (!result.ok) {
      handleNotification("error", "Erro ao reportar.");
      return;
    }
    handleNotification("info", "Comentário reportado.");
  }, [handleNotification]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Excluir este comentário?")) return;
    const result = await deleteCommentAction(id);
    if (!result.ok) {
      handleNotification("error", result.error === "Forbidden" ? "Sem permissão." : "Erro ao excluir.");
      return;
    }
    setComments((prev) => prev.filter((c) => c._id !== id));
    setTitleComments((prev) => prev.filter((c) => c._id !== id));
    handleNotification("success", "Comentário excluído.");
  }, [handleNotification]);

  const startEdit = useCallback((comment: CommentData) => {
    setEditingComment(comment);
    setEditText(comment.text);
    const tagMap: Record<string, boolean> = { devocional: false, exegese: false, pessoal: false, inspirado: false };
    comment.tags.forEach((t) => { if (t in tagMap) tagMap[t] = true; });
    setEditTags(tagMap);
  }, []);

  const handleEditSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingComment) return;
    if (editText.length < MIN_LEN || editText.length > MAX_LEN) {
      handleNotification("info", `Comentário deve ter entre ${MIN_LEN} e ${MAX_LEN} caracteres.`);
      return;
    }
    const tagList = Object.entries(editTags).filter(([, v]) => v).map(([k]) => k);
    const result = await updateCommentAction(editingComment._id, { text: editText, tags: tagList });
    if (!result.ok) {
      handleNotification("error", "Erro ao editar.");
      return;
    }
    const updated = result.data as unknown as CommentData;
    setComments((prev) => prev.map((c) => c._id === editingComment._id ? updated : c));
    setTitleComments((prev) => prev.map((c) => c._id === editingComment._id ? updated : c));
    handleNotification("success", "Comentário editado!");
    setEditingComment(null);
  }, [editingComment, editText, editTags, handleNotification]);

  const handleDiscussion = useCallback((id: string, text: string, reference: string) => {
    router.push(`/discussion/${book.abbrev}?commentId=${id}&ref=${encodeURIComponent(reference)}&text=${encodeURIComponent(text)}`);
  }, [book.abbrev, router]);

  const showSidebar = selectedVerse !== null || isTitleMode;

  // Keyboard navigation: ← / → for chapters, Esc to close the comment
  // sidebar. Skip when the user is typing in an input/textarea or when a
  // modifier key is pressed (so browser shortcuts still work).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      if (e.key === "Escape" && showSidebar) {
        e.preventDefault();
        handleClose();
      } else if (e.key === "ArrowRight" && nextChapter && !showSidebar) {
        e.preventDefault();
        router.push(`/verses/${book.abbrev}/${nextChapter}`);
      } else if (e.key === "ArrowLeft" && prevChapter && !showSidebar) {
        e.preventDefault();
        router.push(`/verses/${book.abbrev}/${prevChapter}`);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showSidebar, nextChapter, prevChapter, book.abbrev, router, handleClose]);

  // Swipe-to-navigate (touch only, mobile). Threshold ~60px horizontal,
  // ignored if vertical movement dominates (avoids hijacking scrolls)
  // or if the sidebar is open (would conflict with closing the drawer).
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (showSidebar) return;
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }, [showSidebar]);
  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
    if (dx < 0 && nextChapter) router.push(`/verses/${book.abbrev}/${nextChapter}`);
    else if (dx > 0 && prevChapter) router.push(`/verses/${book.abbrev}/${prevChapter}`);
  }, [book.abbrev, nextChapter, prevChapter, router]);

  const sidebarTitle = isTitleMode
    ? `${book.name} ${chapter}`
    : selectedVerse
      ? `${book.abbrev.charAt(0).toUpperCase() + book.abbrev.slice(1)} ${chapter}:${selectedVerse.verseNumber}`
      : "";

  const sidebarRef2 = sidebarRef;

  const initials = getInitials(user.name || user.username || "U");

  return (
    <div className="min-h-screen flex flex-col bg-[#f9f9f7] dark:bg-slate-950">

      {/* ── Navbar ── */}
      <header className="h-[68px] bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center px-3 md:px-6 gap-3 md:gap-8 sticky top-0 z-50 flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <img src="/assets/logo.svg" alt="BibleComment" width={42} height={42} className="block w-9 h-9 md:w-[42px] md:h-[42px]" />
          <div className="hidden sm:block">
            <div className="font-bold text-[15px] text-slate-800 dark:text-slate-100 leading-[22.5px] whitespace-nowrap">BibleComment</div>
            <div className="font-light text-[11px] text-[#888] dark:text-slate-400 leading-[16.5px] whitespace-nowrap">A Program for His Glory</div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="hidden md:flex gap-5 flex-shrink-0">
          <Link href="/home" className="font-medium text-sm text-slate-800 dark:text-slate-100 no-underline">Livros</Link>
          <Link href="/discussions" className="font-medium text-sm text-slate-800 dark:text-slate-100 no-underline">Discussões</Link>
        </nav>

        {/* OmniSearch */}
        <div className="flex-1 min-w-0">
          <OmniSearch />
        </div>

        <div className="hidden md:inline-flex"><FontSizeControl /></div>
        <NotificationsBell />
        <ThemeToggle />

        {/* UserDropdown */}
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowUserMenu((v) => !v)}
            className="w-9 h-9 rounded-[18px] bg-brand border-2 border-brand flex items-center justify-center cursor-pointer"
          >
            <span className="font-bold text-[13px] text-white leading-[13px]">{initials}</span>
          </button>

          {showUserMenu && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-[49]" onClick={() => setShowUserMenu(false)} />
              {/* Dropdown */}
              <div className="absolute right-0 top-11 w-[200px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[10px] shadow-[0px_8px_30px_0px_rgba(0,0,0,0.14),0px_2px_8px_0px_rgba(0,0,0,0.06)] overflow-hidden z-50">
                {/* Header */}
                <div className="px-4 pt-3 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-100 leading-[21px] whitespace-nowrap overflow-hidden text-ellipsis">{user.name}</div>
                  <div className="font-normal text-xs text-slate-400 dark:text-slate-500 leading-[18px]">@{user.username}</div>
                </div>
                {/* Items */}
                {[
                  { label: "Meu Perfil",        href: "/profile",  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
                  { label: "Meus Comentários",   href: "/profile",  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
                  { label: "Favoritos",          href: "/profile",  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
                ].map(({ label, href, icon }) => (
                  <Link
                    key={label}
                    href={href}
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 h-[35.5px] pl-4 no-underline"
                  >
                    <span className="text-slate-600 dark:text-slate-300 flex">{icon}</span>
                    <span className="font-medium text-[13px] text-slate-600 dark:text-slate-300 whitespace-nowrap">{label}</span>
                  </Link>
                ))}
                <div className="h-px bg-slate-100 dark:bg-slate-800" />
                <Link
                  href="/profile?tab=config"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 h-[35.5px] pl-4 no-underline"
                >
                  <span className="text-slate-600 dark:text-slate-300 flex">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M4.93 19.07l1.41-1.41M19.07 19.07l-1.41-1.41M20 12h2M2 12h2M12 20v2M12 2v2"/></svg>
                  </span>
                  <span className="font-medium text-[13px] text-slate-600 dark:text-slate-300">Configurações</span>
                </Link>
                {user.moderator && (
                  <Link
                    href="/admin/moderation"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 h-[35.5px] pl-4 no-underline"
                  >
                    <span className="text-amber-600 dark:text-amber-400 flex">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    </span>
                    <span className="font-medium text-[13px] text-amber-700 dark:text-amber-300">Moderação</span>
                  </Link>
                )}
                <Link
                  href="/api/auth/signout"
                  className="flex items-center gap-2.5 h-[35.5px] pl-4 no-underline"
                >
                  <span className="text-red-600 dark:text-red-400 flex">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  </span>
                  <span className="font-medium text-[13px] text-red-600 dark:text-red-400">Sair</span>
                </Link>
              </div>
            </>
          )}
        </div>
      </header>

      <div className="flex flex-1 relative min-h-0">
        <main
          id="main-content"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className={`flex-1 overflow-y-auto transition-[padding] duration-200 ${showSidebar ? "md:pr-[420px]" : ""}`}
        >
          <div className="max-w-[680px] mx-auto px-6 py-10">
            <div className="flex items-center gap-4 mb-2 text-sm text-gray-400 dark:text-gray-500">
              <Link href="/home" className="hover:text-blue-600 dark:hover:text-blue-400 transition">← Livros</Link>
              {prevChapter && (
                <Link href={`/verses/${book.abbrev}/${prevChapter}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition">
                  Cap. {prevChapter}
                </Link>
              )}
              <span className="flex-1" />
              {nextChapter && (
                <Link href={`/verses/${book.abbrev}/${nextChapter}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition">
                  Cap. {nextChapter}
                </Link>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 mt-6 mb-8">
              <button
                type="button"
                onClick={openTitlePanel}
                className="flex items-center gap-2 hover:opacity-80 transition"
              >
                <h1
                  className="font-serif font-bold text-slate-800 dark:text-slate-100 tracking-[1.9px] uppercase text-[clamp(24px,4vw,38px)]"
                >
                  {book.name} {chapter}
                </h1>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>

            {(titleCount > 0 || isTitleMode) && (
              <button
                type="button"
                onClick={openTitlePanel}
                className="flex items-center gap-3 w-full mb-6 px-4 py-2.5 rounded-r-md text-left transition hover:bg-black/5 bg-black/[0.02] border-l-4 border-solid"
                style={{
                  borderLeftColor: isTitleMode ? "#137ddb" : "rgba(0,0,0,0)"
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span className="text-[14px] text-slate-500 dark:text-slate-400 flex-1">Visão Geral do Capítulo</span>
                {titleCount > 0 && (
                  <span className="bg-brand text-white text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[22px] text-center">
                    {titleCount}
                  </span>
                )}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}

            <div className="relative">
              <div
                className="hidden md:block absolute left-[-40px] top-0 font-serif select-none pointer-events-none text-[80px] leading-[80px] font-black text-slate-800 dark:text-slate-100 opacity-80"
              >
                {chapter}
              </div>

              <ul className="space-y-[2px]">
                {verses.map((verse) => {
                  const count = verse._id ? (countMap[verse._id] ?? 0) : 0;
                  const isSelected = selectedVerse?._id === verse._id && !isTitleMode;
                  return (
                    <li key={verse._id} id={String(verse.verseNumber)} className="group relative">
                      <button
                        type="button"
                        onClick={() => openVersePanel(verse)}
                        className="flex items-start gap-3 md:gap-3 gap-2 w-full text-left rounded-r-[4px] transition border-l-4 border-solid pt-3 pr-2.5 pb-3 pl-3 md:pt-2 md:pb-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-100 dark:active:bg-slate-800 min-h-[44px]"
                        style={{
                          borderLeftColor: isSelected ? "#137ddb" : "transparent",
                          background: isSelected ? "rgba(19,125,219,0.04)" : undefined
                        }}
                      >
                        <span
                          className="font-sans font-bold text-[14px] md:text-[13px] w-7 md:w-5 flex-shrink-0 text-right mt-[2px] transition"
                          style={{ color: isSelected ? "#137ddb" : "#94a3b8" }}
                        >
                          {verse.verseNumber}
                        </span>
                        <span
                          className="flex-1 font-serif leading-[1.85] transition text-[#1a1a1a] dark:text-slate-100"
                          style={{ fontSize: "calc(17px * var(--bc-text-scale, 1))" }}
                        >
                          {verse.text}
                        </span>
                        {count > 0 && (
                          <span
                            className="flex-shrink-0 flex items-center gap-1 h-[15px] px-2 rounded-[20px] bg-brand"
                          >
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                            <span className="font-bold text-[11px] text-white leading-[11px]">{count}</span>
                          </span>
                        )}
                      </button>
                      <div className="absolute right-1 top-1 opacity-60 md:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <CopyVerseButton
                          verse={{
                            abbrev: book.abbrev,
                            chapter,
                            verseNumber: verse.verseNumber,
                            text: verse.text,
                          }}
                          label=""
                          className="!px-1.5 !py-1"
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="mt-10 flex justify-between">
              {prevChapter && (
                <Link href={`/verses/${book.abbrev}/${prevChapter}`} className="text-sm px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition text-gray-600 dark:text-slate-300">
                  ← Capítulo {prevChapter}
                </Link>
              )}
              {nextChapter && (
                <Link href={`/verses/${book.abbrev}/${nextChapter}`} className="text-sm px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition text-gray-600 dark:text-slate-300 ml-auto">
                  Capítulo {nextChapter} →
                </Link>
              )}
            </div>
          </div>
        </main>

        {showSidebar && (
          <aside
            ref={sidebarRef2}
            className="fixed inset-0 md:inset-auto md:right-0 bg-white dark:bg-slate-900 md:border-l border-slate-200 dark:border-slate-700 z-30 flex flex-col md:w-[420px] md:top-[68px] md:h-[calc(100vh-68px)]"
          >
            <div className="border-b border-slate-200 dark:border-slate-700 px-5 py-3.5 flex items-center gap-3">
              <div className="flex-1">
                <p className="text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">Comentários</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">{sidebarTitle}</span>
                  <span className="bg-[rgba(19,125,219,0.09)] text-brand text-[11px] font-semibold rounded-[10px] min-w-[21px] h-[18.5px] inline-flex items-center justify-center px-[7px]">
                    {activeComments.length}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { if (composing) resetCompose(); else setComposing(true); }}
                className="flex items-center gap-[5px] h-[30.667px] px-[11px] border-[1.333px] border-brand rounded-md bg-transparent text-brand text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Comentar
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition ml-1"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {composing && (
                <div className="px-6 pt-4 pb-5">
                  {/* Composer card */}
                  <div className="bg-white dark:bg-slate-900 border border-[#d1d9e8] dark:border-slate-700 rounded-[10px] shadow-[0px_4px_20px_0px_rgba(19,125,219,0.10)] overflow-hidden">
                    {/* Header bar: "Comentando em Ref [Alterar]" */}
                    <div className="bg-[rgba(26,54,93,0.04)] dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center px-4 pt-[11px] pb-[10px] gap-1 min-h-[41.167px]">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      <span className="font-normal text-xs text-slate-500 dark:text-slate-400 ml-1.5">Comentando em</span>
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-100 ml-1">{sidebarTitle}</span>
                      {selectedVerse && !isTitleMode && (
                        <button
                          type="button"
                          onClick={() => openVersePanel(selectedVerse)}
                          className="font-medium text-[11px] text-tag-exegese bg-transparent border-none cursor-pointer ml-2 underline"
                        >
                          Alterar
                        </button>
                      )}
                    </div>

                    {/* Verse quote */}
                    {selectedVerse && !isTitleMode && (
                      <div className="mt-3 mx-4 bg-slate-50 dark:bg-slate-800 border-l-[2.667px] border-solid border-slate-300 dark:border-slate-600 rounded-r-md py-[9px] px-3">
                        <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-5 m-0">
                          {selectedVerse.verseNumber}. {selectedVerse.text}
                        </p>
                      </div>
                    )}

                    {/* Type CategoryCards */}
                    <div className="pt-3 px-4">
                      <div className="grid grid-cols-2 gap-1.5">
                        {TAG_ORDER.map((tag) => {
                          const meta = TAG_META[tag];
                          const active = composeTags[tag];
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => setComposeTags((prev) => ({ ...prev, [tag]: !prev[tag] }))}
                              className="flex items-center gap-2 h-[41.5px] px-[14px] rounded-[7px] border-2 border-solid cursor-pointer"
                              style={{
                                borderColor: active ? meta.border : "#e2e8f0",
                                background: active ? meta.bg : "#fafafa"
                              }}
                            >
                              <span className="w-2 h-2 rounded-sm flex-shrink-0 block" style={{ background: meta.border }} />
                              <span className="font-normal text-[13px]" style={{ color: active ? meta.color : "#64748b" }}>{meta.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Format toolbar + Textarea */}
                    <div className="pt-3 px-4 overflow-hidden">
                      {/* Toolbar */}
                      <div className="flex gap-0.5 pb-2 border-b border-slate-100 mb-2">
                        {["B", "I", "\u201C"].map((ch, i) => (
                          <button
                            key={i}
                            type="button"
                            className={`w-7 h-[26px] rounded border-none bg-transparent cursor-pointer text-slate-500 dark:text-slate-400 flex items-center justify-center ${i === 1 ? "font-serif italic" : "font-sans not-italic"} ${i === 0 ? "font-bold" : "font-medium"} ${i === 2 ? "text-[15px]" : "text-[13px]"}`}
                          >
                            {ch}
                          </button>
                        ))}
                      </div>
                      <form onSubmit={handleCompose}>
                        <textarea
                          value={composeText}
                          onChange={(e) => {
                            let v = e.target.value;
                            if (v.slice(-2) === "  ") v = v.slice(0, -1);
                            setComposeText(v);
                          }}
                          placeholder="Escreva seu comentário aqui…"
                          rows={4}
                          className="w-full border-none outline-none resize-none text-[14px] text-[rgba(26,26,26,0.85)] dark:text-slate-100 leading-[25.2px] bg-transparent box-border"
                        />
                        {/* Footer */}
                        <div className="border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 pt-3 pb-4 mt-1">
                          <button
                            type="button"
                            onClick={resetCompose}
                            className="font-medium text-[13px] text-slate-400 dark:text-slate-500 bg-transparent border-none cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <div className="flex items-center gap-1.5 ml-2">
                            <div className="w-8 h-[18px] rounded-[9px] bg-slate-300 dark:bg-slate-600 p-0.5 cursor-pointer">
                              <div className="w-3.5 h-3.5 rounded-[7px] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.2)]" />
                            </div>
                            <span className="font-normal text-[11px] text-slate-400 dark:text-slate-500">Anônimo</span>
                          </div>
                          <button
                            type="submit"
                            disabled={composeText.length < MIN_LEN || composeText.length > MAX_LEN || composeSubmitting}
                            className="ml-auto h-9 px-4 rounded-[7px] border-none font-semibold text-[13px] whitespace-nowrap"
                            style={{
                              cursor: composeText.length >= MIN_LEN ? "pointer" : "default",
                              background: composeText.length >= MIN_LEN && !composeSubmitting ? "#137ddb" : "#f1f5f9",
                              color: composeText.length >= MIN_LEN && !composeSubmitting ? "#fff" : "#a0aec0"
                            }}
                          >
                            {composeSubmitting ? "Publicando…" : "Publicar comentário"}
                          </button>
                        </div>
                        {composeText.length < MIN_LEN && composeText.length > 0 && (
                          <p className="text-[11px] text-amber-500 dark:text-amber-400 mt-0 mx-0 mb-2 text-right">
                            Mínimo {MIN_LEN} caracteres ({composeText.length}/{MIN_LEN})
                          </p>
                        )}
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {loadingComments ? (
                <div className="flex justify-center py-12">
                  <div className="w-6 h-6 border-2 border-[#137ddb] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : activeComments.length === 0 && !composing ? (
                <div className="text-center py-12 px-6">
                  <p className="text-slate-400 dark:text-slate-500 text-sm">Nenhum comentário ainda.</p>
                  <p className="text-slate-300 dark:text-slate-600 text-xs mt-1">Seja o primeiro a comentar!</p>
                  <button
                    type="button"
                    onClick={() => setComposing(true)}
                    className="mt-4 text-[13px] text-[#137ddb] hover:underline"
                  >
                    Escrever comentário
                  </button>
                </div>
              ) : (
                <div className="px-6 py-6 space-y-[12px]">
                  {activeComments.map((comment) => {
                    const meta = getTagMeta(comment.tags);
                    const isOwner = comment.username === user.username;

                    if (editingComment?._id === comment._id) {
                      return (
                        <div key={comment._id} className="bg-white dark:bg-slate-900 rounded-xl border border-[#e2e8f0] dark:border-slate-700 p-4">
                          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">Editando</p>
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            {TAG_ORDER.map((tag) => {
                              const tm = TAG_META[tag];
                              const active = editTags[tag];
                              return (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => setEditTags((prev) => ({ ...prev, [tag]: !prev[tag] }))}
                                  className="flex items-center gap-2 px-3 py-2 rounded-lg border text-[13px] font-medium transition"
                                  style={{ borderColor: active ? tm.border : "#e2e8f0", background: active ? tm.bg : "white", color: active ? tm.color : "#64748b" }}
                                >
                                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: tm.border }} />
                                  {tm.label}
                                </button>
                              );
                            })}
                          </div>
                          <form onSubmit={handleEditSave}>
                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              rows={4}
                              className="w-full border border-[#e2e8f0] dark:border-slate-700 rounded-lg px-3 py-2 text-[14px] text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 resize-none focus:outline-none focus:ring-2 focus:ring-[#137ddb]/30 focus:border-[#137ddb] transition"
                            />
                            <div className="flex gap-2 mt-2 justify-end">
                              <button type="button" onClick={() => setEditingComment(null)} className="text-[13px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">Cancelar</button>
                              <button type="submit" className="bg-[#137ddb] text-white text-[13px] font-semibold px-3 py-1.5 rounded-lg hover:bg-[#0f69c0] transition">Salvar</button>
                            </div>
                          </form>
                        </div>
                      );
                    }

                    const borderColor = meta ? meta.border : "#e2e8f0";
                    return (
                      <div
                        key={comment._id}
                        className="bg-white dark:bg-slate-900 border-l-4 border border-solid rounded-r-lg overflow-hidden shadow-[0px_1px_4px_0px_rgba(0,0,0,0.06)]"
                        style={{ borderColor }}
                      >
                        {/* Header row: icon + type + username + date */}
                        <div className="flex items-center pt-4 px-[18px] h-9">
                          {/* Book icon */}
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={borderColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                          </svg>
                          {/* Type label */}
                          {meta && (
                            <span className="font-semibold text-xs ml-2 whitespace-nowrap" style={{ color: meta.color }}>
                              {meta.label}
                            </span>
                          )}
                          {/* Username */}
                          <span className="font-semibold text-[13px] text-slate-800 dark:text-slate-100 ml-auto whitespace-nowrap">
                            {comment.username}
                          </span>
                          {/* Date */}
                          <span className="font-normal text-xs text-slate-400 dark:text-slate-500 ml-3 whitespace-nowrap">
                            {dateFormat(comment.createdAt)}
                          </span>
                        </div>

                        {/* Paragraph */}
                        <div className="pt-2.5 px-[18px]">
                          <p className="font-normal text-[14px] text-gray-700 dark:text-gray-300 leading-[25.2px] m-0 whitespace-pre-wrap">
                            {comment.text}
                          </p>
                        </div>

                        {/* Footer actions */}
                        <div className="border-t border-[#f7fafc] dark:border-slate-800 mt-3 mx-[18px] flex items-center h-[50.667px]">
                          {/* Útil button */}
                          <button
                            type="button"
                            onClick={() => handleLike(comment._id)}
                            className="flex items-center gap-[5px] px-2 h-[26px] rounded-[5px] border-none bg-transparent cursor-pointer font-medium text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            Útil · {comment.likes.length}
                          </button>

                          {/* Contribuir button */}
                          <button
                            type="button"
                            onClick={() => handleDiscussion(comment._id, comment.text, `${comment.username} ${comment.bookReference}`)}
                            className="flex items-center gap-[5px] px-2 h-[26px] rounded-[5px] border-none bg-transparent cursor-pointer font-medium text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap ml-0.5"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                            </svg>
                            Contribuir
                          </button>

                          {/* N Perspectiva badge */}
                          <div className="ml-auto bg-brand-tint rounded-[12px] h-[22.5px] flex items-center px-2.5 whitespace-nowrap">
                            <span className="font-semibold text-[11px] text-brand">
                              {comment.likes.length > 0 ? `${comment.likes.length} Perspectiva${comment.likes.length !== 1 ? "s" : ""}` : "0 Perspectivas"}
                            </span>
                          </div>

                          {/* ··· more options */}
                          <div className="relative ml-1">
                            <button
                              type="button"
                              className="flex items-center justify-center w-7 h-7 rounded-[5px] border-none bg-transparent cursor-pointer font-mono text-[15px] text-slate-400 dark:text-slate-500 tracking-[1.2px]"
                              onClick={() => {
                                if (isOwner) startEdit(comment);
                                else handleReport(comment._id);
                              }}
                            >
                              ···
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
