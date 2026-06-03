"use client";

import { useState, useEffect, useCallback } from "react";
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
}: {
	user: SessionUser;
	tutorialAlreadyCompleted?: boolean;
}) {
	const { handleNotification } = useNotification();
	const [discussions, setDiscussions] = useState<DiscussionSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(true);

	const load = useCallback(
		async (p: number) => {
			setLoading(true);
			try {
				const data = (await discussionsService.listAll(
					p,
				)) as unknown as DiscussionSummary[];
				if (p === 1) setDiscussions(data);
				else setDiscussions((prev) => [...prev, ...data]);
				if (data.length < 5) setHasMore(false);
			} catch {
				handleNotification("error", "Erro ao carregar discussões.");
			} finally {
				setLoading(false);
			}
		},
		[handleNotification],
	);

	useEffect(() => {
		load(1);
	}, [load]);

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-slate-950">
			<AppHeader user={user} />

			<main id="main-content" className="max-w-3xl mx-auto px-4 py-6">
				<h1 className="font-semibold text-2xl text-gray-800 dark:text-slate-100 mb-6">
					Discussões
				</h1>
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
										load(next);
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
