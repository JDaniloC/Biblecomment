"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useNotification } from "@/contexts/NotificationContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { commentsService } from "@/services/comments";
import { useActiveCommunity } from "@/lib/hooks/useCommunityFilter";
import { useReadingTime } from "@/lib/hooks/useReadingTime";
import { haptic } from "@/lib/haptic";
import { Book } from "@/domain/entities/Book";
import { Verse } from "@/domain/entities/Verse";
import type { CommentData } from "@/lib/comment-data";
import { ChapterReader } from "@/components/ChapterReader/ChapterReader";
import { FontSizeControl } from "@/components/FontSizeControl";
import { AppHeader } from "@/components/AppHeader";
import Tutorial from "@/components/Tutorial/Tutorial";
import { useTutorial } from "@/lib/use-tutorial";
import { CHAPTER_TUTORIAL, CHAPTER_TUTORIAL_NAME } from "@/lib/tutorial-config";
import { MarkAsReadButton } from "@/components/MarkAsReadButton";
import { TAG_META, TAG_ORDER, getTagMetaOrNeutral } from "@/lib/tag-meta";
import { TagIcon } from "@/components/TagIcon";
import { TagBadges } from "@/components/TagBadges";
import { ShareCommentButton } from "@/components/ShareCommentButton";
import {
	toggleLikeAction,
	reportCommentAction,
	deleteCommentAction,
	createCommentAction,
	updateCommentAction,
} from "@/app/actions/comments";
import { toggleCommentVerifiedAction } from "@/app/actions/moderation";
import { VerifiedBadge } from "@/components/VerifiedBadge";

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
	/**
	 * The signed-in user, or null for an anonymous reader. Reading is
	 * always allowed; write actions (composing, liking, reporting, opening
	 * a discussion, deleting) bounce through /login when user is null.
	 */
	user: SessionUser | null;
	/**
	 * Has the user completed the chapter tutorial on any device? Sourced from
	 * the auth session (JWT, populated at login). Lets the tour skip itself
	 * for a fresh browser of an already-onboarded user without waiting on
	 * localStorage. Always false for anonymous readers.
	 */
	tutorialAlreadyCompleted: boolean;
	/**
	 * Whether the signed-in user has marked this chapter as read.
	 * Always false for anonymous readers (the button hides for them too).
	 */
	alreadyRead: boolean;
	/**
	 * Per-verse comment counts (non-title) and total title-mode comment count,
	 * pre-computed server-side. When provided, ChapterClient paints badges on
	 * first render and skips the mount-time axios fetch.
	 */
	initialCountMap?: Record<string, number>;
	initialTitleCount?: number;
}

const MIN_LEN = 200;
const MAX_LEN = 1000;

function dateFormat(str: string) {
	try {
		return new Date(str).toLocaleDateString("pt-BR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		});
	} catch {
		return str;
	}
}

export default function ChapterClient({
	book,
	verses,
	chapter,
	user,
	tutorialAlreadyCompleted,
	alreadyRead,
	initialCountMap,
	initialTitleCount,
}: Props) {
	const router = useRouter();
	const { handleNotification } = useNotification();
	const confirm = useConfirm();

	// Accrue reading time toward the daily streak session (logged-in only).
	useReadingTime(!!user);

	const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
	const [isTitleMode, setIsTitleMode] = useState(false);
	const [comments, setComments] = useState<CommentData[]>([]);
	const [titleComments, setTitleComments] = useState<CommentData[]>([]);
	// Number of "prioritized" items at the start of `comments`
	// (plan_community: partition by active community). 0 = no
	// prioritization → render `comments` flat.
	const [prioritizedCount, setPrioritizedCount] = useState(0);
	const [othersExpanded, setOthersExpanded] = useState(false);
	const [loadingComments, setLoadingComments] = useState(false);
	const [countMap, setCountMap] = useState<Record<string, number>>(
		initialCountMap ?? {},
	);
	const [titleCount, setTitleCount] = useState(initialTitleCount ?? 0);
	// Counts are seeded from server props; only refetch client-side when the
	// server didn't supply them (legacy callers / tests). Future writes update
	// the maps directly via setCountMap / setTitleCount so no refresh is needed.
	const hasInitialCounts =
		initialCountMap !== undefined && initialTitleCount !== undefined;

	const [composing, setComposing] = useState(false);
	const [composeText, setComposeText] = useState("");
	const [composeTags, setComposeTags] = useState<Record<string, boolean>>({
		devocional: false,
		exegese: false,
		pessoal: false,
		inspirado: false,
	});
	// The picker now lives in the AppHeader profile dropdown (plan_community
	// follow-up). The reader only needs `active` to drive the comment
	// partition — skip the followed-list fetch on every chapter load.
	const community = useActiveCommunity(user?.username, {
		withFollowed: false,
	});
	const [composeSubmitting, setComposeSubmitting] = useState(false);
	const [editingComment, setEditingComment] = useState<CommentData | null>(
		null,
	);
	// Which comment's kebab “⋯” actions menu is open (null = none). One menu
	// open at a time across the per-comment map.
	const [openMenuId, setOpenMenuId] = useState<string | null>(null);
	const [editText, setEditText] = useState("");
	const [editTags, setEditTags] = useState<Record<string, boolean>>({
		devocional: false,
		exegese: false,
		pessoal: false,
		inspirado: false,
	});

	const sidebarRef = useRef<HTMLDivElement>(null);

	// Onboarding tour. Renders on first visit (any chapter) until the user
	// finishes or skips it. URL ?tour=1 forces a re-run regardless of the
	// localStorage flag — used by the "Refazer tutorial" button on /profile.
	// useSearchParams (App Router hook) is the hydration-safe way to read
	// the query string; reading window.location.search directly during
	// render trips a SSR/CSR mismatch in production.
	// syncServer + initialFromServer give us cross-device behavior: the JWT
	// carries `tutorialsCompleted`, so a fresh browser of an already-onboarded
	// user skips the tour without waiting on localStorage. The tour is
	// skipped entirely for anonymous readers — the actions it teaches all
	// require an account anyway.
	const tutorial = useTutorial(CHAPTER_TUTORIAL_NAME, {
		syncServer: !!user,
		initialFromServer: tutorialAlreadyCompleted,
	});
	const searchParams = useSearchParams();
	const forceTour = searchParams?.get("tour") === "1";
	const showTutorial = !!user && (forceTour || tutorial.isCompleted === false);

	const prevChapter = chapter > 1 ? chapter - 1 : null;
	const nextChapter = chapter < book.chapters ? chapter + 1 : null;

	// plan_community: when an active community is selected and there are
	// non-prioritized comments, hide them behind a "Ver outros comentários"
	// toggle. With no active community, prioritizedCount is 0 → full list.
	const hasOthersToggle =
		!isTitleMode &&
		community.active !== null &&
		comments.length > prioritizedCount;
	const hiddenOthersCount = hasOthersToggle
		? comments.length - prioritizedCount
		: 0;
	const visibleVerseList =
		hasOthersToggle && !othersExpanded
			? comments.slice(0, prioritizedCount)
			: comments;
	const activeComments = isTitleMode ? titleComments : visibleVerseList;

	const loadCounts = useCallback(async () => {
		try {
			const res = await commentsService.getForChapter(
				book.abbrev,
				chapter,
				community.active,
			);
			const tc = (res.titleComments ?? []) as unknown as CommentData[];
			const vc = [
				...((res.prioritized ?? []) as unknown as CommentData[]),
				...((res.others ?? []) as unknown as CommentData[]),
			];
			setTitleCount(tc.length);
			const map: Record<string, number> = {};
			vc.forEach((c) => {
				if (c.verseId) map[c.verseId] = (map[c.verseId] ?? 0) + 1;
			});
			setCountMap(map);
		} catch {
			// Comment counts are non-critical UI metadata; failures shouldn't surface.
		}
	}, [book.abbrev, chapter, community.active]);

	// Escape closes the kebab actions menu. Outside-click is handled by the
	// fixed backdrop button rendered behind the open menu.
	useEffect(() => {
		if (openMenuId === null) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setOpenMenuId(null);
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [openMenuId]);

	useEffect(() => {
		// Skip the first paint when SSR already provided counts (no filter), but
		// re-fetch on every filter change so the per-verse badges reflect the
		// selected communities.
		if (hasInitialCounts && community.active === null) return;
		loadCounts();
	}, [hasInitialCounts, loadCounts, community.active]);

	// Reload the open panel's comments whenever the filter changes — keeps
	// the sidebar in sync with the chips without making the user close +
	// reopen the verse panel. Inlined here (rather than calling openVersePanel)
	// because the open* helpers double as toggles: invoking them on the
	// already-selected verse closes the panel.
	useEffect(() => {
		let cancelled = false;
		async function refresh() {
			if (isTitleMode) {
				try {
					const res = await commentsService.getForChapter(
						book.abbrev,
						chapter,
						community.active,
					);
					if (!cancelled)
						setTitleComments(
							(res.titleComments ?? []) as unknown as CommentData[],
						);
				} catch {
					// Filter change isn't a user action; suppress the toast — the
					// existing comments stay rendered until the next interaction.
				}
			} else if (selectedVerse) {
				try {
					const res = await commentsService.getForVerse(
						book.abbrev,
						chapter,
						selectedVerse.verseNumber,
						community.active,
					);
					if (!cancelled) {
						const p = (res.prioritized ?? []) as unknown as CommentData[];
						const o = (res.others ?? []) as unknown as CommentData[];
						setComments([...p, ...o]);
						setPrioritizedCount(p.length);
						setOthersExpanded(false);
					}
				} catch {}
			}
		}
		refresh();
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [community.active]);

	const openTitlePanel = useCallback(async () => {
		setIsTitleMode(true);
		setSelectedVerse(null);
		setComposing(false);
		setLoadingComments(true);
		try {
			const res = await commentsService.getForChapter(
				book.abbrev,
				chapter,
				community.active,
			);
			setTitleComments((res.titleComments ?? []) as unknown as CommentData[]);
		} catch {
			handleNotification("error", "Erro ao carregar comentários do capítulo.");
		} finally {
			setLoadingComments(false);
		}
	}, [book.abbrev, chapter, community.active, handleNotification]);

	const openVersePanel = useCallback(
		async (verse: Verse) => {
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
				const res = await commentsService.getForVerse(
					book.abbrev,
					chapter,
					verse.verseNumber,
					community.active,
				);
				const p = (res.prioritized ?? []) as unknown as CommentData[];
				const o = (res.others ?? []) as unknown as CommentData[];
				setComments([...p, ...o]);
				setPrioritizedCount(p.length);
				setOthersExpanded(false);
			} catch {
				handleNotification("error", "Erro ao carregar comentários.");
			} finally {
				setLoadingComments(false);
			}
		},
		[
			book.abbrev,
			chapter,
			isTitleMode,
			selectedVerse,
			community.active,
			handleNotification,
		],
	);

	const handleClose = useCallback(() => {
		setSelectedVerse(null);
		setIsTitleMode(false);
		setComposing(false);
		setComments([]);
		setTitleComments([]);
	}, []);

	const resetCompose = useCallback(() => {
		setComposeText("");
		setComposeTags({
			devocional: false,
			exegese: false,
			pessoal: false,
			inspirado: false,
		});
		setComposing(false);
	}, []);

	// Push the visitor to /login with a callback that returns them right
	// back to where they were trying to act. Called by every write handler
	// when `user` is null.
	const requireLogin = useCallback(() => {
		if (typeof window === "undefined") {
			router.push("/login");
			return;
		}
		const cb = encodeURIComponent(
			window.location.pathname + window.location.search,
		);
		router.push(`/login?callbackUrl=${cb}`);
	}, [router]);

	const handleCompose = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			if (!user) {
				requireLogin();
				return;
			}
			if (composeText.length < MIN_LEN || composeText.length > MAX_LEN) {
				handleNotification(
					"info",
					`Comentário deve ter entre ${MIN_LEN} e ${MAX_LEN} caracteres.`,
				);
				return;
			}
			const tagList = Object.entries(composeTags)
				.filter(([, v]) => v)
				.map(([k]) => k);
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
						setCountMap((prev) => ({
							...prev,
							[selectedVerse._id!]: (prev[selectedVerse._id!] ?? 0) + 1,
						}));
					}
				}
				resetCompose();
			} finally {
				setComposeSubmitting(false);
			}
		},
		[
			user,
			requireLogin,
			composeText,
			composeTags,
			isTitleMode,
			book.abbrev,
			chapter,
			selectedVerse,
			handleNotification,
			resetCompose,
		],
	);

	const handleLike = useCallback(
		async (id: string) => {
			if (!user) {
				requireLogin();
				return;
			}
			haptic("tap");
			const result = await toggleLikeAction(id);
			if (!result.ok) {
				handleNotification("error", "Erro ao curtir.");
				return;
			}
			// The action returns { commentId, likeCount, likedByMe } — only those
			// two fields change on the affected card.
			const { likeCount, likedByMe } = result.data;
			const updater = (prev: CommentData[]) =>
				prev.map((c) => (c._id === id ? { ...c, likeCount, likedByMe } : c));
			setComments(updater);
			setTitleComments(updater);
		},
		[user, requireLogin, handleNotification],
	);

	const handleReport = useCallback(
		async (id: string) => {
			if (!user) {
				requireLogin();
				return;
			}
			const ok = await confirm({
				title: "Reportar este comentário?",
				description:
					"Use essa opção apenas para conteúdo abusivo, ofensivo ou fora do tema. A moderação será notificada.",
				confirmLabel: "Reportar",
				variant: "danger",
			});
			if (!ok) return;
			const result = await reportCommentAction(id);
			if (!result.ok) {
				handleNotification("error", "Erro ao reportar.");
				return;
			}
			handleNotification("info", "Comentário reportado.");
		},
		[user, requireLogin, handleNotification, confirm],
	);

	// Moderator-only: flip the admin-verified badge on a comment without
	// bouncing to /admin/moderation. Updates both lists optimistically so the
	// checkmark next to the username refreshes immediately.
	const handleToggleVerified = useCallback(
		async (id: string) => {
			if (!user?.moderator) return;
			const result = await toggleCommentVerifiedAction(id);
			if (!result.ok) {
				handleNotification(
					"error",
					result.error === "Forbidden"
						? "Sem permissão."
						: "Erro ao alterar verificação.",
				);
				return;
			}
			const updated = result.data;
			const patch = (c: CommentData): CommentData =>
				c._id === id
					? {
							...c,
							verified: updated.verified ?? false,
							verifiedBy: updated.verifiedBy,
						}
					: c;
			setComments((prev) => prev.map(patch));
			setTitleComments((prev) => prev.map(patch));
			handleNotification(
				"success",
				updated.verified ? "Comentário verificado." : "Verificação removida.",
			);
		},
		[user, handleNotification],
	);

	const handleDelete = useCallback(
		async (id: string) => {
			if (!user) {
				requireLogin();
				return;
			}
			const ok = await confirm({
				title: "Excluir este comentário?",
				description: "Esta ação não pode ser desfeita.",
				confirmLabel: "Excluir",
				variant: "danger",
			});
			if (!ok) return;
			const result = await deleteCommentAction(id);
			if (!result.ok) {
				handleNotification(
					"error",
					result.error === "Forbidden" ? "Sem permissão." : "Erro ao excluir.",
				);
				return;
			}
			setComments((prev) => prev.filter((c) => c._id !== id));
			setTitleComments((prev) => prev.filter((c) => c._id !== id));
			handleNotification("success", "Comentário excluído.");
		},
		[user, requireLogin, handleNotification, confirm],
	);

	const startEdit = useCallback((comment: CommentData) => {
		setEditingComment(comment);
		setEditText(comment.text);
		const tagMap: Record<string, boolean> = {
			devocional: false,
			exegese: false,
			pessoal: false,
			inspirado: false,
		};
		comment.tags.forEach((t) => {
			if (t in tagMap) tagMap[t] = true;
		});
		setEditTags(tagMap);
	}, []);

	const handleEditSave = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			if (!editingComment) return;
			if (editText.length < MIN_LEN || editText.length > MAX_LEN) {
				handleNotification(
					"info",
					`Comentário deve ter entre ${MIN_LEN} e ${MAX_LEN} caracteres.`,
				);
				return;
			}
			const tagList = Object.entries(editTags)
				.filter(([, v]) => v)
				.map(([k]) => k);
			const result = await updateCommentAction(editingComment._id, {
				text: editText,
				tags: tagList,
			});
			if (!result.ok) {
				handleNotification("error", "Erro ao editar.");
				return;
			}
			const updated = result.data as unknown as CommentData;
			setComments((prev) =>
				prev.map((c) => (c._id === editingComment._id ? updated : c)),
			);
			setTitleComments((prev) =>
				prev.map((c) => (c._id === editingComment._id ? updated : c)),
			);
			handleNotification("success", "Comentário editado!");
			setEditingComment(null);
		},
		[editingComment, editText, editTags, handleNotification],
	);

	const handleDiscussion = useCallback(
		(commentId: string) => {
			if (!user) {
				requireLogin();
				return;
			}
			// Open the comment's discussions page: it lists existing threads
			// anchored to this comment and offers a "Nova discussão" CTA.
			router.push(`/discussion/${book.abbrev}/comment/${commentId}`);
		},
		[user, requireLogin, book.abbrev, router],
	);

	const showSidebar = selectedVerse !== null || isTitleMode;

	// Keyboard navigation: ← / → for chapters, Esc to close the comment
	// sidebar. Skip when the user is typing in an input/textarea or when a
	// modifier key is pressed (so browser shortcuts still work).
	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (e.metaKey || e.ctrlKey || e.altKey) return;
			const target = e.target as HTMLElement | null;
			const tag = target?.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable)
				return;
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

	// The comment panel is a focused full-screen task on mobile — hide the
	// global bottom tab bar while it is open (see globals.css .bc-hide-tabbar).
	useEffect(() => {
		if (!showSidebar) return;
		document.body.classList.add("bc-hide-tabbar");
		return () => document.body.classList.remove("bc-hide-tabbar");
	}, [showSidebar]);

	// Android / browser back must CLOSE the open comment panel, not navigate
	// away. In a standalone PWA the system back maps to history.back(); with
	// no synthetic history entry it pops the page — and EXITS the app when
	// the chapter is the first entry (PWA launched from icon / share deep
	// link). Push one entry while the panel is open; a popstate (back) then
	// just closes it. On a non-back close (X / Esc / re-tapping the same
	// verse) we pop our own entry to keep the history stack balanced —
	// skipped if we navigated away (pathname changed, e.g. tapping an
	// in-panel @username link) so we don't hijack that navigation.
	useEffect(() => {
		if (!showSidebar || typeof window === "undefined") return;
		const openedAtPath = window.location.pathname;
		let poppedByBack = false;
		window.history.pushState({ bcPanel: true }, "");
		const onPop = () => {
			poppedByBack = true;
			handleClose();
		};
		window.addEventListener("popstate", onPop);
		return () => {
			window.removeEventListener("popstate", onPop);
			if (
				!poppedByBack &&
				window.location.pathname === openedAtPath &&
				(window.history.state as { bcPanel?: boolean } | null)?.bcPanel === true
			) {
				window.history.back();
			}
		};
	}, [showSidebar, handleClose]);

	// Swipe-to-navigate (touch only, mobile). Threshold ~60px horizontal,
	// ignored if vertical movement dominates (avoids hijacking scrolls)
	// or if the sidebar is open (would conflict with closing the drawer).
	const touchStart = useRef<{ x: number; y: number } | null>(null);
	const onTouchStart = useCallback(
		(e: React.TouchEvent) => {
			if (showSidebar) return;
			const t = e.touches[0];
			touchStart.current = { x: t.clientX, y: t.clientY };
		},
		[showSidebar],
	);
	const onTouchEnd = useCallback(
		(e: React.TouchEvent) => {
			const start = touchStart.current;
			touchStart.current = null;
			if (!start) return;
			const t = e.changedTouches[0];
			const dx = t.clientX - start.x;
			const dy = t.clientY - start.y;
			if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
			if (dx < 0 && nextChapter)
				router.push(`/verses/${book.abbrev}/${nextChapter}`);
			else if (dx > 0 && prevChapter)
				router.push(`/verses/${book.abbrev}/${prevChapter}`);
		},
		[book.abbrev, nextChapter, prevChapter, router],
	);

	const sidebarTitle = isTitleMode
		? `${book.name} ${chapter}`
		: selectedVerse
			? `${book.abbrev.charAt(0).toUpperCase() + book.abbrev.slice(1)} ${chapter}:${selectedVerse.verseNumber}`
			: "";

	const sidebarRef2 = sidebarRef;

	return (
		<div className="min-h-screen flex flex-col bg-[#f9f9f7] dark:bg-slate-950">
			<AppHeader
				user={user}
				loginCallbackUrl={`/verses/${book.abbrev}/${chapter}`}
				trailing={<FontSizeControl />}
			/>

			<div className="flex flex-1 relative min-h-0">
				<main
					id="main-content"
					onTouchStart={onTouchStart}
					onTouchEnd={onTouchEnd}
					className={`flex-1 overflow-y-auto transition-[padding] duration-200 ${showSidebar ? "md:pr-[420px]" : ""}`}
				>
					<div className="max-w-[680px] mx-auto px-6 py-10">
						<div className="flex items-center gap-4 mb-2 text-sm text-gray-400 dark:text-gray-500">
							<Link
								href="/home"
								className="hover:text-blue-600 dark:hover:text-blue-400 transition"
							>
								← Livros
							</Link>
							{prevChapter && (
								<Link
									href={`/verses/${book.abbrev}/${prevChapter}`}
									className="hover:text-blue-600 dark:hover:text-blue-400 transition"
								>
									Cap. {prevChapter}
								</Link>
							)}
							<span className="flex-1" />
							{nextChapter && (
								<Link
									href={`/verses/${book.abbrev}/${nextChapter}`}
									className="hover:text-blue-600 dark:hover:text-blue-400 transition"
								>
									Cap. {nextChapter}
								</Link>
							)}
						</div>

						<div className="flex items-center justify-center gap-3 mt-6 mb-3">
							<button
								type="button"
								onClick={openTitlePanel}
								className="flex items-center gap-2 hover:opacity-80 transition"
							>
								<h1 className="font-serif font-bold text-slate-800 dark:text-slate-100 tracking-[1.9px] uppercase text-[clamp(24px,4vw,38px)]">
									{book.name} {chapter}
								</h1>
								<svg
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="none"
									stroke="#94a3b8"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<polyline points="6 9 12 15 18 9" />
								</svg>
							</button>
						</div>

						<div className="flex items-center justify-center mb-6">
							<MarkAsReadButton
								abbrev={book.abbrev}
								chapter={chapter}
								initialRead={alreadyRead}
								enabled={!!user}
							/>
						</div>

						{/* Active community picker moved to the AppHeader profile
                dropdown in the plan_community follow-up. The reader still
                reads the active slug from localStorage to partition
                comments — only the chooser surface changed. */}

						{(titleCount > 0 || isTitleMode) && (
							<button
								type="button"
								onClick={openTitlePanel}
								className="flex items-center gap-3 w-full mb-6 px-4 py-2.5 rounded-r-md text-left transition hover:bg-black/5 bg-black/[0.02] border-l-4 border-solid"
								style={{
									borderLeftColor: isTitleMode ? "#137ddb" : "rgba(0,0,0,0)",
								}}
							>
								<svg
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="#64748b"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<circle cx="12" cy="12" r="10" />
									<line x1="12" y1="8" x2="12" y2="12" />
									<line x1="12" y1="16" x2="12.01" y2="16" />
								</svg>
								<span className="text-[14px] text-slate-500 dark:text-slate-400 flex-1">
									Visão Geral do Capítulo
								</span>
								{titleCount > 0 && (
									<span className="bg-brand text-white text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[22px] text-center">
										{titleCount}
									</span>
								)}
								<svg
									width="13"
									height="13"
									viewBox="0 0 24 24"
									fill="none"
									stroke="#94a3b8"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<polyline points="9 18 15 12 9 6" />
								</svg>
							</button>
						)}

						<ChapterReader
							abbrev={book.abbrev}
							chapter={chapter}
							verses={verses}
							countMap={countMap}
							selectedVerse={selectedVerse}
							isTitleMode={isTitleMode}
							onSelectVerse={openVersePanel}
						/>

						<div className="mt-10 flex justify-between">
							{prevChapter && (
								<Link
									href={`/verses/${book.abbrev}/${prevChapter}`}
									className="text-sm px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition text-gray-600 dark:text-slate-300"
								>
									← Capítulo {prevChapter}
								</Link>
							)}
							{nextChapter && (
								<Link
									href={`/verses/${book.abbrev}/${nextChapter}`}
									className="text-sm px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition text-gray-600 dark:text-slate-300 ml-auto"
								>
									Capítulo {nextChapter} →
								</Link>
							)}
						</div>
					</div>
				</main>

				{showSidebar && (
					<aside
						ref={sidebarRef2}
						className="fixed top-[68px] left-0 right-0 bottom-0 md:inset-auto md:right-0 bg-white dark:bg-slate-900 md:border-l border-slate-200 dark:border-slate-700 z-30 flex flex-col md:w-[420px] md:top-[68px] md:h-[calc(100vh-68px)]"
					>
						<div className="border-b border-slate-200 dark:border-slate-700 px-5 py-3.5 flex items-center gap-3">
							<div className="flex-1 min-w-0">
								<p className="text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">
									Comentários
								</p>
								<div className="flex items-center gap-2 mt-0.5 min-w-0">
									<span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 truncate">
										{sidebarTitle}
									</span>
									<span className="bg-[rgba(19,125,219,0.09)] text-brand text-[11px] font-semibold rounded-[10px] min-w-[21px] h-[18.5px] inline-flex items-center justify-center px-[7px]">
										{activeComments.length}
									</span>
								</div>
							</div>
							<button
								type="button"
								onClick={() => {
									if (!user) {
										requireLogin();
										return;
									}
									if (composing) resetCompose();
									else setComposing(true);
								}}
								className="flex items-center gap-[5px] h-[30.667px] px-[11px] border-[1.333px] border-brand rounded-md bg-transparent text-brand text-xs font-semibold cursor-pointer whitespace-nowrap"
							>
								<svg
									width="11"
									height="11"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<line x1="12" y1="5" x2="12" y2="19" />
									<line x1="5" y1="12" x2="19" y2="12" />
								</svg>
								Comentar
							</button>
							<button
								type="button"
								onClick={handleClose}
								aria-label="Fechar comentários"
								className="flex-shrink-0 flex items-center justify-center w-9 h-9 -mr-1.5 rounded-md text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
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
								>
									<line x1="18" y1="6" x2="6" y2="18" />
									<line x1="6" y1="6" x2="18" y2="18" />
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
											<svg
												width="13"
												height="13"
												viewBox="0 0 24 24"
												fill="none"
												stroke="#64748b"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
												className="flex-shrink-0"
											>
												<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
												<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
											</svg>
											<span className="font-normal text-xs text-slate-500 dark:text-slate-400 ml-1.5">
												Comentando em
											</span>
											<span className="font-bold text-xs text-slate-800 dark:text-slate-100 ml-1">
												{sidebarTitle}
											</span>
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
															onClick={() =>
																setComposeTags((prev) => ({
																	...prev,
																	[tag]: !prev[tag],
																}))
															}
															aria-pressed={active}
															className="flex items-center gap-2 h-[41.5px] px-[14px] rounded-[7px] border-2 border-solid cursor-pointer"
															style={{
																borderColor: active ? meta.border : "#e2e8f0",
																background: active ? meta.bg : "transparent",
															}}
														>
															<span
																className="flex-shrink-0 inline-flex"
																style={{ color: meta.color }}
															>
																<TagIcon
																	name={meta.icon}
																	width={16}
																	height={16}
																/>
															</span>
															<span
																className="font-normal text-[13px]"
																style={{
																	color: active ? meta.color : "#64748b",
																}}
															>
																{meta.label}
															</span>
														</button>
													);
												})}
											</div>
										</div>

										{/* Textarea */}
										<div className="pt-3 px-4 overflow-hidden">
											<form onSubmit={handleCompose}>
												<textarea
													data-testid="comment-composer-textarea"
													value={composeText}
													onChange={(e) => {
														let v = e.target.value;
														if (v.slice(-2) === "  ") v = v.slice(0, -1);
														setComposeText(v);
													}}
													placeholder="Escreva seu comentário aqui…"
													rows={6}
													className="w-full border-none outline-none resize-y min-h-[150px] max-h-[60vh] text-[14px] text-[rgba(26,26,26,0.85)] dark:text-slate-100 leading-[25.2px] bg-transparent box-border"
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
													{(() => {
														const len = composeText.length;
														const tooShort = len < MIN_LEN;
														const tooLong = len > MAX_LEN;
														const target = tooShort ? MIN_LEN : MAX_LEN;
														// Color encodes the state at a glance — amber while
														// the user can't yet publish, red when over the cap.
														const color = tooLong
															? "text-red-500 dark:text-red-400"
															: tooShort
																? "text-amber-500 dark:text-amber-400"
																: "text-slate-400 dark:text-slate-500";
														return (
															<span
																className={`ml-auto mr-3 text-[11px] font-medium ${color}`}
															>
																{len}/{target} caracteres
															</span>
														);
													})()}
													<button
														type="submit"
														disabled={
															composeText.length < MIN_LEN ||
															composeText.length > MAX_LEN ||
															composeSubmitting
														}
														className="h-9 px-4 rounded-[7px] border-none font-semibold text-[13px] whitespace-nowrap"
														style={{
															cursor:
																composeText.length >= MIN_LEN
																	? "pointer"
																	: "default",
															background:
																composeText.length >= MIN_LEN &&
																!composeSubmitting
																	? "#137ddb"
																	: "#f1f5f9",
															color:
																composeText.length >= MIN_LEN &&
																!composeSubmitting
																	? "#fff"
																	: "#a0aec0",
														}}
													>
														{composeSubmitting
															? "Publicando…"
															: "Publicar comentário"}
													</button>
												</div>
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
									<p className="text-slate-400 dark:text-slate-500 text-sm">
										Nenhum comentário ainda.
									</p>
									<p className="text-slate-300 dark:text-slate-600 text-xs mt-1">
										Seja o primeiro a comentar!
									</p>
									<button
										type="button"
										onClick={() => {
											if (!user) {
												requireLogin();
												return;
											}
											setComposing(true);
										}}
										className="mt-4 text-[13px] text-[#137ddb] hover:underline"
									>
										Escrever comentário
									</button>
								</div>
							) : (
								<div className="px-6 py-6 space-y-[12px]">
									{activeComments.map((comment) => {
										const meta = getTagMetaOrNeutral(comment.tags);
										const isOwner =
											!!user && comment.username === user.username;

										if (editingComment?._id === comment._id) {
											return (
												<div
													key={comment._id}
													className="bg-white dark:bg-slate-900 rounded-xl border border-[#e2e8f0] dark:border-slate-700 p-4"
												>
													<p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">
														Editando
													</p>
													<div className="grid grid-cols-2 gap-2 mb-3">
														{TAG_ORDER.map((tag) => {
															const tm = TAG_META[tag];
															const active = editTags[tag];
															return (
																<button
																	key={tag}
																	type="button"
																	onClick={() =>
																		setEditTags((prev) => ({
																			...prev,
																			[tag]: !prev[tag],
																		}))
																	}
																	className="flex items-center gap-2 px-3 py-2 rounded-lg border text-[13px] font-medium transition"
																	style={{
																		borderColor: active ? tm.border : "#e2e8f0",
																		background: active ? tm.bg : "white",
																		color: active ? tm.color : "#64748b",
																	}}
																>
																	<span
																		className="w-2 h-2 rounded-full flex-shrink-0"
																		style={{ background: tm.border }}
																	/>
																	{tm.label}
																</button>
															);
														})}
													</div>
													<form onSubmit={handleEditSave}>
														<textarea
															value={editText}
															onChange={(e) => setEditText(e.target.value)}
															rows={5}
															className="w-full border border-[#e2e8f0] dark:border-slate-700 rounded-lg px-3 py-2 text-[14px] text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 resize-y min-h-[120px] max-h-[60vh] focus:outline-none focus:ring-2 focus:ring-[#137ddb]/30 focus:border-[#137ddb] transition"
														/>
														<div className="flex items-center gap-2 mt-2 justify-end">
															{(() => {
																const len = editText.length;
																const tooShort = len < MIN_LEN;
																const tooLong = len > MAX_LEN;
																const target = tooShort ? MIN_LEN : MAX_LEN;
																const color = tooLong
																	? "text-red-500 dark:text-red-400"
																	: tooShort
																		? "text-amber-500 dark:text-amber-400"
																		: "text-slate-400 dark:text-slate-500";
																return (
																	<span
																		className={`mr-auto text-[11px] font-medium ${color}`}
																	>
																		{len}/{target} caracteres
																	</span>
																);
															})()}
															<button
																type="button"
																onClick={() => setEditingComment(null)}
																className="text-[13px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
															>
																Cancelar
															</button>
															<button
																type="submit"
																disabled={
																	editText.length < MIN_LEN ||
																	editText.length > MAX_LEN
																}
																className="bg-[#137ddb] text-white text-[13px] font-semibold px-3 py-1.5 rounded-lg hover:bg-[#0f69c0] transition disabled:opacity-50 disabled:cursor-not-allowed"
															>
																Salvar
															</button>
														</div>
													</form>
												</div>
											);
										}

										const borderColor = meta.border;
										return (
											<div
												key={comment._id}
												className="bg-white dark:bg-slate-900 border-l-4 border border-solid rounded-r-lg overflow-visible shadow-[0px_1px_4px_0px_rgba(0,0,0,0.06)]"
												style={{ borderColor }}
											>
												{/* Header row: category pills + username + date.
                            No fixed height — with 2+ categories the pills
                            wrap to a second line; a locked h-9 used to clip
                            them into the paragraph below ("rente ao texto").
                            items-start keeps the username aligned to the
                            first pill row. */}
												<div className="flex items-start gap-2 pt-4 pb-1.5 px-[18px]">
													{/* All categories as colored pills, ordered most
                              personal → most studied; empty → "Comentário". */}
													<TagBadges
														tags={comment.tags}
														size="md"
														className="min-w-0"
													/>
													{/* Username — linkar para o perfil público */}
													<span className="font-semibold text-[13px] text-slate-800 dark:text-slate-100 ml-auto shrink-0 pt-0.5 whitespace-nowrap inline-flex items-center gap-1">
														<Link
															href={`/u/${comment.username}`}
															className="hover:underline"
														>
															{comment.username}
														</Link>
														<VerifiedBadge
															verified={comment.authorEmailVerified}
															size="xs"
														/>
														{comment.verified && (
															<span
																className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
																title={
																	comment.verifiedBy
																		? `Verificado por @${comment.verifiedBy}`
																		: "Verificado por moderador"
																}
																aria-label={
																	comment.verifiedBy
																		? `Verificado por @${comment.verifiedBy}`
																		: "Verificado por moderador"
																}
															>
																<svg
																	width="10"
																	height="10"
																	viewBox="0 0 24 24"
																	fill="none"
																	stroke="currentColor"
																	strokeWidth="3"
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	aria-hidden="true"
																>
																	<polyline points="20 6 9 17 4 12" />
																</svg>
															</span>
														)}
													</span>
													{/* Date */}
													<span className="font-normal text-xs text-slate-400 dark:text-slate-500 ml-3 whitespace-nowrap">
														{dateFormat(comment.createdAt)}
													</span>
												</div>

												{/* Community badge — only when the comment was posted into a community */}
												{comment.communitySlug && (
													<div className="pt-2 px-[18px]">
														<Link
															href={`/communities/${comment.communitySlug}`}
															data-testid={`comment-community-badge-${comment.communitySlug}`}
															className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-tint/30 dark:bg-brand-tint/20 text-brand text-[11px] font-semibold no-underline hover:bg-brand-tint/60 dark:hover:bg-brand-tint/40 transition"
														>
															<svg
																width="10"
																height="10"
																viewBox="0 0 24 24"
																fill="none"
																stroke="currentColor"
																strokeWidth="2.5"
																strokeLinecap="round"
																strokeLinejoin="round"
																aria-hidden="true"
															>
																<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
																<circle cx="9" cy="7" r="4" />
															</svg>
															/{comment.communitySlug}
														</Link>
													</div>
												)}

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
														title="Útil"
														className="flex items-center gap-[5px] px-2 h-[26px] rounded-[5px] border-none bg-transparent cursor-pointer font-medium text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap"
													>
														<svg
															width="13"
															height="13"
															viewBox="0 0 24 24"
															fill={comment.likedByMe ? "currentColor" : "none"}
															stroke="currentColor"
															strokeWidth="2"
															strokeLinecap="round"
															strokeLinejoin="round"
														>
															<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
														</svg>
														<span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
															Útil ·{" "}
														</span>
														{comment.likeCount}
													</button>

													{/* Contribuir button */}
													<button
														type="button"
														onClick={() => handleDiscussion(comment._id)}
														data-testid="comment-discuss"
														className="flex items-center gap-[5px] px-2 h-[26px] rounded-[5px] border-none bg-transparent cursor-pointer font-medium text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap ml-0.5"
														title="Contribuir"
													>
														<svg
															width="13"
															height="13"
															viewBox="0 0 24 24"
															fill="none"
															stroke="currentColor"
															strokeWidth="2"
															strokeLinecap="round"
															strokeLinejoin="round"
														>
															<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
														</svg>
														<span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
															Contribuir ·{" "}
														</span>
														{comment.discussionCount ?? 0}
													</button>

													{/* Share as image card (Pinterest-like) */}
													<ShareCommentButton
														commentId={comment._id}
														text={comment.text}
														username={comment.username}
														reference={comment.bookReference}
													/>

													{/* Management actions live behind a kebab “⋯” menu so the
													    footer row no longer crowds (esp. for mods who also get the
													    verify toggle). Only rendered when the viewer has at least one
													    action — i.e. logged in (a non-owner always has Reportar). */}
													{!!user && (
														<div className="ml-auto relative">
															<button
																type="button"
																onClick={() =>
																	setOpenMenuId((prev) =>
																		prev === comment._id ? null : comment._id,
																	)
																}
																data-testid={`comment-menu-${comment._id}`}
																aria-label="Mais ações"
																aria-haspopup="menu"
																aria-expanded={openMenuId === comment._id}
																className="flex items-center justify-center w-7 h-7 rounded-[5px] border-none bg-transparent cursor-pointer text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
															>
																<svg
																	width="16"
																	height="16"
																	viewBox="0 0 24 24"
																	fill="currentColor"
																	aria-hidden="true"
																>
																	<circle cx="12" cy="5" r="1.6" />
																	<circle cx="12" cy="12" r="1.6" />
																	<circle cx="12" cy="19" r="1.6" />
																</svg>
															</button>
															{openMenuId === comment._id && (
																<>
																	{/* Backdrop closes the menu on outside click. */}
																	<button
																		type="button"
																		aria-hidden="true"
																		tabIndex={-1}
																		onClick={() => setOpenMenuId(null)}
																		className="fixed inset-0 z-10 cursor-default border-none bg-transparent"
																	/>
																	<div
																		role="menu"
																		className="absolute right-0 mt-1 min-w-[10rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-20 py-1"
																	>
																		{user?.moderator && (
																			<button
																				type="button"
																				role="menuitem"
																				onClick={() => {
																					setOpenMenuId(null);
																					handleToggleVerified(comment._id);
																				}}
																				data-testid={`mod-verify-${comment._id}`}
																				data-verified={
																					comment.verified ? "true" : "false"
																				}
																				className="flex w-full items-center gap-2 text-left px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-none bg-transparent cursor-pointer"
																			>
																				<svg
																					width="14"
																					height="14"
																					viewBox="0 0 24 24"
																					fill="none"
																					stroke="currentColor"
																					strokeWidth="2"
																					strokeLinecap="round"
																					strokeLinejoin="round"
																					aria-hidden="true"
																					className="shrink-0"
																				>
																					<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
																					<polyline points="22 4 12 14.01 9 11.01" />
																				</svg>
																				<span>
																					{comment.verified
																						? "Remover verificação"
																						: "Verificar"}
																				</span>
																			</button>
																		)}
																		{isOwner ? (
																			<>
																				<button
																					type="button"
																					role="menuitem"
																					onClick={() => {
																						setOpenMenuId(null);
																						startEdit(comment);
																					}}
																					className="flex w-full items-center gap-2 text-left px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-none bg-transparent cursor-pointer"
																				>
																					<svg
																						width="14"
																						height="14"
																						viewBox="0 0 24 24"
																						fill="none"
																						stroke="currentColor"
																						strokeWidth="2"
																						strokeLinecap="round"
																						strokeLinejoin="round"
																						aria-hidden="true"
																						className="shrink-0"
																					>
																						<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
																						<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
																					</svg>
																					<span>Editar</span>
																				</button>
																				<button
																					type="button"
																					role="menuitem"
																					data-testid={`delete-${comment._id}`}
																					onClick={() => {
																						setOpenMenuId(null);
																						handleDelete(comment._id);
																					}}
																					className="flex w-full items-center gap-2 text-left px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-none bg-transparent cursor-pointer"
																				>
																					<svg
																						width="14"
																						height="14"
																						viewBox="0 0 24 24"
																						fill="none"
																						stroke="currentColor"
																						strokeWidth="2"
																						strokeLinecap="round"
																						strokeLinejoin="round"
																						aria-hidden="true"
																						className="shrink-0"
																					>
																						<polyline points="3 6 5 6 21 6" />
																						<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
																					</svg>
																					<span>Excluir</span>
																				</button>
																			</>
																		) : (
																			<button
																				type="button"
																				role="menuitem"
																				data-testid={`report-${comment._id}`}
																				onClick={() => {
																					setOpenMenuId(null);
																					handleReport(comment._id);
																				}}
																				className="flex w-full items-center gap-2 text-left px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-red-500 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-none bg-transparent cursor-pointer"
																			>
																				<svg
																					width="14"
																					height="14"
																					viewBox="0 0 24 24"
																					fill="none"
																					stroke="currentColor"
																					strokeWidth="2"
																					strokeLinecap="round"
																					strokeLinejoin="round"
																					aria-hidden="true"
																					className="shrink-0"
																				>
																					<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
																					<line x1="4" y1="22" x2="4" y2="15" />
																				</svg>
																				<span>Reportar</span>
																			</button>
																		)}
																	</div>
																</>
															)}
														</div>
													)}
												</div>
											</div>
										);
									})}
									{hasOthersToggle && !othersExpanded && (
										<button
											type="button"
											data-testid="show-other-comments"
											onClick={() => setOthersExpanded(true)}
											className="block w-full mt-2 text-[12px] font-medium text-slate-500 dark:text-slate-400 hover:text-brand py-2"
										>
											Ver outros comentários ({hiddenOthersCount})
										</button>
									)}
								</div>
							)}
						</div>
					</aside>
				)}
			</div>

			{showTutorial && (
				<Tutorial
					steps={CHAPTER_TUTORIAL}
					onFinished={() => {
						tutorial.markCompleted();
						// Strip ?tour=1 so a refresh after dismiss doesn't reopen it.
						if (forceTour && typeof window !== "undefined") {
							const url = new URL(window.location.href);
							url.searchParams.delete("tour");
							window.history.replaceState(null, "", url.toString());
						}
					}}
				/>
			)}
		</div>
	);
}
