"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useNotification } from "@/contexts/NotificationContext";
import { discussionsService } from "@/services/discussions";
import Loading from "@/components/Loading";
import { DiscussionCard } from "@/components/DiscussionCard";
import { AppHeader } from "@/components/AppHeader";
import { PageTutorial } from "@/components/Tutorial/PageTutorial";
import {
	DISCUSSIONS_TUTORIAL,
	DISCUSSIONS_TUTORIAL_NAME,
} from "@/lib/tutorial-config";

interface SessionUser {
	name: string;
	email: string;
	username: string;
	moderator: boolean;
}

interface DiscussionSummary {
	_id: string;
	title?: string;
	question: string;
	username: string;
	bookAbbrev: string;
	verseReference: string;
	answersCount: number;
	createdAt: string;
	authorEmailVerified?: boolean;
	likeCount?: number;
}

export default function DiscussionsClient({
	user,
	tutorialAlreadyCompleted = false,
	books = [],
}: {
	user: SessionUser;
	tutorialAlreadyCompleted?: boolean;
	books?: Array<{ abbrev: string; name: string }>;
}) {
	const { handleNotification } = useNotification();
	const [discussions, setDiscussions] = useState<DiscussionSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(true);
	const [sort, setSort] = useState<"recent" | "active" | "liked">("recent");
	const [q, setQ] = useState("");
	const [bookAbbrev, setBookAbbrev] = useState("");

	// Every fetch passes the CURRENT sort/q/book explicitly so we never read a
	// stale closure (the debounce + immediate reloads call with fresh args).
	const load = useCallback(
		async (
			p: number,
			sortArg: "recent" | "active" | "liked" = sort,
			qArg: string = q,
			bookArg: string = bookAbbrev,
		) => {
			setLoading(true);
			try {
				const data = (await discussionsService.listAll(
					p,
					sortArg,
					qArg,
					bookArg,
				)) as unknown as DiscussionSummary[];
				if (p === 1) setDiscussions(data);
				else setDiscussions((prev) => [...prev, ...data]);
				setHasMore(data.length >= 5);
			} catch {
				handleNotification("error", "Erro ao carregar discussões.");
			} finally {
				setLoading(false);
			}
		},
		[handleNotification, sort, q, bookAbbrev],
	);

	// Single reload path for sort + book changes (and the initial mount).
	// Switching sort or book resets to page 1 and replaces the list. We pass q
	// through so an active search survives a sort/book change.
	useEffect(() => {
		load(1, sort, q, bookAbbrev);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sort, bookAbbrev]);

	// Debounced search. Keyed on `q` only. We skip the very first render so the
	// mount fetch above isn't duplicated by an identical empty-query reload.
	const firstQRender = useRef(true);
	useEffect(() => {
		if (firstQRender.current) {
			firstQRender.current = false;
			return;
		}
		const handle = setTimeout(() => {
			setPage(1);
			load(1, sort, q, bookAbbrev);
		}, 300);
		return () => clearTimeout(handle);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [q]);

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-slate-950">
			<AppHeader user={user} />

			<main id="main-content" className="max-w-3xl mx-auto px-4 py-6">
				<h1 className="font-semibold text-2xl text-gray-800 dark:text-slate-100 mb-6">
					Discussões
				</h1>
				<div className="flex flex-col sm:flex-row gap-2 mb-4">
					<input
						data-testid="discussions-search"
						type="search"
						value={q}
						onChange={(e) => setQ(e.target.value)}
						placeholder="Buscar discussões…"
						className="flex-1 px-3 py-1.5 rounded-full text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-transparent focus:border-brand focus:outline-none"
					/>
					<select
						data-testid="discussions-book-filter"
						value={bookAbbrev}
						onChange={(e) => {
							// Updating bookAbbrev triggers the [sort, bookAbbrev]
							// effect, which reloads page 1 with the current q — so we
							// just reset page here and let the effect do the fetch
							// (avoids a duplicate request).
							setBookAbbrev(e.target.value);
							setPage(1);
						}}
						className="px-3 py-1.5 rounded-full text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-transparent focus:border-brand focus:outline-none"
					>
						<option value="">Todos os livros</option>
						{books.map((b) => (
							<option key={b.abbrev} value={b.abbrev}>
								{b.name}
							</option>
						))}
					</select>
				</div>
				<div data-testid="discussions-sort" className="flex gap-1 mb-4">
					{(
						[
							["recent", "Recentes"],
							["active", "Mais ativas"],
							["liked", "Mais curtidas"],
						] as const
					).map(([value, label]) => (
						<button
							key={value}
							type="button"
							data-testid={`sort-${value}`}
							aria-pressed={sort === value}
							onClick={() => {
								setSort(value);
								setPage(1);
							}}
							className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
								sort === value
									? "bg-brand text-white"
									: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
							}`}
						>
							{label}
						</button>
					))}
				</div>
				<div data-tour="discussions-list">
					{loading && discussions.length === 0 ? (
						<Loading />
					) : discussions.length === 0 ? (
						<div className="text-center text-gray-400 dark:text-slate-500 py-10">
							Nenhuma discussão encontrada.
						</div>
					) : (
						<div className="space-y-4">
							{discussions.map((d) => (
								<DiscussionCard
									key={d._id}
									data={{
										_id: d._id,
										abbrev: d.bookAbbrev,
										title: d.title,
										question: d.question,
										username: d.username,
										verseReference: d.verseReference,
										answersCount: d.answersCount,
										createdAt: d.createdAt,
										authorEmailVerified: d.authorEmailVerified,
										likeCount: d.likeCount,
									}}
								/>
							))}

							{hasMore && !loading && (
								<button
									onClick={() => {
										const next = page + 1;
										setPage(next);
										load(next, sort, q, bookAbbrev);
									}}
									className="w-full mt-2 text-sm text-brand hover:underline py-2"
								>
									Carregar mais
								</button>
							)}
							{loading && <Loading />}
						</div>
					)}
				</div>
			</main>

			<PageTutorial
				name={DISCUSSIONS_TUTORIAL_NAME}
				steps={DISCUSSIONS_TUTORIAL}
				enabled={Boolean(user)}
				alreadyCompleted={tutorialAlreadyCompleted}
			/>
		</div>
	);
}
