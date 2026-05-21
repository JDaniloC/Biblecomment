"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useNotification } from "@/contexts/NotificationContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { commentsService } from "@/services/comments";
import { usersService } from "@/services/users";
import type { CommentData } from "@/lib/comment-data";
import Modal from "@/components/Modal";
import NewCommentForm from "@/components/NewCommentForm";
import Loading from "@/components/Loading";
import collectionsData from "@/data/collections.json";
import { dateFormat } from "@/utils/iconFunction";
import { useTutorial } from "@/lib/use-tutorial";
import { CHAPTER_TUTORIAL_NAME } from "@/lib/tutorial-config";
import { BadgesTab } from "./_components/BadgesTab";
import { ReadingReminderCard } from "./_components/ReadingReminderCard";
import { Toggle } from "./_components/Toggle";

const { beliefs, states } = collectionsData as {
	beliefs: string[];
	states: string[];
};

interface SessionUser {
	name: string;
	email: string;
	username: string;
	moderator: boolean;
}

interface UserProfile {
	email: string;
	username: string;
	displayName?: string;
	belief?: string;
	showBelief?: boolean;
	stateName?: string;
	createdAt?: string;
	booksCount: number;
	chaptersCount: number;
	commentsCount: number;
	followersCount?: number;
	followingCount?: number;
}

import { getTagMetaOrNeutral, getTagMetas } from "@/lib/tag-meta";
import { TagBadges } from "@/components/TagBadges";
import { parseBookRef } from "@/lib/parse-book-ref";
import { AppHeader } from "@/components/AppHeader";

type Tab = "overview" | "comments" | "favorites" | "badges" | "config";
type TypeFilter = "Todos" | "Exegese" | "Devocional" | "Pessoal" | "Inspirado";

const TYPE_FILTERS: TypeFilter[] = [
	"Todos",
	"Exegese",
	"Devocional",
	"Pessoal",
	"Inspirado",
];

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
		<div className="relative w-full flex-shrink-0">
			<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg h-[40.833px] flex items-center pl-9 pr-3 overflow-hidden">
				<input
					type="text"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
					className="flex-1 text-[13px] text-slate-800 dark:text-slate-100 bg-transparent border-none outline-none"
				/>
				{value && (
					<button
						type="button"
						onClick={() => onChange("")}
						className="text-slate-400 dark:text-slate-500 bg-transparent border-none cursor-pointer flex items-center"
					>
						<svg
							width="12"
							height="12"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
					</button>
				)}
			</div>
			<svg
				width="14"
				height="14"
				viewBox="0 0 24 24"
				fill="none"
				stroke="#94a3b8"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
			>
				<circle cx="11" cy="11" r="8" />
				<path d="m21 21-4.35-4.35" />
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
	const nav = parseBookRef(comment.bookReference ?? "");

	return (
		<div
			className="bg-white dark:bg-slate-900 border-l-4 border-y border-r border-slate-200 dark:border-slate-700 rounded-r-[10px] shadow-sm py-3.5 px-[18px]"
			style={{ borderLeftColor: type.color }}
		>
			{/* Header */}
			<div className="flex items-center gap-2 mb-2.5">
				<TagBadges tags={comment.tags} className="shrink-0" />
				{comment.bookReference && (
					<span className="inline-flex items-center bg-brand-wash rounded px-[7px] h-5 shrink-0">
						<span className="font-bold text-xs text-brand leading-[18px] whitespace-nowrap">
							{comment.bookReference}
						</span>
					</span>
				)}
				<span className="ml-auto text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
					{dateFormat(comment.createdAt)}
				</span>
				{(onEdit || onDelete) && (
					<div className="flex gap-1.5 ml-2">
						{onEdit && (
							<button
								type="button"
								onClick={() => onEdit(comment)}
								className="text-[11px] text-slate-400 dark:text-slate-500 bg-transparent border-none cursor-pointer px-1 py-0.5 rounded hover:text-slate-600 dark:hover:text-slate-300 transition"
							>
								Editar
							</button>
						)}
						{onDelete && (
							<button
								type="button"
								onClick={() => onDelete(comment._id)}
								className="text-[11px] text-red-400 dark:text-red-500 bg-transparent border-none cursor-pointer px-1 py-0.5 rounded hover:text-red-600 dark:hover:text-red-400 transition"
							>
								Excluir
							</button>
						)}
					</div>
				)}
			</div>

			{/* Text */}
			<p className="text-[13px] text-gray-700 dark:text-gray-300 leading-[22.75px] m-0 mb-2.5 line-clamp-2">
				{comment.text}
			</p>

			{/* Context link */}
			{nav && (
				<Link
					href={`/verses/${nav.abbrev}/${nav.chapter}#${nav.verse}`}
					className="inline-flex items-center gap-1.5 font-semibold text-[11px] text-brand no-underline hover:underline"
				>
					<svg
						width="11"
						height="11"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
						<polyline points="15 3 21 3 21 9" />
						<line x1="10" y1="14" x2="21" y2="3" />
					</svg>
					Ver no contexto ({comment.bookReference})
				</Link>
			)}
		</div>
	);
}

/* ─────────────────── Favorite card (shows author) ─────────────────── */
function FavoriteCard({ comment }: { comment: CommentData }) {
	const type = getCommentType(comment.tags);
	const nav = parseBookRef(comment.bookReference ?? "");
	const initials = getInitials(comment.username || "?");

	return (
		<div
			className="bg-white dark:bg-slate-900 border-l-4 border-y border-r border-slate-200 dark:border-slate-700 rounded-r-[10px] shadow-sm py-3.5 px-[18px]"
			style={{ borderLeftColor: type.color }}
		>
			{/* Header — avatar + username + type badge + verse + date */}
			<div className="flex items-center gap-2 mb-2.5">
				{/* Author avatar */}
				<div className="w-[26px] h-[26px] rounded-[13px] bg-brand-light flex items-center justify-center shrink-0">
					<span className="font-bold text-[10px] text-brand leading-[15px]">
						{initials}
					</span>
				</div>
				{/* Username */}
				<span className="font-semibold text-[13px] text-slate-800 dark:text-slate-100 whitespace-nowrap shrink-0">
					{comment.username}
				</span>
				{/* Type badge */}
				<TagBadges tags={comment.tags} className="shrink-0" />
				{/* Verse */}
				{comment.bookReference && (
					<span className="font-bold text-[11px] text-brand whitespace-nowrap shrink-0">
						{comment.bookReference}
					</span>
				)}
				{/* Date */}
				<span className="ml-auto text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
					{dateFormat(comment.createdAt)}
				</span>
			</div>

			{/* Text */}
			<p className="text-[13px] text-gray-700 dark:text-gray-300 leading-[22.75px] m-0 mb-2.5 line-clamp-2">
				{comment.text}
			</p>

			{/* Context link */}
			{nav && (
				<Link
					href={`/verses/${nav.abbrev}/${nav.chapter}#${nav.verse}`}
					className="inline-flex items-center gap-1.5 font-semibold text-[11px] text-brand no-underline hover:underline"
				>
					<svg
						width="11"
						height="11"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
						<polyline points="15 3 21 3 21 9" />
						<line x1="10" y1="14" x2="21" y2="3" />
					</svg>
					Ver no contexto ({comment.bookReference})
				</Link>
			)}
		</div>
	);
}

/* ─────────────────── Change-password card ─────────────────── */
function ChangePasswordCard() {
	const { handleNotification } = useNotification();
	const [current, setCurrent] = useState("");
	const [next, setNext] = useState("");
	const [confirm, setConfirm] = useState("");
	const [submitting, setSubmitting] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (next.length < 6) {
			handleNotification(
				"error",
				"A nova senha deve ter ao menos 6 caracteres.",
			);
			return;
		}
		if (next !== confirm) {
			handleNotification("error", "A confirmação não bate com a nova senha.");
			return;
		}
		if (next === current) {
			handleNotification("error", "A nova senha deve ser diferente da atual.");
			return;
		}
		setSubmitting(true);
		try {
			await usersService.changePassword(current, next);
			handleNotification("success", "Senha atualizada.");
			setCurrent("");
			setNext("");
			setConfirm("");
		} catch (err: unknown) {
			const status = (err as { response?: { status?: number } })?.response
				?.status;
			if (status === 403) handleNotification("error", "Senha atual incorreta.");
			else if (status === 400)
				handleNotification(
					"error",
					"Senha inválida (mínimo 6 caracteres, deve diferir da atual).",
				);
			else handleNotification("error", "Erro ao atualizar senha.");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-6 pt-5 pb-6"
		>
			<div className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-4">
				Trocar senha
			</div>
			<div className="flex flex-col gap-3">
				<div className="flex flex-col gap-1.5">
					<label className="font-semibold text-[13px] text-slate-800 dark:text-slate-100">
						Senha atual
					</label>
					<input
						type="password"
						autoComplete="current-password"
						value={current}
						onChange={(e) => setCurrent(e.target.value)}
						className="w-full h-[38.833px] border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg px-3 text-[13px] outline-none focus:border-brand"
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<label className="font-semibold text-[13px] text-slate-800 dark:text-slate-100">
						Nova senha
					</label>
					<input
						type="password"
						autoComplete="new-password"
						value={next}
						onChange={(e) => setNext(e.target.value)}
						minLength={6}
						className="w-full h-[38.833px] border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg px-3 text-[13px] outline-none focus:border-brand"
					/>
					<p className="text-[11px] text-slate-400 dark:text-slate-500">
						Mínimo 6 caracteres.
					</p>
				</div>
				<div className="flex flex-col gap-1.5">
					<label className="font-semibold text-[13px] text-slate-800 dark:text-slate-100">
						Confirmar nova senha
					</label>
					<input
						type="password"
						autoComplete="new-password"
						value={confirm}
						onChange={(e) => setConfirm(e.target.value)}
						className="w-full h-[38.833px] border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg px-3 text-[13px] outline-none focus:border-brand"
					/>
				</div>
			</div>
			<button
				type="submit"
				disabled={submitting || !current || !next || !confirm}
				className="mt-5 h-[35.5px] px-5 bg-brand text-white rounded-[7px] text-[13px] font-semibold whitespace-nowrap cursor-pointer hover:opacity-90 transition disabled:opacity-50"
			>
				{submitting ? "Atualizando…" : "Atualizar senha"}
			</button>
		</form>
	);
}

/* ─────────────────── Tutorial reset (config tab) ─────────────────── */
function IdentityCard({
	initialDisplayName,
	initialUsername,
	onUpdated,
}: {
	initialDisplayName: string;
	initialUsername: string;
	onUpdated: (next: { displayName?: string; username?: string }) => void;
}) {
	const { handleNotification } = useNotification();
	const { update: updateSession } = useSession();
	const [displayName, setDisplayName] = useState(initialDisplayName);
	const [username, setUsername] = useState(initialUsername);
	const [savingName, setSavingName] = useState(false);
	const [savingSlug, setSavingSlug] = useState(false);

	const slugIsValid = /^[a-z0-9_-]{2,40}$/.test(username);
	const slugChanged = username !== initialUsername;
	const nameChanged = displayName.trim() !== initialDisplayName.trim();
	const nameValid =
		displayName.trim().length >= 1 && displayName.trim().length <= 80;

	async function saveName() {
		if (!nameChanged || !nameValid) return;
		setSavingName(true);
		try {
			const trimmed = displayName.trim();
			await usersService.updateProfile({ displayName: trimmed });
			// Refresh the JWT in place so AuthMenu/profile header pick up the
			// new name without a re-login.
			await updateSession({ displayName: trimmed, name: trimmed });
			onUpdated({ displayName: trimmed });
			handleNotification("success", "Nome atualizado.");
		} catch {
			handleNotification("error", "Erro ao atualizar nome.");
		} finally {
			setSavingName(false);
		}
	}

	async function saveSlug() {
		if (!slugChanged || !slugIsValid) return;
		setSavingSlug(true);
		try {
			const result = await usersService.updateUsername(username);
			// Update the JWT so subsequent writes (createCommentAction, etc.)
			// attribute records to the new slug instead of the now-defunct one.
			await updateSession({ username: result.username });
			onUpdated({ username: result.username });
			handleNotification("success", "Identificador atualizado.");
		} catch (err) {
			const msg = (err as Error)?.message ?? "Erro ao atualizar identificador.";
			if (msg === "Username already taken") {
				handleNotification("error", "Esse identificador já está em uso.");
			} else if (msg === "Invalid username format") {
				handleNotification("error", "Formato inválido.");
			} else {
				handleNotification("error", "Erro ao atualizar identificador.");
			}
		} finally {
			setSavingSlug(false);
		}
	}

	return (
		<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-6 pt-5 pb-6">
			<div className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-2">
				Identidade
			</div>
			<p className="text-[13px] text-slate-500 dark:text-slate-400 leading-[19.5px] mb-5 mt-0">
				Seu nome aparece nos comentários. O identificador único é usado em URLs
				e para login — só letras minúsculas, números, hífen ou sublinhado.
			</p>

			<div className="flex flex-col gap-1.5 mb-4">
				<label
					htmlFor="profile-displayname"
					className="font-semibold text-[13px] text-slate-800 dark:text-slate-100"
				>
					Nome
				</label>
				<div className="flex gap-2">
					<input
						id="profile-displayname"
						type="text"
						value={displayName}
						onChange={(e) => setDisplayName(e.target.value)}
						maxLength={80}
						className="flex-1 h-[38.833px] border border-slate-200 dark:border-slate-700 rounded-lg px-3 text-[13px] text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 outline-none"
					/>
					<button
						type="button"
						onClick={saveName}
						disabled={!nameChanged || !nameValid || savingName}
						className="h-[38.833px] px-4 bg-brand text-white rounded-[7px] text-[13px] font-semibold whitespace-nowrap cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
					>
						{savingName ? "…" : "Salvar"}
					</button>
				</div>
			</div>

			<div className="flex flex-col gap-1.5">
				<label
					htmlFor="profile-username"
					className="font-semibold text-[13px] text-slate-800 dark:text-slate-100"
				>
					Identificador único (@)
				</label>
				<div className="flex gap-2">
					<div className="flex-1 flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
						<span className="pl-3 pr-1 text-slate-400 dark:text-slate-500 text-[13px]">
							@
						</span>
						<input
							id="profile-username"
							type="text"
							value={username}
							onChange={(e) => setUsername(e.target.value.toLowerCase())}
							maxLength={40}
							className="flex-1 h-[38.833px] pr-3 text-[13px] text-slate-800 dark:text-slate-100 bg-transparent outline-none"
						/>
					</div>
					<button
						type="button"
						onClick={saveSlug}
						disabled={!slugChanged || !slugIsValid || savingSlug}
						className="h-[38.833px] px-4 bg-brand text-white rounded-[7px] text-[13px] font-semibold whitespace-nowrap cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
					>
						{savingSlug ? "…" : "Salvar"}
					</button>
				</div>
				{slugChanged && !slugIsValid && (
					<p className="text-xs text-red-500 dark:text-red-400 mt-1">
						Use 2–40 caracteres: letras minúsculas, números, hífen ou
						sublinhado.
					</p>
				)}
			</div>
		</div>
	);
}

function MyDataCard({
	onCommentsImported,
}: {
	onCommentsImported: () => void;
}) {
	const { handleNotification } = useNotification();
	const confirm = useConfirm();
	const fileRef = useRef<HTMLInputElement>(null);
	const [importing, setImporting] = useState(false);

	const onPick = () => fileRef.current?.click();

	const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (fileRef.current) fileRef.current.value = "";
		if (!file) return;

		const ok = await confirm({
			title: "Importar comentários do backup?",
			description:
				"Comentários idênticos aos seus já existentes serão ignorados. " +
				"Comentários cujo versículo não exista no banco atual serão pulados.",
			confirmLabel: "Importar",
		});
		if (!ok) return;

		setImporting(true);
		try {
			const text = await file.text();
			const payload = JSON.parse(text);
			const result = await usersService.importMyComments(payload);
			onCommentsImported();
			handleNotification(
				"success",
				`Importação concluída: ${result.imported} novos, ${result.skipped} já existiam, ${result.failed} ignorados.`,
			);
		} catch (err) {
			const status = (err as { response?: { status?: number } })?.response
				?.status;
			if (status === 400) {
				handleNotification(
					"error",
					"Arquivo inválido. Use um JSON exportado pelo próprio Bible Comment.",
				);
			} else {
				handleNotification("error", "Não foi possível importar o arquivo.");
			}
		} finally {
			setImporting(false);
		}
	};

	return (
		<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-6 pt-5 pb-6">
			<div className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-2">
				Meus dados
			</div>
			<p className="text-[13px] text-slate-500 dark:text-slate-400 leading-[19.5px] mb-4 mt-0">
				Baixe um arquivo JSON com tudo que armazenamos sobre você (perfil,
				comentários, discussões, respostas e notificações). Você pode também
				restaurar comentários a partir de um backup anterior.
			</p>
			<div className="flex flex-wrap gap-2">
				<a
					href="/api/users/me/export"
					className="inline-block h-[35.5px] px-5 leading-[35.5px] bg-transparent text-brand border-[1.333px] border-brand rounded-[7px] text-[13px] font-semibold whitespace-nowrap cursor-pointer hover:bg-brand-wash transition"
				>
					Exportar meus dados (JSON)
				</a>
				<button
					type="button"
					onClick={onPick}
					disabled={importing}
					className="h-[35.5px] px-5 bg-transparent text-brand border-[1.333px] border-brand rounded-[7px] text-[13px] font-semibold whitespace-nowrap cursor-pointer hover:bg-brand-wash transition disabled:opacity-50"
				>
					{importing ? "Importando…" : "Importar comentários (JSON)"}
				</button>
				<label htmlFor="profile-import-file" className="sr-only">
					Selecionar arquivo de backup JSON
				</label>
				<input
					id="profile-import-file"
					ref={fileRef}
					type="file"
					accept="application/json,.json"
					onChange={onFile}
					className="hidden"
				/>
			</div>
		</div>
	);
}

function TutorialResetCard() {
	const router = useRouter();
	const tutorial = useTutorial(CHAPTER_TUTORIAL_NAME);
	return (
		<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-6 pt-5 pb-6">
			<div className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-2">
				Tutorial guiado
			</div>
			<p className="text-[13px] text-slate-500 dark:text-slate-400 leading-[19.5px] mb-4 mt-0">
				Refaça o tour de boas-vindas para revisar como ler, comentar, abrir
				discussões e gerenciar sua conta.
			</p>
			<button
				type="button"
				onClick={() => {
					tutorial.reset();
					router.push("/chapter/jo/3?tour=1");
				}}
				className="h-[35.5px] px-5 bg-transparent text-brand border-[1.333px] border-brand rounded-[7px] text-[13px] font-semibold whitespace-nowrap cursor-pointer hover:bg-brand-wash transition"
			>
				Refazer tutorial
			</button>
		</div>
	);
}

/* ─────────────────── Stat card (overview) ─────────────────── */
function StatCard({
	label,
	value,
	max,
	color,
}: {
	label: string;
	value: number;
	max: number;
	color: string;
}) {
	const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
	return (
		<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 sm:px-6 py-4 sm:py-5 flex-1 min-w-0">
			<div
				className="text-[28px] font-extrabold leading-none"
				style={{ color }}
			>
				{value.toLocaleString("pt-BR")}
			</div>
			<div
				className={`text-xs text-slate-400 dark:text-slate-500 mt-1 ${max > 0 ? "mb-3" : ""}`}
			>
				{label}
				{max > 0 && (
					<span className="text-slate-300 dark:text-slate-600">
						{" "}
						de {max.toLocaleString("pt-BR")}
					</span>
				)}
			</div>
			{max > 0 && (
				<div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-sm overflow-hidden">
					<div
						className="h-full rounded-sm transition-[width] duration-500 ease-out"
						style={{ width: `${pct}%`, background: color }}
					/>
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
			<svg
				width="15"
				height="15"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<rect x="3" y="3" width="7" height="7" />
				<rect x="14" y="3" width="7" height="7" />
				<rect x="14" y="14" width="7" height="7" />
				<rect x="3" y="14" width="7" height="7" />
			</svg>
		),
	},
	{
		id: "comments",
		label: "Meus Comentários",
		icon: (
			<svg
				width="15"
				height="15"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
			</svg>
		),
	},
	{
		id: "favorites",
		label: "Favoritos",
		icon: (
			<svg
				width="15"
				height="15"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
			</svg>
		),
	},
	{
		id: "badges",
		label: "Conquistas",
		icon: (
			<svg
				width="15"
				height="15"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<circle cx="12" cy="8" r="6" />
				<polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
			</svg>
		),
	},
	{
		id: "config",
		label: "Configurações",
		icon: (
			<svg
				width="15"
				height="15"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<circle cx="12" cy="12" r="3" />
				<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
			</svg>
		),
	},
];

/* ──────────────────────── Main component ──────────────────────── */
export default function ProfileClient({ user }: { user: SessionUser }) {
	const { handleNotification } = useNotification();
	const confirm = useConfirm();
	const [tab, setTab] = useState<Tab>("overview");
	const [profile, setProfile] = useState<UserProfile | null>(null);
	const [comments, setComments] = useState<CommentData[]>([]);
	const [favorites, setFavorites] = useState<CommentData[]>([]);
	const [loading, setLoading] = useState(false);
	const [belief, setBelief] = useState("");
	const [stateName, setStateName] = useState("");
	// showReligion drives the public profile's belief visibility — opt-in,
	// default false. Loaded from /api/users/me and persisted on save below.
	const [showReligion, setShowReligion] = useState(false);
	const [showHistory, setShowHistory] = useState(true);
	const [editingComment, setEditingComment] = useState<CommentData | null>(
		null,
	);
	const [commentSearch, setCommentSearch] = useState("");
	const [favSearch, setFavSearch] = useState("");
	const [favTypeFilter, setFavTypeFilter] = useState<TypeFilter>("Todos");

	const initials = getInitials(user.name || user.username);

	/* ── Data loaders ── */
	const loadProfile = useCallback(async () => {
		try {
			const data = await usersService.getMe();
			setProfile(data);
			setBelief(data.belief ?? "");
			setStateName(data.stateName ?? "");
			setShowReligion(data.showBelief ?? false);
		} catch {
			handleNotification("error", "Erro ao carregar perfil.");
		}
	}, [handleNotification]);

	const loadComments = useCallback(async () => {
		setLoading(true);
		try {
			const data =
				(await usersService.listMyComments()) as unknown as CommentData[];
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
			const data =
				(await usersService.listMyFavorites()) as unknown as CommentData[];
			setFavorites(data);
		} catch {
			handleNotification("error", "Erro ao carregar favoritos.");
		} finally {
			setLoading(false);
		}
	}, [handleNotification]);

	useEffect(() => {
		loadProfile();
		loadComments();
	}, [loadProfile, loadComments]);
	useEffect(() => {
		if (tab === "favorites" && favorites.length === 0) loadFavorites();
	}, [tab, favorites.length, loadFavorites]);

	/* ── Handlers ── */
	const handleDelete = useCallback(
		async (id: string) => {
			const ok = await confirm({
				title: "Excluir este comentário?",
				description: "Esta ação não pode ser desfeita.",
				confirmLabel: "Excluir",
				variant: "danger",
			});
			if (!ok) return;
			try {
				await commentsService.delete(id);
				setComments((prev) => prev.filter((c) => c._id !== id));
				handleNotification("success", "Comentário excluído.");
			} catch {
				handleNotification("error", "Erro ao excluir.");
			}
		},
		[handleNotification, confirm],
	);

	const handleUpdateAccount = useCallback(async () => {
		try {
			await usersService.updateProfile({
				belief,
				state: stateName,
				showBelief: showReligion,
			});
			handleNotification("success", "Conta atualizada!");
		} catch {
			handleNotification("error", "Erro ao atualizar.");
		}
	}, [belief, stateName, showReligion, handleNotification]);

	const handleDeleteAccount = useCallback(async () => {
		const ok = await confirm({
			title: "Excluir sua conta?",
			description:
				"Esta ação é irreversível. Seus dados pessoais serão removidos e seus comentários ficarão anônimos.",
			confirmLabel: "Excluir conta",
			variant: "danger",
		});
		if (!ok) return;
		try {
			await usersService.deleteSelf(user.email);
			handleNotification("success", "Conta excluída.");
			await signOut({ callbackUrl: "/login" });
		} catch {
			handleNotification("error", "Erro ao excluir conta.");
		}
	}, [handleNotification, user.email, confirm]);

	/* ── Derived data ── */
	const filteredComments = useMemo(() => {
		if (!commentSearch) return comments;
		const q = commentSearch.toLowerCase();
		return comments.filter(
			(c) =>
				c.text.toLowerCase().includes(q) ||
				(c.bookReference ?? "").toLowerCase().includes(q),
		);
	}, [comments, commentSearch]);

	const filteredFavorites = useMemo(() => {
		let list = favorites;
		if (favTypeFilter !== "Todos") {
			// Match if ANY of the comment's categories equals the filter (a
			// multi-tag comment shows up under each of its categories).
			list = list.filter((c) =>
				getTagMetas(c.tags).some((m) => m.label === favTypeFilter),
			);
		}
		if (favSearch) {
			const q = favSearch.toLowerCase();
			list = list.filter(
				(c) =>
					c.text.toLowerCase().includes(q) ||
					(c.bookReference ?? "").toLowerCase().includes(q) ||
					(c.username ?? "").toLowerCase().includes(q),
			);
		}
		return list;
	}, [favorites, favTypeFilter, favSearch]);

	/** Unique authors from favorites, sorted by how many favorited comments they have */
	const favoriteAuthors = useMemo(() => {
		const counts: Record<string, number> = {};
		favorites.forEach((c) => {
			if (c.username) counts[c.username] = (counts[c.username] ?? 0) + 1;
		});
		return Object.entries(counts)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 6)
			.map(([username, count]) => ({ username, count }));
	}, [favorites]);

	/* ── Render ── */
	return (
		<div className="min-h-screen bg-[#f9f9f7] dark:bg-slate-950">
			<AppHeader user={user} />

			{/* ── Body ── */}
			<div className="max-w-[1100px] mx-auto pt-6 md:pt-8 px-4 md:px-6 pb-16 flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-start">
				{/* Sidebar */}
				<aside className="w-full md:w-60 flex-shrink-0 flex flex-col gap-2">
					{/* User card */}
					<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pt-6 px-5 pb-5">
						<div className="w-[68px] h-[68px] rounded-[34px] bg-brand/15 border-[2.667px] border-[rgba(19,125,219,0.19)] flex items-center justify-center mb-[18px]">
							<span className="font-extrabold text-[22px] text-brand leading-none">
								{initials}
							</span>
						</div>
						<div className="font-bold text-base text-slate-800 dark:text-slate-100 leading-6 mb-0.5">
							{profile?.displayName ?? user.name}
						</div>
						<div className="text-xs text-slate-400 dark:text-slate-500 leading-[18px] mb-3">
							@{profile?.username ?? user.username}
						</div>
						{profile?.belief && (
							<div className="inline-flex items-center bg-brand-tint rounded-xl px-2.5 py-0.5 mb-2">
								<span className="font-semibold text-[11px] text-brand leading-[16.5px] whitespace-nowrap">
									{profile.belief}
								</span>
							</div>
						)}
						{profile?.createdAt && (
							<div className="text-[11px] text-slate-300 dark:text-slate-600 leading-[16.5px]">
								Membro desde {formatMemberSince(profile.createdAt)}
							</div>
						)}
					</div>

					{/* Navigation — icon-only tabs on mobile, full sidebar on md+ */}
					<nav
						aria-label="Seções do perfil"
						className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-[6.667px] px-[8.667px] flex flex-row md:flex-col gap-0.5 justify-around md:justify-start"
					>
						{NAV_ITEMS.map(({ id, label, icon }) => {
							const active = tab === id;
							return (
								<button
									key={id}
									type="button"
									onClick={() => setTab(id)}
									aria-label={label}
									title={label}
									aria-current={active ? "page" : undefined}
									className={`flex items-center justify-center md:justify-start gap-0 md:gap-2.5 h-[37.5px] w-[37.5px] md:h-[37.5px] md:w-full md:pl-3 md:pr-3 rounded-md border-none cursor-pointer transition-colors ${
										active
											? "bg-brand-wash text-brand"
											: "bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
									}`}
								>
									<span className="flex items-center shrink-0">{icon}</span>
									<span
										className={`hidden md:inline text-[13px] leading-[19.5px] whitespace-nowrap ${
											active ? "font-semibold" : "font-normal"
										}`}
									>
										{label}
									</span>
								</button>
							);
						})}
						{user.moderator && (
							<Link
								href="/admin/moderation"
								aria-label="Moderação"
								title="Moderação"
								className="flex items-center justify-center md:justify-start gap-0 md:gap-2.5 h-[37.5px] w-[37.5px] md:h-[37.5px] md:w-full md:pl-3 md:pr-3 rounded-md no-underline transition-colors text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20"
							>
								<span className="flex items-center shrink-0">
									<svg
										width="15"
										height="15"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
									</svg>
								</span>
								<span className="hidden md:inline text-[13px] leading-[19.5px] whitespace-nowrap font-semibold">
									Moderação
								</span>
							</Link>
						)}
					</nav>
				</aside>

				{/* ── Main content ── */}
				<main id="main-content" className="flex-1 min-w-0">
					{/* OVERVIEW */}
					{tab === "overview" && (
						<div>
							<div className="mb-6">
								<h2 className="font-bold text-xl text-slate-800 dark:text-slate-100 m-0 mb-1">
									Olá, {user.name.split(" ")[0]} 👋
								</h2>
								<p className="text-[13px] text-slate-400 dark:text-slate-500 m-0">
									Aqui está um resumo da sua atividade no BibleComment.
								</p>
							</div>
							{profile ? (
								<>
									<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
										<StatCard
											label="Comentários"
											value={profile.commentsCount}
											max={0}
											color="#137ddb"
										/>
										<StatCard
											label="Livros comentados"
											value={profile.booksCount}
											max={66}
											color="#7c3aed"
										/>
										<StatCard
											label="Capítulos comentados"
											value={profile.chaptersCount}
											max={1189}
											color="#059669"
										/>
									</div>
									<div
										className="grid grid-cols-2 gap-3 mb-7"
										data-testid="profile-social-stats"
									>
										<Link
											href={`/u/${user.username}/followers`}
											data-testid="profile-followers-link"
											className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-brand transition no-underline"
										>
											<div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500">
												Seguidores
											</div>
											<div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
												{profile.followersCount ?? 0}
											</div>
											<div className="text-[11px] text-brand mt-1">
												Ver lista →
											</div>
										</Link>
										<Link
											href={`/u/${user.username}/following`}
											data-testid="profile-following-link"
											className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-brand transition no-underline"
										>
											<div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500">
												Seguindo
											</div>
											<div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
												{profile.followingCount ?? 0}
											</div>
											<div className="text-[11px] text-brand mt-1">
												Ver lista →
											</div>
										</Link>
									</div>
								</>
							) : (
								<Loading />
							)}
							{comments.length > 0 && (
								<div>
									<div className="flex items-center justify-between mb-3">
										<h3 className="font-semibold text-xs text-slate-400 dark:text-slate-500 m-0 uppercase tracking-wider">
											Comentários recentes
										</h3>
										<button
											type="button"
											onClick={() => setTab("comments")}
											className="text-xs text-brand bg-transparent border-none cursor-pointer hover:underline"
										>
											Ver todos
										</button>
									</div>
									<div className="flex flex-col gap-2.5">
										{comments.slice(0, 3).map((c) => (
											<ProfileCommentCard key={c._id} comment={c} />
										))}
									</div>
								</div>
							)}
						</div>
					)}

					{/* COMMENTS */}
					{tab === "comments" && (
						<div className="flex flex-col gap-5">
							<h2 className="font-bold text-xl text-slate-800 dark:text-slate-100 m-0">
								Meus Comentários
							</h2>
							<SearchBar
								value={commentSearch}
								onChange={setCommentSearch}
								placeholder="Buscar nos meus comentários…"
							/>
							{loading && comments.length === 0 ? (
								<Loading />
							) : filteredComments.length === 0 ? (
								<div className="text-center text-slate-400 dark:text-slate-500 py-10 text-sm">
									{commentSearch
										? `Nenhum resultado para "${commentSearch}".`
										: "Nenhum comentário ainda."}
								</div>
							) : (
								<div className="flex flex-col gap-2.5">
									{filteredComments.map((c) => (
										<ProfileCommentCard
											key={c._id}
											comment={c}
											onEdit={setEditingComment}
											onDelete={handleDelete}
										/>
									))}
								</div>
							)}
						</div>
					)}

					{/* FAVORITES */}
					{tab === "favorites" && (
						<div className="flex flex-col gap-5">
							<h2 className="font-bold text-xl text-slate-800 dark:text-slate-100 m-0">
								Favoritos
							</h2>

							{/* Search bar */}
							<SearchBar
								value={favSearch}
								onChange={setFavSearch}
								placeholder="Buscar nos favoritos…"
							/>

							{/* Type filter pills */}
							<div className="flex gap-2 flex-wrap">
								{TYPE_FILTERS.map((f) => {
									const active = favTypeFilter === f;
									return (
										<button
											key={f}
											type="button"
											onClick={() => setFavTypeFilter(f)}
											className={`h-7 px-3.5 rounded-[20px] text-xs leading-[18px] transition-colors duration-150 ${
												active
													? "bg-brand text-white font-semibold"
													: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-normal"
											}`}
										>
											{f}
										</button>
									);
								})}
							</div>

							{/* Autores Favoritos card */}
							{favoriteAuthors.length > 0 && (
								<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-4">
									<div className="font-semibold text-[13px] text-slate-800 dark:text-slate-100 mb-3">
										Autores Favoritos
									</div>
									<div className="flex gap-2.5 flex-wrap">
										{favoriteAuthors.map(({ username, count }) => {
											const ini = getInitials(username);
											return (
												<div
													key={username}
													className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 h-[46.333px]"
												>
													{/* Avatar */}
													<div className="w-7 h-7 rounded-full bg-brand/10 flex items-center justify-center flex-shrink-0">
														<span className="font-bold text-[11px] text-brand leading-[16.5px]">
															{ini}
														</span>
													</div>
													{/* Username + like count */}
													<div className="flex flex-col">
														<Link
															href={`/u/${username}`}
															className="font-semibold text-xs text-slate-800 dark:text-slate-100 whitespace-nowrap hover:underline"
														>
															@{username}
														</Link>
														<span className="text-[10px] text-slate-400 dark:text-slate-500">
															{count} curtido{count !== 1 ? "s" : ""}
														</span>
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
								<div className="text-center text-slate-400 dark:text-slate-500 py-10 text-sm">
									{favSearch || favTypeFilter !== "Todos"
										? "Nenhum favorito encontrado com esses filtros."
										: "Nenhum favorito ainda."}
								</div>
							) : (
								<div className="flex flex-col gap-2.5">
									{filteredFavorites.map((c) => (
										<FavoriteCard key={c._id} comment={c} />
									))}
								</div>
							)}
						</div>
					)}

					{/* BADGES */}
					{tab === "badges" && <BadgesTab />}

					{/* CONFIG */}
					{tab === "config" && (
						<div className="flex flex-col gap-5">
							{/* Title */}
							<h2 className="font-bold text-xl text-slate-800 dark:text-slate-100 m-0">
								Configurações &amp; Privacidade
							</h2>

							{/* ── Card: Identidade (display name + slug) ── */}
							{profile && (
								<IdentityCard
									initialDisplayName={
										profile.displayName ?? user.name ?? user.username
									}
									initialUsername={profile.username}
									onUpdated={(next) => {
										setProfile((p) => (p ? { ...p, ...next } : p));
									}}
								/>
							)}

							{/* ── Card 1: Informações da Conta ── */}
							<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-6 pt-5 pb-6">
								<div className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-5">
									Informações da Conta
								</div>
								<div className="flex flex-col gap-1.5 mb-5">
									<label className="font-semibold text-[13px] text-slate-800 dark:text-slate-100">
										Crença / Denominação
									</label>
									<select
										value={belief}
										onChange={(e) => setBelief(e.target.value)}
										className="w-full h-[38.833px] border border-slate-200 dark:border-slate-700 rounded-lg px-3 text-[13px] text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 outline-none cursor-pointer"
									>
										{beliefs.map((b) => (
											<option key={b} value={b}>
												{b}
											</option>
										))}
									</select>
								</div>
								<button
									onClick={handleUpdateAccount}
									className="h-[35.5px] px-5 bg-brand text-white rounded-[7px] text-[13px] font-semibold whitespace-nowrap cursor-pointer"
								>
									Salvar alterações
								</button>
							</div>

							{/* ── Card: Lembrete diário de leitura ── */}
							<ReadingReminderCard />

							{/* ── Card 2: Privacidade ── */}
							<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-6 py-5">
								<div className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-4">
									Privacidade
								</div>

								{/* Toggle 1 */}
								<div
									className="flex items-start gap-3.5 pb-4"
									data-testid="show-belief-toggle"
								>
									<Toggle
										checked={showReligion}
										onChange={setShowReligion}
									/>
									<div>
										<div className="font-semibold text-[13px] text-slate-800 dark:text-slate-100 leading-[19.5px]">
											Mostrar minha religião no perfil público
										</div>
										<div className="text-xs text-slate-400 dark:text-slate-500 leading-[18px] mt-0.5">
											Outros usuários poderão ver sua denominação na sua página
											de perfil.
										</div>
									</div>
								</div>

								{/* Divider */}
								<div className="h-px bg-slate-50 dark:bg-slate-800 mb-4" />

								{/* Toggle 2 */}
								<div className="flex items-start gap-3.5">
									<Toggle
										checked={showHistory}
										onChange={setShowHistory}
									/>
									<div>
										<div className="font-semibold text-[13px] text-slate-800 dark:text-slate-100 leading-[19.5px]">
											Permitir que outros vejam meu histórico de comentários
										</div>
										<div className="text-xs text-slate-400 dark:text-slate-500 leading-[18px] mt-0.5">
											Se desativado, seus comentários ficam anônimos para outros
											leitores.
										</div>
									</div>
								</div>
							</div>

							{/* ── Card: Trocar senha ── */}
							<ChangePasswordCard />

							{/* ── Card: Tutorial guiado ── */}
							<TutorialResetCard />

							{/* ── Card: Meus dados (LGPD Art. 18 - portabilidade) ── */}
							<MyDataCard onCommentsImported={loadComments} />

							{/* ── Card 3: Zona de Perigo ── */}
							<div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/40 rounded-xl px-6 pt-5 pb-6">
								<div className="font-bold text-sm text-red-700 dark:text-red-300 mb-3">
									Zona de Perigo
								</div>
								<p className="text-[13px] text-slate-500 dark:text-slate-400 leading-[19.5px] mb-5 mt-0">
									A exclusão da conta é permanente e irrecuperável. Seu cadastro
									é apagado e seus comentários e discussões ficam anônimos sob
									&ldquo;[usuário removido]&rdquo;, preservando o contexto das
									conversas para outros leitores.
									{comments.length > 0 &&
										` Total de comentários a serem anonimizados: ${comments.length}.`}
								</p>
								<button
									onClick={handleDeleteAccount}
									className="h-[36.167px] px-5 bg-transparent text-red-600 dark:text-red-400 border-[1.333px] border-red-600 dark:border-red-400 rounded-[7px] text-[13px] font-semibold whitespace-nowrap cursor-pointer"
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
						onSaved={(updated) => {
							setComments((prev) =>
								prev.map((c) => (c._id === updated._id ? updated : c)),
							);
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
