"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { useNotification } from "@/contexts/NotificationContext";
import { Book } from "@/domain/entities/Book";
import { Verse } from "@/domain/entities/Verse";
import type { CommentData } from "@/components/CommentCard";
import OmniSearch from "@/app/_components/OmniSearch";

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

const TAG_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  devocional: { label: "Devocional", color: "#4f46e5", bg: "rgba(79,70,229,0.08)",   border: "#4f46e5" },
  exegese:   { label: "Exegese",    color: "#0d9488", bg: "rgba(13,148,136,0.08)",  border: "#0d9488" },
  pessoal:   { label: "Pessoal",    color: "#d97706", bg: "rgba(217,119,6,0.08)",   border: "#d97706" },
  inspirado: { label: "Inspirado",  color: "#7c3aed", bg: "rgba(124,58,237,0.08)",  border: "#8b5cf6" },
};

const TAG_ORDER = ["devocional", "exegese", "pessoal", "inspirado"];

const MIN_LEN = 200;
const MAX_LEN = 1000;

function getTagMeta(tags: string[]) {
  for (const t of TAG_ORDER) {
    if (tags.includes(t)) return TAG_META[t];
  }
  return null;
}

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
      const res = await axios.get<{ titleComments: CommentData[]; verseComments: CommentData[] }>(
        `/api/comments/chapter/${book.abbrev}/${chapter}`
      );
      const tc = res.data.titleComments ?? [];
      const vc = res.data.verseComments ?? [];
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
      const res = await axios.get<{ titleComments: CommentData[]; verseComments: CommentData[] }>(
        `/api/comments/chapter/${book.abbrev}/${chapter}`
      );
      setTitleComments(res.data.titleComments ?? []);
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
      const res = await axios.get<{ titleComments: CommentData[]; verseComments: CommentData[] }>(
        `/api/comments/chapter/${book.abbrev}/${chapter}/${verse.verseNumber}`
      );
      const arr = res.data.verseComments ?? (Array.isArray(res.data) ? (res.data as CommentData[]) : []);
      setComments(arr);
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
      const res = await axios.post<CommentData>(`/api/comments/verse/${verseId}`, {
        onTitle: isTitleMode,
        text: composeText,
        tags: tagList,
      });
      handleNotification("success", "Comentário publicado!");
      if (isTitleMode) {
        setTitleComments((prev) => [res.data, ...prev]);
        setTitleCount((n) => n + 1);
      } else {
        setComments((prev) => [res.data, ...prev]);
        if (selectedVerse?._id) {
          setCountMap((prev) => ({ ...prev, [selectedVerse._id!]: (prev[selectedVerse._id!] ?? 0) + 1 }));
        }
      }
      resetCompose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Erro ao publicar.";
      handleNotification("error", msg);
    } finally {
      setComposeSubmitting(false);
    }
  }, [composeText, composeTags, isTitleMode, book.abbrev, chapter, selectedVerse, handleNotification, resetCompose]);

  const handleLike = useCallback(async (id: string) => {
    try {
      const res = await axios.patch<CommentData>(`/api/comments/${id}`, { action: "like" });
      const updater = (prev: CommentData[]) => prev.map((c) => c._id === id ? res.data : c);
      setComments(updater);
      setTitleComments(updater);
    } catch {
      handleNotification("error", "Erro ao curtir.");
    }
  }, [handleNotification]);

  const handleReport = useCallback(async (id: string) => {
    try {
      await axios.patch(`/api/comments/${id}`, { action: "report" });
      handleNotification("info", "Comentário reportado.");
    } catch {
      handleNotification("error", "Erro ao reportar.");
    }
  }, [handleNotification]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Excluir este comentário?")) return;
    try {
      await axios.delete(`/api/comments/${id}`);
      setComments((prev) => prev.filter((c) => c._id !== id));
      setTitleComments((prev) => prev.filter((c) => c._id !== id));
      handleNotification("success", "Comentário excluído.");
    } catch {
      handleNotification("error", "Erro ao excluir.");
    }
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
    try {
      const res = await axios.patch<CommentData>(`/api/comments/${editingComment._id}`, { text: editText, tags: tagList });
      setComments((prev) => prev.map((c) => c._id === editingComment._id ? res.data : c));
      setTitleComments((prev) => prev.map((c) => c._id === editingComment._id ? res.data : c));
      handleNotification("success", "Comentário editado!");
      setEditingComment(null);
    } catch {
      handleNotification("error", "Erro ao editar.");
    }
  }, [editingComment, editText, editTags, handleNotification]);

  const handleDiscussion = useCallback((id: string, text: string, reference: string) => {
    router.push(`/discussion/${book.abbrev}?commentId=${id}&ref=${encodeURIComponent(reference)}&text=${encodeURIComponent(text)}`);
  }, [book.abbrev, router]);

  const showSidebar = selectedVerse !== null || isTitleMode;

  const sidebarTitle = isTitleMode
    ? `${book.name} ${chapter}`
    : selectedVerse
      ? `${book.abbrev.charAt(0).toUpperCase() + book.abbrev.slice(1)} ${chapter}:${selectedVerse.verseNumber}`
      : "";

  const sidebarRef2 = sidebarRef;

  const initials = getInitials(user.name || user.username || "U");

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f9f9f7" }}>

      {/* ── Navbar ── */}
      <header style={{
        height: 68,
        background: "#fff",
        borderBottom: "0.667px solid #e2e8f0",
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        gap: 32,
        position: "sticky",
        top: 0,
        zIndex: 50,
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <img src="/assets/logo.svg" alt="BibleComment" width={42} height={42} style={{ display: "block" }} />
          <div>
            <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 15, color: "#1e293b", lineHeight: "22.5px", whiteSpace: "nowrap" }}>BibleComment</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 300, fontSize: 11, color: "#888", lineHeight: "16.5px", whiteSpace: "nowrap" }}>A Program for His Glory</div>
          </div>
        </div>

        {/* Nav links */}
        <nav style={{ display: "flex", gap: 20, flexShrink: 0 }}>
          <Link href="/home" style={{ fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: 14, color: "#1e293b", textDecoration: "none" }}>Livros</Link>
          <Link href="/discussions" style={{ fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: 14, color: "#1e293b", textDecoration: "none" }}>Discussões</Link>
        </nav>

        {/* OmniSearch */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <OmniSearch />
        </div>

        {/* UserDropdown */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setShowUserMenu((v) => !v)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              background: "#137ddb",
              border: "2px solid #137ddb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13, color: "#fff", lineHeight: "13px" }}>{initials}</span>
          </button>

          {showUserMenu && (
            <>
              {/* Backdrop */}
              <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setShowUserMenu(false)} />
              {/* Dropdown */}
              <div style={{
                position: "absolute",
                right: 0,
                top: 44,
                width: 200,
                background: "#fff",
                border: "0.667px solid #e2e8f0",
                borderRadius: 10,
                boxShadow: "0px 8px 30px 0px rgba(0,0,0,0.14), 0px 2px 8px 0px rgba(0,0,0,0.06)",
                overflow: "hidden",
                zIndex: 50,
              }}>
                {/* Header */}
                <div style={{ padding: "12px 16px 10px", borderBottom: "0.667px solid #f1f5f9" }}>
                  <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14, color: "#1e293b", lineHeight: "21px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: 12, color: "#94a3b8", lineHeight: "18px" }}>@{user.username}</div>
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
                    style={{ display: "flex", alignItems: "center", gap: 10, height: 35.5, padding: "0 0 0 16px", textDecoration: "none" }}
                  >
                    <span style={{ color: "#475569", display: "flex" }}>{icon}</span>
                    <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: 13, color: "#475569", whiteSpace: "nowrap" }}>{label}</span>
                  </Link>
                ))}
                <div style={{ height: 1, background: "#f1f5f9", margin: "0" }} />
                <Link
                  href="/profile?tab=config"
                  onClick={() => setShowUserMenu(false)}
                  style={{ display: "flex", alignItems: "center", gap: 10, height: 35.5, padding: "0 0 0 16px", textDecoration: "none" }}
                >
                  <span style={{ color: "#475569", display: "flex" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M4.93 19.07l1.41-1.41M19.07 19.07l-1.41-1.41M20 12h2M2 12h2M12 20v2M12 2v2"/></svg>
                  </span>
                  <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: 13, color: "#475569" }}>Configurações</span>
                </Link>
                <Link
                  href="/api/auth/signout"
                  style={{ display: "flex", alignItems: "center", gap: 10, height: 35.5, padding: "0 0 0 16px", textDecoration: "none" }}
                >
                  <span style={{ color: "#e53e3e", display: "flex" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  </span>
                  <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: 13, color: "#e53e3e" }}>Sair</span>
                </Link>
              </div>
            </>
          )}
        </div>
      </header>

      <div className="flex flex-1 relative" style={{ minHeight: 0 }}>
        <main className="flex-1 overflow-y-auto" style={{ paddingRight: showSidebar ? "420px" : "0" }}>
          <div className="max-w-[680px] mx-auto px-6 py-10">
            <div className="flex items-center gap-4 mb-2 text-sm text-gray-400">
              <Link href="/home" className="hover:text-blue-600 transition">← Livros</Link>
              {prevChapter && (
                <Link href={`/verses/${book.abbrev}/${prevChapter}`} className="hover:text-blue-600 transition">
                  Cap. {prevChapter}
                </Link>
              )}
              <span className="flex-1" />
              {nextChapter && (
                <Link href={`/verses/${book.abbrev}/${nextChapter}`} className="hover:text-blue-600 transition">
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
                  className="font-['Merriweather',serif] font-bold text-[#1e293b] tracking-widest uppercase"
                  style={{ fontSize: "clamp(24px, 4vw, 38px)", letterSpacing: "1.9px" }}
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
                className="flex items-center gap-3 w-full mb-6 px-4 py-2.5 rounded-r-md text-left transition hover:bg-black/5"
                style={{
                  background: "rgba(0,0,0,0.02)",
                  borderLeftWidth: "4px",
                  borderLeftStyle: "solid",
                  borderLeftColor: isTitleMode ? "#137ddb" : "rgba(0,0,0,0)",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span className="text-[14px] text-slate-500 flex-1">Visão Geral do Capítulo</span>
                {titleCount > 0 && (
                  <span className="bg-[#137ddb] text-white text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[22px] text-center">
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
                className="absolute left-[-40px] top-0 font-['Merriweather',serif] select-none pointer-events-none"
                style={{ fontSize: 80, lineHeight: "80px", fontWeight: 900, color: "#1e293b", opacity: 0.8, userSelect: "none" }}
              >
                {chapter}
              </div>

              <ul className="space-y-[2px]">
                {verses.map((verse) => {
                  const count = verse._id ? (countMap[verse._id] ?? 0) : 0;
                  const isSelected = selectedVerse?._id === verse._id && !isTitleMode;
                  return (
                    <li key={verse._id}>
                      <button
                        type="button"
                        onClick={() => openVersePanel(verse)}
                        className="flex items-start gap-3 w-full text-left rounded-r-[4px] transition group"
                        style={{
                          borderLeftWidth: "4px",
                          borderLeftStyle: "solid",
                          borderLeftColor: isSelected ? "#137ddb" : "transparent",
                          padding: "8px 10px 8px 12px",
                          background: isSelected ? "rgba(19,125,219,0.04)" : "transparent",
                        }}
                      >
                        <span
                          className="font-['Inter',sans-serif] font-bold text-[13px] w-5 flex-shrink-0 text-right mt-[2px] transition"
                          style={{ color: isSelected ? "#137ddb" : "#94a3b8" }}
                        >
                          {verse.verseNumber}
                        </span>
                        <span
                          className="flex-1 font-['Merriweather',serif] text-[17px] leading-[1.85] transition"
                          style={{ color: isSelected ? "#1a1a1a" : "#1a1a1a" }}
                        >
                          {verse.text}
                        </span>
                        {count > 0 && (
                          <span
                            style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 4, height: 15, padding: "0 8px", borderRadius: 20, background: "#137ddb" }}
                          >
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                            <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 11, color: "#fff", lineHeight: "11px" }}>{count}</span>
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="mt-10 flex justify-between">
              {prevChapter && (
                <Link href={`/verses/${book.abbrev}/${prevChapter}`} className="text-sm px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition text-gray-600">
                  ← Capítulo {prevChapter}
                </Link>
              )}
              {nextChapter && (
                <Link href={`/verses/${book.abbrev}/${nextChapter}`} className="text-sm px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition text-gray-600 ml-auto">
                  Capítulo {nextChapter} →
                </Link>
              )}
            </div>
          </div>
        </main>

        {showSidebar && (
          <aside
            ref={sidebarRef2}
            className="fixed right-0 bg-white border-l border-[#e2e8f0] z-30 flex flex-col"
            style={{ width: "420px", top: 68, height: "calc(100vh - 68px)" }}
          >
            <div className="border-b border-[#e2e8f0] px-5 py-3.5 flex items-center gap-3">
              <div className="flex-1">
                <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Comentários</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[13px] font-semibold text-slate-700">{sidebarTitle}</span>
                  <span style={{ background: "rgba(19,125,219,0.09)", color: "#137ddb", fontSize: 11, fontWeight: 600, fontFamily: "Inter, sans-serif", borderRadius: 10, minWidth: 21, height: 18.5, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 7px" }}>
                    {activeComments.length}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { if (composing) resetCompose(); else setComposing(true); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  height: 30.667,
                  padding: "0 11px",
                  border: "1.333px solid #137ddb",
                  borderRadius: 6,
                  background: "none",
                  color: "#137ddb",
                  fontSize: 12,
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Comentar
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-600 transition ml-1"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {composing && (
                <div style={{ padding: "16px 24px 20px" }}>
                  {/* Composer card */}
                  <div style={{
                    background: "#fff",
                    border: "0.667px solid #d1d9e8",
                    borderRadius: 10,
                    boxShadow: "0px 4px 20px 0px rgba(19,125,219,0.10)",
                    overflow: "hidden",
                  }}>
                    {/* Header bar: "Comentando em Ref [Alterar]" */}
                    <div style={{
                      background: "rgba(26,54,93,0.04)",
                      borderBottom: "0.667px solid #e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      padding: "11px 16px 10px",
                      gap: 4,
                      minHeight: 41.167,
                    }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: 12, color: "#64748b", marginLeft: 6 }}>Comentando em</span>
                      <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 12, color: "#1e293b", marginLeft: 4 }}>{sidebarTitle}</span>
                      {selectedVerse && !isTitleMode && (
                        <button
                          type="button"
                          onClick={() => openVersePanel(selectedVerse)}
                          style={{ fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: 11, color: "#0d9488", background: "none", border: "none", cursor: "pointer", marginLeft: 8, textDecoration: "underline" }}
                        >
                          Alterar
                        </button>
                      )}
                    </div>

                    {/* Verse quote */}
                    {selectedVerse && !isTitleMode && (
                      <div style={{
                        margin: "12px 16px 0",
                        background: "#f8fafc",
                        borderLeft: "2.667px solid #cbd5e0",
                        borderRadius: "0 6px 6px 0",
                        padding: "9px 12px",
                      }}>
                        <p style={{ fontFamily: "Merriweather, serif", fontSize: 13, color: "#475569", lineHeight: "20px", margin: 0 }}>
                          {selectedVerse.verseNumber}. {selectedVerse.text}
                        </p>
                      </div>
                    )}

                    {/* Type CategoryCards */}
                    <div style={{ padding: "12px 16px 0" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                        {TAG_ORDER.map((tag) => {
                          const meta = TAG_META[tag];
                          const active = composeTags[tag];
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => setComposeTags((prev) => ({ ...prev, [tag]: !prev[tag] }))}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                height: 41.5,
                                padding: "0 14px",
                                borderRadius: 7,
                                border: `2px solid ${active ? meta.border : "#e2e8f0"}`,
                                background: active ? meta.bg : "#fafafa",
                                cursor: "pointer",
                              }}
                            >
                              <span style={{ width: 8, height: 8, borderRadius: 4, background: meta.border, flexShrink: 0, display: "block" }} />
                              <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: 13, color: active ? meta.color : "#64748b" }}>{meta.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Format toolbar + Textarea */}
                    <div style={{ padding: "12px 16px 0", overflow: "hidden" }}>
                      {/* Toolbar */}
                      <div style={{ display: "flex", gap: 2, paddingBottom: 8, borderBottom: "0.667px solid #f1f5f9", marginBottom: 8 }}>
                        {["B", "I", "\u201C"].map((ch, i) => (
                          <button key={i} type="button" style={{ width: 28, height: 26, borderRadius: 4, border: "none", background: "none", cursor: "pointer", fontFamily: i === 1 ? "Georgia, serif" : "Inter, sans-serif", fontStyle: i === 1 ? "italic" : "normal", fontWeight: i === 0 ? 700 : 500, fontSize: i === 2 ? 15 : 13, color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
                          style={{
                            width: "100%",
                            border: "none",
                            outline: "none",
                            resize: "none",
                            fontFamily: "Inter, sans-serif",
                            fontSize: 14,
                            color: "rgba(26,26,26,0.85)",
                            lineHeight: "25.2px",
                            background: "transparent",
                            boxSizing: "border-box",
                          }}
                        />
                        {/* Footer */}
                        <div style={{ borderTop: "0.667px solid #f1f5f9", display: "flex", alignItems: "center", gap: 8, padding: "12px 0 16px", marginTop: 4 }}>
                          <button
                            type="button"
                            onClick={resetCompose}
                            style={{ fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: 13, color: "#94a3b8", background: "none", border: "none", cursor: "pointer" }}
                          >
                            Cancelar
                          </button>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8 }}>
                            <div style={{ width: 32, height: 18, borderRadius: 9, background: "#cbd5e0", padding: 2, cursor: "pointer" }}>
                              <div style={{ width: 14, height: 14, borderRadius: 7, background: "#fff", boxShadow: "0px 1px 3px 0px rgba(0,0,0,0.2)" }} />
                            </div>
                            <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: 11, color: "#94a3b8" }}>Anônimo</span>
                          </div>
                          <button
                            type="submit"
                            disabled={composeText.length < MIN_LEN || composeText.length > MAX_LEN || composeSubmitting}
                            style={{
                              marginLeft: "auto",
                              height: 36,
                              padding: "0 16px",
                              borderRadius: 7,
                              border: "none",
                              cursor: composeText.length >= MIN_LEN ? "pointer" : "default",
                              background: composeText.length >= MIN_LEN && !composeSubmitting ? "#137ddb" : "#f1f5f9",
                              color: composeText.length >= MIN_LEN && !composeSubmitting ? "#fff" : "#a0aec0",
                              fontFamily: "Inter, sans-serif",
                              fontWeight: 600,
                              fontSize: 13,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {composeSubmitting ? "Publicando…" : "Publicar comentário"}
                          </button>
                        </div>
                        {composeText.length < MIN_LEN && composeText.length > 0 && (
                          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#f59e0b", margin: "0 0 8px", textAlign: "right" }}>
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
                  <p className="text-slate-400 text-sm">Nenhum comentário ainda.</p>
                  <p className="text-slate-300 text-xs mt-1">Seja o primeiro a comentar!</p>
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
                        <div key={comment._id} className="bg-white rounded-xl border border-[#e2e8f0] p-4">
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Editando</p>
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
                              className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-[14px] text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-[#137ddb]/30 focus:border-[#137ddb] transition"
                            />
                            <div className="flex gap-2 mt-2 justify-end">
                              <button type="button" onClick={() => setEditingComment(null)} className="text-[13px] text-slate-500 hover:text-slate-700">Cancelar</button>
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
                        style={{
                          background: "#fff",
                          borderStyle: "solid",
                          borderLeftWidth: 4,
                          borderTopWidth: 0.667,
                          borderRightWidth: 0.667,
                          borderBottomWidth: 0.667,
                          borderColor,
                          borderRadius: "0 8px 8px 0",
                          overflow: "hidden",
                          boxShadow: "0px 1px 4px 0px rgba(0,0,0,0.06)",
                        }}
                      >
                        {/* Header row: icon + type + username + date */}
                        <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "16px 18px 0", height: 36 }}>
                          {/* Book icon */}
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={borderColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                          </svg>
                          {/* Type label */}
                          {meta && (
                            <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, color: meta.color, marginLeft: 8, whiteSpace: "nowrap" }}>
                              {meta.label}
                            </span>
                          )}
                          {/* Username */}
                          <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, color: "#1e293b", marginLeft: "auto", whiteSpace: "nowrap" }}>
                            {comment.username}
                          </span>
                          {/* Date */}
                          <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: 12, color: "#94a3b8", marginLeft: 12, whiteSpace: "nowrap" }}>
                            {dateFormat(comment.createdAt)}
                          </span>
                        </div>

                        {/* Paragraph */}
                        <div style={{ padding: "10px 18px 0" }}>
                          <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: 14, color: "#374151", lineHeight: "25.2px", margin: 0, whiteSpace: "pre-wrap" }}>
                            {comment.text}
                          </p>
                        </div>

                        {/* Footer actions */}
                        <div style={{ borderTop: "0.667px solid #f7fafc", margin: "12px 18px 0", display: "flex", alignItems: "center", gap: 0, height: 50.667 }}>
                          {/* Útil button */}
                          <button
                            type="button"
                            onClick={() => handleLike(comment._id)}
                            style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 8px", height: 26, borderRadius: 5, border: "none", background: "none", cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: 12, color: "#94a3b8", whiteSpace: "nowrap" }}
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
                            style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 8px", height: 26, borderRadius: 5, border: "none", background: "none", cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: 12, color: "#94a3b8", whiteSpace: "nowrap", marginLeft: 2 }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                            </svg>
                            Contribuir
                          </button>

                          {/* N Perspectiva badge */}
                          <div
                            style={{ marginLeft: "auto", background: "rgba(19,125,219,0.07)", borderRadius: 12, height: 22.5, display: "flex", alignItems: "center", padding: "0 10px", whiteSpace: "nowrap" }}
                          >
                            <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 11, color: "#137ddb" }}>
                              {comment.likes.length > 0 ? `${comment.likes.length} Perspectiva${comment.likes.length !== 1 ? "s" : ""}` : "0 Perspectivas"}
                            </span>
                          </div>

                          {/* ··· more options */}
                          <div style={{ position: "relative", marginLeft: 4 }}>
                            <button
                              type="button"
                              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 5, border: "none", background: "none", cursor: "pointer", fontFamily: "Courier New, monospace", fontSize: 15, color: "#94a3b8", letterSpacing: "1.2px" }}
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
