"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import axios from "axios";
import { useNotification } from "@/contexts/NotificationContext";
import type { CommentData } from "@/components/CommentCard";
import Modal from "@/components/Modal";
import NewCommentForm from "@/components/NewCommentForm";
import Loading from "@/components/Loading";
import collectionsData from "@/data/collections.json";
import { dateFormat } from "@/utils/iconFunction";

const { beliefs, states } = collectionsData as { beliefs: string[]; states: string[] };

interface SessionUser {
  name: string;
  email: string;
  username: string;
  moderator: boolean;
}

interface UserProfile {
  email: string;
  username: string;
  belief?: string;
  stateName?: string;
  createdAt?: string;
  booksCount: number;
  chaptersCount: number;
  commentsCount: number;
}

import { getTagMetaOrNeutral } from "@/lib/tag-meta";

type Tab = "overview" | "comments" | "favorites" | "config";
type TypeFilter = "Todos" | "Exegese" | "Devocional" | "Pessoal" | "Inspirado";

const TYPE_FILTERS: TypeFilter[] = ["Todos", "Exegese", "Devocional", "Pessoal", "Inspirado"];

const SPECIAL: Record<string, string> = { jó: "job" };

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatMemberSince(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function parseBookRef(ref: string): { abbrev: string; chapter: number; verse: number } | null {
  const tokens = ref.trim().split(" ");
  if (tokens.length < 2) return null;
  const chv = tokens[tokens.length - 1];
  const abbrevRaw = tokens.slice(0, -1).join("").toLowerCase();
  const abbrev = SPECIAL[abbrevRaw] ?? abbrevRaw;
  const [chStr, vStr] = chv.split(":");
  const chapter = parseInt(chStr, 10);
  const verse = parseInt(vStr, 10);
  if (!abbrev || isNaN(chapter) || isNaN(verse)) return null;
  return { abbrev, chapter, verse };
}

function getCommentType(tags: string[]) {
  return getTagMetaOrNeutral(tags);
}

/* ─────────────────── Shared search bar ─────────────────── */
function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div style={{ position: "relative", width: "100%", flexShrink: 0 }}>
      <div
        style={{
          background: "#fff",
          border: "0.667px solid #e2e8f0",
          borderRadius: 8,
          height: 40.833,
          display: "flex",
          alignItems: "center",
          paddingLeft: 36,
          paddingRight: 12,
          overflow: "hidden"
        }}
      >
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1,
            fontSize: 13,
            color: "#1e293b",
            background: "transparent",
            border: "none",
            outline: "none"
          }}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            style={{ color: "#94a3b8", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
      <svg
        width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
      >
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
    </div>
  );
}

/* ─────────────────── My-comment card (no author) ─────────────────── */
function ProfileCommentCard({
  comment,
  onEdit,
  onDelete,
}: {
  comment: CommentData;
  onEdit?: (c: CommentData) => void;
  onDelete?: (id: string) => void;
}) {
  const type = getCommentType(comment.tags);
  const nav  = parseBookRef(comment.bookReference ?? "");

  return (
    <div
      style={{
        background: "#fff",
        borderLeftWidth: 4,
        borderLeftStyle: "solid",
        borderLeftColor: type.color,
        borderTop: "0.667px solid #e2e8f0",
        borderRight: "0.667px solid #e2e8f0",
        borderBottom: "0.667px solid #e2e8f0",
        borderRadius: "0 10px 10px 0",
        boxShadow: "0px 1px 3px 0px rgba(0,0,0,0.05)",
        padding: "14px 18px 14px"
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ display: "inline-flex", alignItems: "center", background: type.bg, borderRadius: 10, padding: "2px 8px", height: 20.5, flexShrink: 0 }}>
          <span style={{ fontWeight: 600, fontSize: 11, color: type.color, lineHeight: "16.5px", whiteSpace: "nowrap" }}>
            {type.label}
          </span>
        </span>
        {comment.bookReference && (
          <span style={{ display: "inline-flex", alignItems: "center", background: "rgba(19,125,219,0.06)", borderRadius: 4, padding: "1px 7px", height: 20, flexShrink: 0 }}>
            <span style={{ fontWeight: 700, fontSize: 12, color: "#137ddb", lineHeight: "18px", whiteSpace: "nowrap" }}>
              {comment.bookReference}
            </span>
          </span>
        )}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>
          {dateFormat(comment.createdAt)}
        </span>
        {(onEdit || onDelete) && (
          <div style={{ display: "flex", gap: 6, marginLeft: 8 }}>
            {onEdit && (
              <button type="button" onClick={() => onEdit(comment)} style={{ fontSize: 11, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", padding: "2px 4px", borderRadius: 4 }}>
                Editar
              </button>
            )}
            {onDelete && (
              <button type="button" onClick={() => onDelete(comment._id)} style={{ fontSize: 11, color: "#f87171", background: "none", border: "none", cursor: "pointer", padding: "2px 4px", borderRadius: 4 }}>
                Excluir
              </button>
            )}
          </div>
        )}
      </div>

      {/* Text */}
      <p style={{ fontSize: 13, color: "#374151", lineHeight: "22.75px", margin: "0 0 10px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {comment.text}
      </p>

      {/* Context link */}
      {nav && (
        <Link href={`/verses/${nav.abbrev}/${nav.chapter}#${nav.verse}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 600, fontSize: 11, color: "#137ddb", textDecoration: "none" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          Ver no contexto ({comment.bookReference})
        </Link>
      )}
    </div>
  );
}

/* ─────────────────── Favorite card (shows author) ─────────────────── */
function FavoriteCard({ comment }: { comment: CommentData }) {
  const type     = getCommentType(comment.tags);
  const nav      = parseBookRef(comment.bookReference ?? "");
  const initials = getInitials(comment.username || "?");

  return (
    <div
      style={{
        background: "#fff",
        borderLeftWidth: 4,
        borderLeftStyle: "solid",
        borderLeftColor: type.color,
        borderTop: "0.667px solid #e2e8f0",
        borderRight: "0.667px solid #e2e8f0",
        borderBottom: "0.667px solid #e2e8f0",
        borderRadius: "0 10px 10px 0",
        boxShadow: "0px 1px 3px 0px rgba(0,0,0,0.05)",
        padding: "14px 18px 14px"
      }}
    >
      {/* Header — avatar + username + type badge + verse + date */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        {/* Author avatar */}
        <div style={{ width: 26, height: 26, borderRadius: 13, background: "rgba(19,125,219,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 10, color: "#137ddb", lineHeight: "15px" }}>
            {initials}
          </span>
        </div>
        {/* Username */}
        <span style={{ fontWeight: 600, fontSize: 13, color: "#1e293b", whiteSpace: "nowrap", flexShrink: 0 }}>
          {comment.username}
        </span>
        {/* Type badge */}
        <span style={{ display: "inline-flex", alignItems: "center", background: type.bg, borderRadius: 10, padding: "2px 8px", height: 20.5, flexShrink: 0 }}>
          <span style={{ fontWeight: 600, fontSize: 11, color: type.color, lineHeight: "16.5px", whiteSpace: "nowrap" }}>
            {type.label}
          </span>
        </span>
        {/* Verse */}
        {comment.bookReference && (
          <span style={{ fontWeight: 700, fontSize: 11, color: "#137ddb", whiteSpace: "nowrap", flexShrink: 0 }}>
            {comment.bookReference}
          </span>
        )}
        {/* Date */}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>
          {dateFormat(comment.createdAt)}
        </span>
      </div>

      {/* Text */}
      <p style={{ fontSize: 13, color: "#374151", lineHeight: "22.75px", margin: "0 0 10px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {comment.text}
      </p>

      {/* Context link */}
      {nav && (
        <Link href={`/verses/${nav.abbrev}/${nav.chapter}#${nav.verse}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 600, fontSize: 11, color: "#137ddb", textDecoration: "none" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          Ver no contexto ({comment.bookReference})
        </Link>
      )}
    </div>
  );
}

/* ─────────────────── Privacy toggle switch ─────────────────── */
function PrivacyToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        flexShrink: 0,
        width: 36,
        height: 20,
        borderRadius: 10,
        background: checked ? "#137ddb" : "#cbd5e0",
        border: "none",
        cursor: "pointer",
        position: "relative",
        transition: "background 0.2s",
        padding: 0,
        marginTop: 1
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 17 : 3,
          width: 14,
          height: 14,
          borderRadius: 7,
          background: "#fff",
          boxShadow: "0px 1px 3px 0px rgba(0,0,0,0.2)",
          transition: "left 0.2s"
        }}
      />
    </button>
  );
}

/* ─────────────────── Stat card (overview) ─────────────────── */
function StatCard({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ background: "#fff", border: "0.667px solid #e2e8f0", borderRadius: 12, padding: "20px 24px", flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>
        {value.toLocaleString("pt-BR")}
      </div>
      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, marginBottom: max > 0 ? 12 : 0 }}>
        {label}
        {max > 0 && <span style={{ color: "#cbd5e0" }}> de {max.toLocaleString("pt-BR")}</span>}
      </div>
      {max > 0 && (
        <div style={{ height: 4, background: "#f1f5f9", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.6s ease" }} />
        </div>
      )}
    </div>
  );
}

/* ─────────────────── Sidebar nav items ─────────────────── */
const NAV_ITEMS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: "overview",
    label: "Visão Geral",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    id: "comments",
    label: "Meus Comentários",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: "favorites",
    label: "Favoritos",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    id: "config",
    label: "Configurações",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

/* ──────────────────────── Main component ──────────────────────── */
export default function ProfileClient({ user }: { user: SessionUser }) {
  const { handleNotification } = useNotification();
  const [tab, setTab]               = useState<Tab>("overview");
  const [profile, setProfile]       = useState<UserProfile | null>(null);
  const [comments, setComments]     = useState<CommentData[]>([]);
  const [favorites, setFavorites]   = useState<CommentData[]>([]);
  const [loading, setLoading]       = useState(false);
  const [belief, setBelief]           = useState("");
  const [stateName, setStateName]     = useState("");
  const [showReligion, setShowReligion]       = useState(true);
  const [showHistory, setShowHistory]         = useState(true);
  const [editingComment, setEditingComment] = useState<CommentData | null>(null);
  const [commentSearch, setCommentSearch]   = useState("");
  const [favSearch, setFavSearch]           = useState("");
  const [favTypeFilter, setFavTypeFilter]   = useState<TypeFilter>("Todos");

  const initials = getInitials(user.name || user.username);

  /* ── Data loaders ── */
  const loadProfile = useCallback(async () => {
    try {
      const { data } = await axios.get<UserProfile>("/api/users/me");
      setProfile(data);
      setBelief(data.belief ?? "");
      setStateName(data.stateName ?? "");
    } catch {
      handleNotification("error", "Erro ao carregar perfil.");
    }
  }, [handleNotification]);

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await axios.get<{ comments: CommentData[] } | CommentData[]>("/api/users/comments?pages=1");
      const data = Array.isArray(res.data) ? res.data : (res.data as { comments: CommentData[] }).comments;
      setComments(data);
    } catch {
      handleNotification("error", "Erro ao carregar comentários.");
    } finally {
      setLoading(false);
    }
  }, [handleNotification]);

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await axios.get<{ favorites: CommentData[] } | CommentData[]>("/api/users/favorites?pages=1");
      const data = Array.isArray(res.data) ? res.data : (res.data as { favorites: CommentData[] }).favorites;
      setFavorites(data);
    } catch {
      handleNotification("error", "Erro ao carregar favoritos.");
    } finally {
      setLoading(false);
    }
  }, [handleNotification]);

  useEffect(() => { loadProfile(); loadComments(); }, [loadProfile, loadComments]);
  useEffect(() => { if (tab === "favorites" && favorites.length === 0) loadFavorites(); }, [tab, favorites.length, loadFavorites]);

  /* ── Handlers ── */
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Excluir este comentário?")) return;
    try {
      await axios.delete(`/api/comments/${id}`);
      setComments(prev => prev.filter(c => c._id !== id));
      handleNotification("success", "Comentário excluído.");
    } catch {
      handleNotification("error", "Erro ao excluir.");
    }
  }, [handleNotification]);

  const handleUpdateAccount = useCallback(async () => {
    try {
      await axios.patch("/api/users", { belief, state: stateName });
      handleNotification("success", "Conta atualizada!");
    } catch {
      handleNotification("error", "Erro ao atualizar.");
    }
  }, [belief, stateName, handleNotification]);

  const handleDeleteAccount = useCallback(async () => {
    if (!confirm("Tem certeza que quer excluir sua conta? Esta ação é irreversível.")) return;
    try {
      await axios.delete("/api/users", { data: { email: user.email } });
      handleNotification("success", "Conta excluída.");
      await signOut({ callbackUrl: "/login" });
    } catch {
      handleNotification("error", "Erro ao excluir conta.");
    }
  }, [handleNotification, user.email]);

  /* ── Derived data ── */
  const filteredComments = useMemo(() => {
    if (!commentSearch) return comments;
    const q = commentSearch.toLowerCase();
    return comments.filter(c =>
      c.text.toLowerCase().includes(q) || (c.bookReference ?? "").toLowerCase().includes(q)
    );
  }, [comments, commentSearch]);

  const filteredFavorites = useMemo(() => {
    let list = favorites;
    if (favTypeFilter !== "Todos") {
      list = list.filter(c => getCommentType(c.tags).label === favTypeFilter);
    }
    if (favSearch) {
      const q = favSearch.toLowerCase();
      list = list.filter(c =>
        c.text.toLowerCase().includes(q) ||
        (c.bookReference ?? "").toLowerCase().includes(q) ||
        (c.username ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [favorites, favTypeFilter, favSearch]);

  /** Unique authors from favorites, sorted by how many favorited comments they have */
  const favoriteAuthors = useMemo(() => {
    const counts: Record<string, number> = {};
    favorites.forEach(c => { if (c.username) counts[c.username] = (counts[c.username] ?? 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([username, count]) => ({ username, count }));
  }, [favorites]);

  /* ── Render ── */
  return (
    <div style={{ minHeight: "100vh", background: "#f9f9f7" }}>

      {/* ── Header ── */}
      <header style={{ position: "sticky", top: 0, zIndex: 20, background: "#fff", borderBottom: "0.667px solid #e2e8f0", height: 60, display: "flex", alignItems: "center", padding: "0 24px", gap: 12 }}>
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 8px", borderRadius: 6, color: "#64748b", fontSize: 13, fontWeight: 500, textDecoration: "none" }}
          onMouseEnter={e => (e.currentTarget.style.background = "#f1f5f9")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Voltar à leitura
        </Link>
        <div style={{ width: 1, height: 18, background: "#e2e8f0", margin: "0 4px" }} />
        <span style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>BibleComment</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => signOut({ callbackUrl: "/login" })} style={{ fontSize: 13, color: "#94a3b8", background: "none", border: "none", cursor: "pointer" }}>
          Sair
        </button>
      </header>

      {/* ── Body ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 64px", display: "flex", gap: 24, alignItems: "flex-start" }}>

        {/* Sidebar */}
        <aside style={{ width: 240, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {/* User card */}
          <div style={{ background: "#fff", border: "0.667px solid #e2e8f0", borderRadius: 12, padding: "24px 20px 20px" }}>
            <div style={{ width: 68, height: 68, borderRadius: 34, background: "rgba(19,125,219,0.13)", border: "2.667px solid rgba(19,125,219,0.19)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
              <span style={{ fontWeight: 800, fontSize: 22, color: "#137ddb", lineHeight: 1 }}>{initials}</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#1e293b", lineHeight: "24px", marginBottom: 2 }}>{user.name}</div>
            <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: "18px", marginBottom: 12 }}>@{user.username}</div>
            {profile?.belief && (
              <div style={{ display: "inline-flex", alignItems: "center", background: "rgba(19,125,219,0.07)", borderRadius: 12, padding: "3px 9px", marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 11, color: "#137ddb", lineHeight: "16.5px", whiteSpace: "nowrap" }}>{profile.belief}</span>
              </div>
            )}
            {profile?.createdAt && (
              <div style={{ fontSize: 11, color: "#cbd5e0", lineHeight: "16.5px" }}>
                Membro desde {formatMemberSince(profile.createdAt)}
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav style={{ background: "#fff", border: "0.667px solid #e2e8f0", borderRadius: 12, padding: "6.667px 8.667px", display: "flex", flexDirection: "column", gap: 2 }}>
            {NAV_ITEMS.map(({ id, label, icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  style={{ display: "flex", alignItems: "center", gap: 10, height: 37.5, paddingLeft: 12, borderRadius: 7, background: active ? "rgba(19,125,219,0.06)" : "transparent", border: "none", cursor: "pointer", width: "100%", textAlign: "left", color: active ? "#137ddb" : "#64748b" }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#f8fafc"; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = active ? "rgba(19,125,219,0.06)" : "transparent"; }}
                >
                  <span style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>{icon}</span>
                  <span style={{ fontWeight: active ? 600 : 400, fontSize: 13, lineHeight: "19.5px", whiteSpace: "nowrap" }}>{label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ── Main content ── */}
        <main style={{ flex: 1, minWidth: 0 }}>

          {/* OVERVIEW */}
          {tab === "overview" && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontWeight: 700, fontSize: 20, color: "#1e293b", margin: "0 0 4px" }}>
                  Olá, {user.name.split(" ")[0]} 👋
                </h2>
                <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
                  Aqui está um resumo da sua atividade no BibleComment.
                </p>
              </div>
              {profile ? (
                <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
                  <StatCard label="Comentários" value={profile.commentsCount} max={0} color="#137ddb" />
                  <StatCard label="Livros comentados" value={profile.booksCount} max={66} color="#7c3aed" />
                  <StatCard label="Capítulos comentados" value={profile.chaptersCount} max={1189} color="#059669" />
                </div>
              ) : (
                <Loading />
              )}
              {comments.length > 0 && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <h3 style={{ fontWeight: 600, fontSize: 12, color: "#94a3b8", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Comentários recentes
                    </h3>
                    <button type="button" onClick={() => setTab("comments")} style={{ fontSize: 12, color: "#137ddb", background: "none", border: "none", cursor: "pointer" }}>
                      Ver todos
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {comments.slice(0, 3).map(c => <ProfileCommentCard key={c._id} comment={c} />)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* COMMENTS */}
          {tab === "comments" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <h2 style={{ fontWeight: 700, fontSize: 20, color: "#1e293b", margin: 0 }}>
                Meus Comentários
              </h2>
              <SearchBar value={commentSearch} onChange={setCommentSearch} placeholder="Buscar nos meus comentários…" />
              {loading && comments.length === 0 ? (
                <Loading />
              ) : filteredComments.length === 0 ? (
                <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 0", fontSize: 14 }}>
                  {commentSearch ? `Nenhum resultado para "${commentSearch}".` : "Nenhum comentário ainda."}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {filteredComments.map(c => (
                    <ProfileCommentCard key={c._id} comment={c} onEdit={setEditingComment} onDelete={handleDelete} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* FAVORITES */}
          {tab === "favorites" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <h2 style={{ fontWeight: 700, fontSize: 20, color: "#1e293b", margin: 0 }}>
                Favoritos
              </h2>

              {/* Search bar */}
              <SearchBar value={favSearch} onChange={setFavSearch} placeholder="Buscar nos favoritos…" />

              {/* Type filter pills */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {TYPE_FILTERS.map(f => {
                  const active = favTypeFilter === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFavTypeFilter(f)}
                      style={{
                        height: 28,
                        padding: "0 14px",
                        borderRadius: 20,
                        border: "none",
                        cursor: "pointer",
                        background: active ? "#137ddb" : "#f1f5f9",
                        color: active ? "#fff" : "#64748b",
                        fontWeight: active ? 600 : 400,
                        fontSize: 12,
                        lineHeight: "18px",
                        transition: "background 0.15s"
                      }}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>

              {/* Autores Favoritos card */}
              {favoriteAuthors.length > 0 && (
                <div style={{ background: "#fff", border: "0.667px solid #e2e8f0", borderRadius: 12, padding: "16px 20px 16px" }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#1e293b", marginBottom: 12 }}>
                    Autores Favoritos
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {favoriteAuthors.map(({ username, count }) => {
                      const ini = getInitials(username);
                      return (
                        <div
                          key={username}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            background: "#f8fafc",
                            border: "0.667px solid #e2e8f0",
                            borderRadius: 8,
                            padding: "6px 12px 6px 12px",
                            height: 46.333
                          }}
                        >
                          {/* Avatar */}
                          <div style={{ width: 28, height: 28, borderRadius: 14, background: "rgba(19,125,219,0.09)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span style={{ fontWeight: 700, fontSize: 11, color: "#137ddb", lineHeight: "16.5px" }}>{ini}</span>
                          </div>
                          {/* Username + like count */}
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontWeight: 600, fontSize: 12, color: "#1e293b", whiteSpace: "nowrap" }}>@{username}</span>
                            <span style={{ fontSize: 10, color: "#94a3b8" }}>{count} curtido{count !== 1 ? "s" : ""}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Favorite comment cards */}
              {loading && favorites.length === 0 ? (
                <Loading />
              ) : filteredFavorites.length === 0 ? (
                <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 0", fontSize: 14 }}>
                  {favSearch || favTypeFilter !== "Todos"
                    ? "Nenhum favorito encontrado com esses filtros."
                    : "Nenhum favorito ainda."}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {filteredFavorites.map(c => <FavoriteCard key={c._id} comment={c} />)}
                </div>
              )}
            </div>
          )}

          {/* CONFIG */}
          {tab === "config" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Title */}
              <h2 style={{ fontWeight: 700, fontSize: 20, color: "#1e293b", margin: 0 }}>
                Configurações &amp; Privacidade
              </h2>

              {/* ── Card 1: Informações da Conta ── */}
              <div style={{ background: "#fff", border: "0.667px solid #e2e8f0", borderRadius: 12, padding: "20px 24px 24px" }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b", marginBottom: 20 }}>
                  Informações da Conta
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
                  <label style={{ fontWeight: 600, fontSize: 13, color: "#1e293b" }}>
                    Crença / Denominação
                  </label>
                  <select
                    value={belief}
                    onChange={e => setBelief(e.target.value)}
                    style={{
                      width: "100%",
                      height: 38.833,
                      border: "0.667px solid #e2e8f0",
                      borderRadius: 8,
                      padding: "0 12px",
                      fontSize: 13,
                      outline: "none",
                      color: "#1e293b",
                      background: "#fff",
                      cursor: "pointer"
                    }}
                  >
                    {beliefs.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <button
                  onClick={handleUpdateAccount}
                  style={{
                    height: 35.5,
                    padding: "0 20px",
                    background: "#137ddb",
                    color: "#fff",
                    border: "none",
                    borderRadius: 7,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap"
                  }}
                >
                  Salvar alterações
                </button>
              </div>

              {/* ── Card 2: Privacidade ── */}
              <div style={{ background: "#fff", border: "0.667px solid #e2e8f0", borderRadius: 12, padding: "20px 24px" }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b", marginBottom: 16 }}>
                  Privacidade
                </div>

                {/* Toggle 1 */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14, paddingBottom: 16 }}>
                  <PrivacyToggle checked={showReligion} onChange={setShowReligion} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "#1e293b", lineHeight: "19.5px" }}>
                      Mostrar minha religião no perfil público
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: "18px", marginTop: 2 }}>
                      Outros usuários poderão ver sua denominação na sua página de perfil.
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: "#f7fafc", margin: "0 0 16px" }} />

                {/* Toggle 2 */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <PrivacyToggle checked={showHistory} onChange={setShowHistory} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "#1e293b", lineHeight: "19.5px" }}>
                      Permitir que outros vejam meu histórico de comentários
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: "18px", marginTop: 2 }}>
                      Se desativado, seus comentários ficam anônimos para outros leitores.
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Card 3: Zona de Perigo ── */}
              <div style={{ background: "#fff", border: "0.667px solid #fed7d7", borderRadius: 12, padding: "20px 24px 24px" }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#c53030", marginBottom: 12 }}>
                  Zona de Perigo
                </div>
                <p style={{ fontSize: 13, color: "#718096", lineHeight: "19.5px", margin: "0 0 20px" }}>
                  A exclusão da conta é permanente e irrecuperável.
                  {comments.length > 0 && ` Todos os seus ${comments.length} comentário${comments.length !== 1 ? "s" : ""} serão deletados.`}
                </p>
                <button
                  onClick={handleDeleteAccount}
                  style={{
                    height: 36.167,
                    padding: "0 20px",
                    background: "none",
                    color: "#e53e3e",
                    border: "1.333px solid #e53e3e",
                    borderRadius: 7,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap"
                  }}
                >
                  Excluir minha conta
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Edit comment modal */}
      {editingComment && (
        <Modal show={!!editingComment} onClose={() => setEditingComment(null)}>
          <NewCommentForm
            post={false}
            title="Editar comentário"
            onClose={() => setEditingComment(null)}
            onSaved={updated => {
              setComments(prev => prev.map(c => c._id === updated._id ? updated : c));
              setEditingComment(null);
            }}
            commentId={editingComment._id}
            initialText={editingComment.text}
          />
        </Modal>
      )}
    </div>
  );
}
