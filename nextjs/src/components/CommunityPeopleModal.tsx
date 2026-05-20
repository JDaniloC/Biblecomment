"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Modal from "@/components/Modal";
import { communityService } from "@/services/communities";

interface Person {
	userId: string;
	username: string | null;
	subtitle?: string | null;
}

interface Props {
	slug: string;
	mode: "members" | "followers" | null;
	onClose: () => void;
}

/**
 * Lists either the approved members or the followers of a community.
 *
 * Why a single component for both modes: the row layout is identical
 * (avatar-less link to @username + optional secondary line), only the
 * data source + title differ. Keeping it one component prevents the
 * visual treatments from drifting apart over time.
 */
export function CommunityPeopleModal({ slug, mode, onClose }: Props) {
	const [items, setItems] = useState<Person[]>([]);
	const [loading, setLoading] = useState(false);
	const [filter, setFilter] = useState("");

	useEffect(() => {
		if (!mode) return;
		let cancelled = false;
		setLoading(true);
		setItems([]);
		setFilter("");
		(async () => {
			try {
				if (mode === "members") {
					const list = await communityService.listMembers(slug);
					if (cancelled) return;
					setItems(
						list.map((m) => ({
							userId: m.userId,
							username: m.username,
							subtitle: m.isCreator
								? "Criadora"
								: m.role === "moderator"
									? "Moderador"
									: null,
						})),
					);
				} else {
					const list = await communityService.listFollowers(slug);
					if (cancelled) return;
					setItems(
						list.map((f) => ({
							userId: f.userId,
							username: f.username,
							subtitle: null,
						})),
					);
				}
			} catch {
				/* errors render as "lista vazia" — non-critical UI */
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [mode, slug]);

	const filtered =
		filter.trim() === ""
			? items
			: items.filter((p) =>
					(p.username ?? "").toLowerCase().includes(filter.trim().toLowerCase()),
				);

	const title =
		mode === "members"
			? "Membros aprovados"
			: mode === "followers"
				? "Seguidores"
				: "";

	return (
		<Modal show={mode !== null} onClose={onClose} title={title} size="md">
			<div className="flex flex-col gap-3" data-testid="community-people-modal">
				{items.length > 0 && (
					<input
						type="search"
						value={filter}
						onChange={(e) => setFilter(e.target.value)}
						placeholder="Filtrar por @usuário…"
						aria-label="Filtrar lista"
						data-testid="community-people-filter"
						className="w-full px-3 py-1.5 rounded-md text-sm border border-slate-200 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand"
					/>
				)}
				{loading ? (
					<p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">
						Carregando…
					</p>
				) : items.length === 0 ? (
					<p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">
						{mode === "members"
							? "Nenhum membro aprovado ainda."
							: "Ninguém segue esta comunidade ainda."}
					</p>
				) : filtered.length === 0 ? (
					<p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">
						Nenhum @usuário casa com o filtro.
					</p>
				) : (
					<ul className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto">
						{filtered.map((p) => (
							<li
								key={p.userId}
								className="flex items-center justify-between gap-3 py-2 px-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800"
								data-testid={`community-person-${p.userId}`}
							>
								{p.username ? (
									<Link
										href={`/u/${p.username}`}
										onClick={onClose}
										className="text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-brand truncate"
									>
										@{p.username}
									</Link>
								) : (
									<span className="text-sm text-slate-400 dark:text-slate-500">
										(usuário removido)
									</span>
								)}
								{p.subtitle && (
									<span
										className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${
											p.subtitle === "Criadora"
												? "bg-brand-tint text-brand"
												: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
										}`}
									>
										{p.subtitle}
									</span>
								)}
							</li>
						))}
					</ul>
				)}
			</div>
		</Modal>
	);
}
