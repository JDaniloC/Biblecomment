"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { communityService } from "@/services/communities";
import { useNotification } from "@/contexts/NotificationContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import type { Community } from "@/domain/entities/Community";

type CommunityTab =
	| "comentarios"
	| "membros"
	| "seguidores"
	| "solicitacoes"
	| "configuracoes";

// Tab label is the user-facing string; the id key stays a-z slug for
// stable data-testid / aria-labelledby selectors.

/**
 * Underline-style tab trigger — mirrors the public profile tab UX
 * (PublicProfileClient.tsx) so the visual language stays consistent
 * across the app. Count is rendered as a soft chip; `highlightCount`
 * flips it amber when there's pending moderator work to do.
 */
function TabButton({
	id,
	label,
	count,
	highlightCount = false,
	active,
	onSelect,
}: {
	id: CommunityTab;
	label: string;
	count?: number;
	highlightCount?: boolean;
	active: CommunityTab;
	onSelect: (id: CommunityTab) => void;
}) {
	const selected = active === id;
	return (
		<button
			type="button"
			role="tab"
			id={`community-tab-${id}`}
			aria-selected={selected}
			data-testid={`community-tab-${id}`}
			onClick={() => onSelect(id)}
			className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition flex items-center gap-2 ${
				selected
					? "border-brand text-brand"
					: "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
			}`}
		>
			<span>{label}</span>
			{typeof count === "number" && (
				<span
					className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
						highlightCount
							? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
							: selected
								? "bg-brand/10 text-brand"
								: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
					}`}
				>
					{count}
				</span>
			)}
		</button>
	);
}

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
}: Props) {
	const { handleNotification } = useNotification();
	const confirm = useConfirm();
	const router = useRouter();
	type Status = "none" | "pending" | "approved";
	const [status, setStatus] = useState<Status>(
		initialIsMember ? "approved" : "none",
	);
	const [role, setRole] = useState<"member" | "moderator">("member");
	const [memberCount, setMemberCount] = useState(community.memberCount);
	const [busy, setBusy] = useState(false);
	const [activeTab, setActiveTab] = useState<CommunityTab>("comentarios");
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
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [viewer, community.slug]);

	// Follow is orthogonal to membership (plan_community follow-up). Resolve
	// the follow flag separately so the "Seguir/Seguindo" toggle reflects
	// the viewer's actual state on first paint after hydration.
	const [following, setFollowing] = useState(false);
	const [followBusy, setFollowBusy] = useState(false);
	const [followerCount, setFollowerCount] = useState(community.followerCount);
	useEffect(() => {
		if (!viewer) return;
		let cancelled = false;
		communityService
			.myFollowStatus(community.slug)
			.then((r) => {
				if (!cancelled) setFollowing(r.following);
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [viewer, community.slug]);

	// Approved members list. Endpoint is public on purpose (the header
	// already exposes "N membros" and the slug is public — names are not
	// sensitive), so we fetch it for everyone now that the Membros tab
	// renders the roster regardless of viewer role. Mod toggle stays
	// gated to the creator below.
	const [members, setMembers] = useState<
		{
			userId: string;
			username: string | null;
			role: "member" | "moderator";
			isCreator: boolean;
			joinedAt: string | null;
		}[]
	>([]);
	useEffect(() => {
		let cancelled = false;
		communityService
			.listMembers(community.slug)
			.then((list) => {
				if (!cancelled) setMembers(list);
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [community.slug]);

	// Followers roster — same public-endpoint reasoning as members. Used
	// to render the Seguidores tab and the header counter.
	const [followers, setFollowers] = useState<
		{ userId: string; username: string | null; followedAt: string | null }[]
	>([]);
	useEffect(() => {
		let cancelled = false;
		communityService
			.listFollowers(community.slug)
			.then((list) => {
				if (!cancelled) setFollowers(list);
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [community.slug]);

	async function handleDeleteCommunity() {
		if (busy) return;
		const ok = await confirm({
			title: `Excluir a comunidade "${community.name}"?`,
			description:
				"Esta ação é irreversível. Os vínculos de membros e seguidores serão removidos, e a página da comunidade deixará de existir. Os comentários dos integrantes permanecem em seus versículos, mas perdem a priorização desta comunidade.",
			confirmLabel: "Excluir comunidade",
			variant: "danger",
		});
		if (!ok) return;
		setBusy(true);
		try {
			await communityService.delete(community.slug);
			handleNotification("success", "Comunidade excluída.");
			router.push("/communities");
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Erro ao excluir.";
			handleNotification("error", msg);
			setBusy(false);
		}
	}

	async function handleToggleModerator(userId: string, currentlyMod: boolean) {
		if (busy) return;
		setBusy(true);
		// Optimistic — flip the badge locally; revert on failure.
		setMembers((prev) =>
			prev.map((m) =>
				m.userId === userId
					? { ...m, role: currentlyMod ? "member" : "moderator" }
					: m,
			),
		);
		try {
			await communityService.setModerator(
				community.slug,
				userId,
				!currentlyMod,
			);
		} catch {
			setMembers((prev) =>
				prev.map((m) =>
					m.userId === userId
						? { ...m, role: currentlyMod ? "moderator" : "member" }
						: m,
				),
			);
			handleNotification(
				"error",
				"Não foi possível atualizar o papel desse membro.",
			);
		} finally {
			setBusy(false);
		}
	}

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
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [role, isCreator, viewer, community.slug]);
	const [comments, setComments] = useState(initialComments);
	const [commentsTotal, setCommentsTotal] = useState(initialCommentsTotal);
	const [commentsPage, setCommentsPage] = useState(1);
	const [loadingMore, setLoadingMore] = useState(false);

	// Search bar over the community's comments (plan_community follow-up).
	// Debounce server hits — typing "joão" shouldn't fire 4 requests.
	const [commentQuery, setCommentQuery] = useState("");
	const [activeQuery, setActiveQuery] = useState("");
	useEffect(() => {
		const t = setTimeout(() => setActiveQuery(commentQuery.trim()), 250);
		return () => clearTimeout(t);
	}, [commentQuery]);

	// Re-query page 1 whenever the active query changes. We intentionally
	// skip the initial render (activeQuery=="" matches SSR-seeded list).
	const didMount = useRef(false);
	useEffect(() => {
		if (!didMount.current) {
			didMount.current = true;
			return;
		}
		let cancelled = false;
		const qs = new URLSearchParams({ page: "1" });
		if (activeQuery) qs.set("q", activeQuery);
		fetch(`/api/communities/${community.slug}/comments?${qs}`)
			.then((r) => (r.ok ? r.json() : Promise.reject(r)))
			.then((json: { items: CommunityCommentItem[]; total: number }) => {
				if (cancelled) return;
				setComments(json.items);
				setCommentsTotal(json.total);
				setCommentsPage(1);
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [activeQuery, community.slug]);

	async function loadMoreComments() {
		if (loadingMore || comments.length >= commentsTotal) return;
		setLoadingMore(true);
		try {
			const next = commentsPage + 1;
			const qs = new URLSearchParams({ page: String(next) });
			if (activeQuery) qs.set("q", activeQuery);
			const res = await fetch(
				`/api/communities/${community.slug}/comments?${qs}`,
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
			// `changed` is false when the membership was already approved (e.g.
			// rapid double-click) — only bump the optimistic counter on a real
			// flip so the UI doesn't drift away from the server's truth
			// (Copilot review on PR #205).
			const { changed } = await communityService.approve(
				community.slug,
				userId,
			);
			setPending((prev) => prev.filter((r) => r.userId !== userId));
			if (changed) setMemberCount((c) => c + 1);
		} catch {
			handleNotification("error", "Erro ao aprovar.");
		} finally {
			setBusy(false);
		}
	}

	async function handleToggleFollow() {
		if (!viewer || followBusy) return;
		setFollowBusy(true);
		const wasFollowing = following;
		// Optimistic — flip locally; revert on failure.
		setFollowing(!wasFollowing);
		setFollowerCount((n) => (wasFollowing ? Math.max(0, n - 1) : n + 1));
		try {
			if (wasFollowing) await communityService.unfollow(community.slug);
			else await communityService.follow(community.slug);
		} catch {
			setFollowing(wasFollowing);
			setFollowerCount((n) => (wasFollowing ? n + 1 : Math.max(0, n - 1)));
			handleNotification("error", "Não foi possível atualizar o follow.");
		} finally {
			setFollowBusy(false);
		}
	}

	// Per-tab @username filters. Tiny lists (tens of rows) → client-side
	// substring match. Independent so switching tabs doesn't surprise the
	// user with a leftover filter from another tab.
	const [pendingFilter, setPendingFilter] = useState("");
	const [memberFilter, setMemberFilter] = useState("");
	const [followerFilter, setFollowerFilter] = useState("");
	const filteredPending = useMemo(
		() =>
			pendingFilter.trim() === ""
				? pending
				: pending.filter((r) =>
						(r.username ?? "")
							.toLowerCase()
							.includes(pendingFilter.trim().toLowerCase()),
					),
		[pending, pendingFilter],
	);
	const filteredMembers = useMemo(
		() =>
			memberFilter.trim() === ""
				? members
				: members.filter((m) =>
						(m.username ?? "")
							.toLowerCase()
							.includes(memberFilter.trim().toLowerCase()),
					),
		[members, memberFilter],
	);
	const filteredFollowers = useMemo(
		() =>
			followerFilter.trim() === ""
				? followers
				: followers.filter((f) =>
						(f.username ?? "")
							.toLowerCase()
							.includes(followerFilter.trim().toLowerCase()),
					),
		[followers, followerFilter],
	);

	const isModerator = role === "moderator" || isCreator;

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
			<AppHeader
				user={viewer}
				loginCallbackUrl={`/communities/${community.slug}`}
			/>

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
								{/* Counter pills now jump to the corresponding tab instead
								    of opening a modal — same destination, less chrome. */}
								<button
									type="button"
									onClick={() => setActiveTab("membros")}
									data-testid="open-members-modal"
									className="hover:text-brand underline-offset-2 hover:underline cursor-pointer"
								>
									<span data-testid="community-member-count">
										{memberCount}
									</span>{" "}
									{memberCount === 1 ? "membro" : "membros"}
								</button>
								{" · "}
								<button
									type="button"
									onClick={() => setActiveTab("seguidores")}
									data-testid="open-followers-modal"
									className="hover:text-brand underline-offset-2 hover:underline cursor-pointer"
								>
									<span data-testid="community-follower-count">
										{followerCount}
									</span>{" "}
									{followerCount === 1 ? "seguidor" : "seguidores"}
								</button>
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
						{viewer && (
							<div className="flex flex-col items-end gap-2 flex-shrink-0">
								{/* Follow is independent from membership — anyone can follow,
                    no moderation hop. Membership controls whose comments
                    are exhibited on this page (see CommunityCommentsList). */}
								<button
									type="button"
									onClick={handleToggleFollow}
									disabled={followBusy}
									data-testid="community-follow-toggle"
									data-following={following ? "true" : "false"}
									className={`text-sm font-semibold px-4 py-2 rounded-md transition disabled:opacity-60 ${
										following
											? "border border-brand text-brand hover:bg-brand/10"
											: "bg-brand text-white hover:bg-brand/90"
									}`}
								>
									{following ? "Seguindo" : "Seguir"}
								</button>
								{!isCreator && (
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
												status === "none"
													? handleRequestJoin
													: handleCancelOrLeave
											}
											disabled={busy}
											className={`text-sm font-semibold px-3 py-1.5 rounded-md transition disabled:opacity-60 ${
												status === "none"
													? "border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-brand hover:text-brand"
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

				<nav
					role="tablist"
					aria-label="Seções da comunidade"
					className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-700 mb-5"
				>
					<TabButton
						id="comentarios"
						label="Comentários"
						count={commentsTotal}
						active={activeTab}
						onSelect={setActiveTab}
					/>
					<TabButton
						id="membros"
						label="Membros"
						count={memberCount}
						active={activeTab}
						onSelect={setActiveTab}
					/>
					<TabButton
						id="seguidores"
						label="Seguidores"
						count={followerCount}
						active={activeTab}
						onSelect={setActiveTab}
					/>
					{isModerator && viewer && (
						<TabButton
							id="solicitacoes"
							label="Solicitações"
							count={pending.length}
							highlightCount={pending.length > 0}
							active={activeTab}
							onSelect={setActiveTab}
						/>
					)}
					{isCreator && (
						<TabButton
							id="configuracoes"
							label="Configurações"
							active={activeTab}
							onSelect={setActiveTab}
						/>
					)}
				</nav>

				{activeTab === "comentarios" && (
					<section
						role="tabpanel"
						aria-labelledby="community-tab-discussao"
						data-testid="community-comments"
					>
						<div className="flex flex-wrap items-center justify-between gap-3 mb-3">
							<input
								type="search"
								value={commentQuery}
								onChange={(e) => setCommentQuery(e.target.value)}
								placeholder="Buscar nos comentários…"
								aria-label="Buscar nos comentários da comunidade"
								data-testid="community-comments-search"
								className="flex-1 min-w-[180px] max-w-[260px] px-3 py-1.5 rounded-md text-sm border border-slate-200 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand"
							/>
						</div>

						{comments.length === 0 ? (
							<p
								data-testid="community-comments-empty"
								className="text-center text-sm text-slate-400 dark:text-slate-500 py-8"
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
											href={refToHref(
												c.bookReference,
												`/communities/${community.slug}`,
											)}
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
				)}

				{activeTab === "membros" && (
					<section
						role="tabpanel"
						aria-labelledby="community-tab-membros"
						data-testid="community-members"
					>
						{members.length > 0 && (
							<input
								type="search"
								value={memberFilter}
								onChange={(e) => setMemberFilter(e.target.value)}
								placeholder="Filtrar por @usuário…"
								aria-label="Filtrar membros"
								data-testid="community-members-filter"
								className="w-full mb-3 px-3 py-1.5 rounded-md text-sm border border-slate-200 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand"
							/>
						)}
						{members.length === 0 ? (
							<p className="text-center text-sm text-slate-400 dark:text-slate-500 py-8">
								Nenhum membro aprovado ainda.
							</p>
						) : filteredMembers.length === 0 ? (
							<p className="text-center text-sm text-slate-400 dark:text-slate-500 py-8">
								Nenhum @usuário casa com o filtro.
							</p>
						) : (
							<ul className="flex flex-col">
								{filteredMembers.map((m) => {
									const mod = m.role === "moderator";
									return (
										<li
											key={m.userId}
											data-testid={`community-member-${m.userId}`}
											className="flex items-center justify-between gap-3 py-3 px-1 border-b border-slate-100 dark:border-slate-800 last:border-0"
										>
											<div className="flex items-center gap-2 min-w-0">
												{m.username ? (
													<Link
														href={`/u/${m.username}`}
														className="text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-brand truncate"
													>
														@{m.username}
													</Link>
												) : (
													<span className="text-sm text-slate-400 dark:text-slate-500">
														(usuário removido)
													</span>
												)}
												{m.isCreator && (
													<span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-brand-tint text-brand">
														Criadora
													</span>
												)}
												{mod && !m.isCreator && (
													<span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
														Moderador
													</span>
												)}
											</div>
											{/* Creator's row is non-toggleable — by convention they're
                        always a moderator and the SetModerator use-case
                        rejects creator self-edits anyway. Toggle only
                        renders for the community creator viewer. */}
											{isCreator && !m.isCreator && (
												<button
													type="button"
													onClick={() => handleToggleModerator(m.userId, mod)}
													disabled={busy}
													data-testid={`toggle-mod-${m.userId}`}
													className={`text-xs font-semibold px-3 py-1.5 rounded-md transition disabled:opacity-60 ${
														mod
															? "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-300 hover:border-red-200 dark:hover:border-red-900/60"
															: "bg-brand text-white hover:bg-brand/90"
													}`}
												>
													{mod ? "Remover moderador" : "Tornar moderador"}
												</button>
											)}
										</li>
									);
								})}
							</ul>
						)}
					</section>
				)}

				{activeTab === "seguidores" && (
					<section
						role="tabpanel"
						aria-labelledby="community-tab-seguidores"
						data-testid="community-followers"
					>
						{followers.length > 0 && (
							<input
								type="search"
								value={followerFilter}
								onChange={(e) => setFollowerFilter(e.target.value)}
								placeholder="Filtrar por @usuário…"
								aria-label="Filtrar seguidores"
								data-testid="community-followers-filter"
								className="w-full mb-3 px-3 py-1.5 rounded-md text-sm border border-slate-200 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand"
							/>
						)}
						{followers.length === 0 ? (
							<p className="text-center text-sm text-slate-400 dark:text-slate-500 py-8">
								Ninguém segue esta comunidade ainda.
							</p>
						) : filteredFollowers.length === 0 ? (
							<p className="text-center text-sm text-slate-400 dark:text-slate-500 py-8">
								Nenhum @usuário casa com o filtro.
							</p>
						) : (
							<ul className="flex flex-col">
								{filteredFollowers.map((f) => (
									<li
										key={f.userId}
										data-testid={`community-follower-${f.userId}`}
										className="flex items-center gap-3 py-3 px-1 border-b border-slate-100 dark:border-slate-800 last:border-0"
									>
										{f.username ? (
											<Link
												href={`/u/${f.username}`}
												className="text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-brand truncate"
											>
												@{f.username}
											</Link>
										) : (
											<span className="text-sm text-slate-400 dark:text-slate-500">
												(usuário removido)
											</span>
										)}
									</li>
								))}
							</ul>
						)}
					</section>
				)}

				{activeTab === "solicitacoes" && isModerator && viewer && (
					<section
						role="tabpanel"
						aria-labelledby="community-tab-solicitacoes"
						data-testid="community-moderation"
					>
						{pending.length > 0 && (
							<input
								type="text"
								value={pendingFilter}
								onChange={(e) => setPendingFilter(e.target.value)}
								placeholder="Filtrar por @usuário…"
								aria-label="Filtrar solicitações pendentes"
								data-testid="community-pending-filter"
								className="w-full mb-3 px-3 py-1.5 rounded-md text-sm border border-slate-200 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand"
							/>
						)}
						{pending.length === 0 ? (
							<p className="text-center text-sm text-slate-500 dark:text-slate-400 py-8">
								Nenhuma solicitação pendente.
							</p>
						) : filteredPending.length === 0 ? (
							<p className="text-center text-sm text-slate-500 dark:text-slate-400 py-8">
								Nenhum @usuário casa com o filtro.
							</p>
						) : (
							<ul className="flex flex-col">
								{filteredPending.map((r) => (
									<li
										key={r.userId}
										data-testid={`pending-request-${r.userId}`}
										className="flex items-center justify-between gap-3 py-3 px-1 border-b border-slate-100 dark:border-slate-800 last:border-0"
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

				{activeTab === "configuracoes" && isCreator && (
					<section
						role="tabpanel"
						aria-labelledby="community-tab-configuracoes"
						data-testid="community-danger-zone"
						className="border border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20 rounded-xl p-5"
					>
						<h3 className="text-base font-semibold text-red-700 dark:text-red-300 mb-1">
							Zona de risco
						</h3>
						<p className="text-sm text-slate-700 dark:text-slate-200 mb-3">
							Excluir esta comunidade remove a página, os pedidos de entrada, os
							membros aprovados e os seguidores. Os comentários ficam
							preservados nos versículos — apenas perdem a priorização desta
							comunidade.
						</p>
						<button
							type="button"
							onClick={handleDeleteCommunity}
							disabled={busy}
							data-testid="community-delete"
							className="text-sm font-semibold px-4 py-2 rounded-md border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition disabled:opacity-60"
						>
							Excluir comunidade
						</button>
					</section>
				)}
			</main>
		</div>
	);
}
