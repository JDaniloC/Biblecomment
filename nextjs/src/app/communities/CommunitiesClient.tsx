"use client";

import { useState, useCallback, useEffect } from "react";
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

interface Props {
	initialItems: Community[];
	initialTotal: number;
	viewer: ViewerSession | null;
}

export default function CommunitiesClient({
	initialItems,
	initialTotal,
	viewer,
}: Props) {
	const { handleNotification } = useNotification();
	const [items, setItems] = useState<Community[]>(initialItems);
	const [total, setTotal] = useState(initialTotal);
	const [page, setPage] = useState(1);
	const [query, setQuery] = useState("");
	const [loading, setLoading] = useState(false);

	const search = useCallback(
		async (q: string) => {
			setLoading(true);
			try {
				const res = await communityService.list({ page: 1, q });
				setItems(res.items);
				setTotal(res.total);
				setPage(1);
			} catch {
				handleNotification("error", "Erro ao buscar comunidades.");
			} finally {
				setLoading(false);
			}
		},
		[handleNotification],
	);

	// Debounce the query: cancel pending fetches when the user keeps typing.
	useEffect(() => {
		const trimmed = query.trim();
		if (trimmed.length === 0 && items === initialItems) return;
		const handle = setTimeout(() => {
			search(trimmed);
		}, 250);
		return () => clearTimeout(handle);
		// We only re-run when the query string changes; the rest is stable.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query]);

	async function loadMore() {
		if (loading || items.length >= total) return;
		setLoading(true);
		try {
			const next = page + 1;
			const res = await communityService.list({ page: next, q: query.trim() });
			setItems((prev) => [...prev, ...res.items]);
			setPage(next);
		} catch {
			handleNotification("error", "Erro ao carregar mais comunidades.");
		} finally {
			setLoading(false);
		}
	}

	const hasMore = items.length < total;

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-slate-950">
			<AppHeader user={viewer} loginCallbackUrl="/communities" />

			<main id="main-content" className="max-w-3xl mx-auto px-4 py-6">
				<header className="flex flex-wrap items-center justify-between gap-3 mb-5">
					<div>
						<h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
							Comunidades
						</h1>
						<p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
							{total} {total === 1 ? "comunidade" : "comunidades"}
						</p>
					</div>
					{viewer && (
						<Link
							href="/communities/new"
							data-testid="community-create-link"
							className="bg-brand text-white font-semibold text-sm px-4 py-2 rounded-md hover:bg-brand/90 transition"
						>
							Criar comunidade
						</Link>
					)}
				</header>

				<input
					type="search"
					placeholder="Buscar por nome ou identificador…"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					data-testid="community-search-input"
					className="w-full mb-5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
				/>

				{items.length === 0 ? (
					<p
						data-testid="communities-empty"
						className="text-center text-sm text-slate-400 dark:text-slate-500 py-10"
					>
						Nenhuma comunidade encontrada.
					</p>
				) : (
					<ul
						data-testid="communities-list"
						className="grid grid-cols-1 sm:grid-cols-2 gap-3"
					>
						{items.map((c) => (
							<li key={c.slug}>
								<Link
									href={`/communities/${c.slug}`}
									data-testid={`community-card-${c.slug}`}
									className="block p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-brand transition"
								>
									<h2 className="font-semibold text-slate-800 dark:text-slate-100 truncate">
										{c.name}
									</h2>
									<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
										/{c.slug} · {c.memberCount}{" "}
										{c.memberCount === 1 ? "membro" : "membros"} ·{" "}
										{c.followerCount}{" "}
										{c.followerCount === 1 ? "seguidor" : "seguidores"}
									</p>
									{c.description && (
										<p className="text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">
											{c.description}
										</p>
									)}
								</Link>
							</li>
						))}
					</ul>
				)}

				{hasMore && (
					<div className="flex justify-center mt-5">
						<button
							type="button"
							onClick={loadMore}
							disabled={loading}
							data-testid="communities-load-more"
							className="text-sm font-semibold px-4 py-2 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
						>
							{loading ? "Carregando…" : "Carregar mais"}
						</button>
					</div>
				)}
			</main>
		</div>
	);
}
