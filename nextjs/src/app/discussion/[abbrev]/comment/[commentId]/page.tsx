import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { MongoDiscussionRepository } from "@/infrastructure/repositories/MongoDiscussionRepository";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { MongoBookRepository } from "@/infrastructure/repositories/MongoBookRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { GetDiscussionsByCommentUseCase } from "@/application/use-cases/DiscussionUseCases";
import { AppHeader } from "@/components/AppHeader";
import { DiscussionCard } from "@/components/DiscussionCard";

type Params = { abbrev: string; commentId: string };

export default async function CommentDiscussionsPage({
	params,
}: {
	params: Promise<Params>;
}) {
	const session = await auth();
	if (!session?.user) redirect("/login");

	const { abbrev, commentId } = await params;

	const book = await new MongoBookRepository().findByAbbrev(abbrev);
	if (!book) redirect("/home");

	const comment = await new MongoCommentRepository().findById(commentId);
	if (!comment || !comment._id) redirect(`/discussion/${abbrev}`);
	// NOTE: `abbrev` and `commentId` are validated independently — we don't yet
	// cross-check that the comment actually belongs to `abbrev` (Comment has no
	// direct abbrev, only verseId/bookReference, so a clean check needs a
	// verse→book lookup). A mismatched URL still renders the right comment; only
	// the forwarded abbrev would be wrong. Tighten in a later phase if it matters.

	const useCase = new GetDiscussionsByCommentUseCase(
		new MongoDiscussionRepository(),
		new MongoUserRepository(),
	);
	const discussions = await useCase.execute(commentId);

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-slate-950">
			<AppHeader user={session.user} />

			<div className="max-w-3xl mx-auto px-4 pt-4">
				<Link
					href={`/discussion/${abbrev}`}
					className="text-brand hover:underline text-sm"
				>
					← Discussões
				</Link>
			</div>

			<main id="main-content" className="max-w-3xl mx-auto px-4 py-6 space-y-5">
				<section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
					<div className="flex items-center justify-between gap-2 mb-2">
						<p className="text-xs font-medium text-brand">
							{comment.bookReference}
						</p>
						<Link
							href={`/c/${comment._id}`}
							className="text-xs text-slate-400 dark:text-slate-500 hover:text-brand transition"
						>
							ver comentário →
						</Link>
					</div>
					<p
						data-testid="comment-snapshot"
						className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap"
					>
						{comment.text}
					</p>
					<p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
						por {comment.username}
					</p>
				</section>

				<div className="flex items-center justify-between gap-3">
					<h1 className="font-semibold text-lg text-slate-800 dark:text-slate-100">
						Discussões ({discussions.length})
					</h1>
					<Link
						href={`/discussion/${abbrev}/new?commentId=${comment._id}`}
						data-testid="new-discussion"
						className="bg-brand text-white font-semibold text-sm px-4 py-2 rounded-md hover:bg-brand/90 transition whitespace-nowrap"
					>
						+ Nova discussão
					</Link>
				</div>

				{discussions.length === 0 ? (
					<div
						data-testid="comment-discussions-empty"
						className="text-center py-12 px-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
					>
						<p className="text-slate-400 dark:text-slate-500 text-sm">
							Nenhuma discussão ainda.
						</p>
						<p className="text-slate-300 dark:text-slate-600 text-xs mt-1">
							Seja o primeiro a levantar um ponto sobre este comentário.
						</p>
					</div>
				) : (
					<div className="space-y-3" data-testid="discussion-list">
						{discussions.map((d) => (
							<DiscussionCard
								key={d._id}
								data={{
									_id: d._id ?? "",
									abbrev,
									title: d.title,
									question: d.question,
									username: d.username,
									verseReference: d.verseReference,
									answersCount: d.answersCount ?? 0,
									createdAt: d.createdAt ?? new Date(),
									authorEmailVerified: d.authorEmailVerified,
									likeCount: d.likeCount,
								}}
							/>
						))}
					</div>
				)}
			</main>
		</div>
	);
}
