import Link from "next/link";
import { formatRelativeDate } from "@/lib/relative-date";
import { VerifiedBadge } from "@/components/VerifiedBadge";

export interface DiscussionCardData {
	_id: string;
	/** Book abbrev — usado para montar o href do detalhe. */
	abbrev: string;
	title?: string;
	/** Corpo da discussão (também serve de snippet). */
	question: string;
	username: string;
	verseReference: string;
	answersCount: number;
	createdAt: string | Date;
	/** Opcional (Fase 2). */
	authorEmailVerified?: boolean;
	/** Opcional (Fase 2). */
	likeCount?: number;
}

/**
 * Card único reusado pelas 3 listas de discussão (global, por livro, por
 * comentário). Mantém o `data-testid="discussion-card"` que os specs já usam.
 */
export function DiscussionCard({ data }: { data: DiscussionCardData }) {
	const hasTitle = Boolean(data.title?.trim());
	return (
		<Link
			href={`/discussion/${data.abbrev}/${data._id}`}
			data-testid="discussion-card"
			className="block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-brand transition"
		>
			<div className="text-xs text-brand font-medium mb-1">
				{data.verseReference}
			</div>
			<p className="text-sm font-semibold text-gray-800 dark:text-slate-100 mb-1">
				{hasTitle ? data.title : data.question}
			</p>
			{hasTitle && (
				<p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">
					{data.question}
				</p>
			)}
			<div className="flex items-center justify-between text-xs text-gray-400 dark:text-slate-500">
				<span className="inline-flex items-center gap-1">
					por {data.username}
					{data.authorEmailVerified && <VerifiedBadge verified size="xs" />}
				</span>
				<span className="inline-flex items-center gap-2 whitespace-nowrap">
					{typeof data.likeCount === "number" && (
						<span
							data-testid="discussion-card-likes"
							className="inline-flex items-center gap-1"
						>
							<svg
								width="11"
								height="11"
								viewBox="0 0 24 24"
								fill="currentColor"
								aria-hidden="true"
							>
								<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
							</svg>
							{data.likeCount}
						</span>
					)}
					<span data-testid="discussion-card-date">
						{formatRelativeDate(data.createdAt)}
					</span>
					<span aria-hidden="true">·</span>
					<span>
						{data.answersCount} resposta{data.answersCount !== 1 ? "s" : ""}
					</span>
				</span>
			</div>
		</Link>
	);
}
