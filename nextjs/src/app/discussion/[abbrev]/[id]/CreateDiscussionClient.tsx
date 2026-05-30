"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Book } from "@/domain/entities/Book";
import { discussionsService } from "@/services/discussions";
import { useNotification } from "@/contexts/NotificationContext";
import { AppHeader } from "@/components/AppHeader";

interface SessionUser {
	name: string;
	email: string;
	username: string;
	moderator: boolean;
}

interface SourceComment {
	id: string;
	text: string;
	/** Human reference, e.g. "alice JOHN 3:16". */
	reference: string;
}

const TITLE_MAX = 140;
const BODY_MAX = 1000;

/**
 * Render the comment text with an optional highlighted excerpt. Offsets are
 * character indexes into the plain text; rendering keeps the full text so the
 * reader always sees the whole comment, just with the chosen part marked.
 */
function renderWithHighlight(text: string, start?: number, end?: number) {
	if (
		typeof start !== "number" ||
		typeof end !== "number" ||
		start >= end ||
		start < 0 ||
		end > text.length
	) {
		return text;
	}
	return (
		<>
			{text.slice(0, start)}
			<mark className="bg-brand-soft text-inherit rounded px-0.5">
				{text.slice(start, end)}
			</mark>
			{text.slice(end)}
		</>
	);
}

interface Props {
	book: Book;
	user: SessionUser;
	sourceComment: SourceComment;
}

export default function CreateDiscussionClient({
	book,
	user,
	sourceComment,
}: Props) {
	const router = useRouter();
	const { handleNotification } = useNotification();
	const commentRef = useRef<HTMLParagraphElement>(null);
	const [title, setTitle] = useState("");
	const [body, setBody] = useState("");
	const [quoteStart, setQuoteStart] = useState<number | undefined>();
	const [quoteEnd, setQuoteEnd] = useState<number | undefined>();
	const [submitting, setSubmitting] = useState(false);

	/**
	 * Capture the current text selection inside the read-only comment as
	 * character offsets. Uses a pre-range over the whole node so the math is
	 * robust even after a previous highlight split the text into <mark> nodes.
	 */
	function captureSelection() {
		const node = commentRef.current;
		const sel = typeof window !== "undefined" ? window.getSelection() : null;
		if (!node || !sel || sel.rangeCount === 0 || sel.isCollapsed) {
			handleNotification(
				"error",
				"Selecione um trecho do comentário primeiro.",
			);
			return;
		}
		const range = sel.getRangeAt(0);
		if (
			!node.contains(range.startContainer) ||
			!node.contains(range.endContainer)
		) {
			handleNotification("error", "Selecione um trecho dentro do comentário.");
			return;
		}
		const pre = range.cloneRange();
		pre.selectNodeContents(node);
		pre.setEnd(range.startContainer, range.startOffset);
		const start = pre.toString().length;
		const end = start + range.toString().length;
		if (end <= start) return;
		setQuoteStart(start);
		setQuoteEnd(end);
		sel.removeAllRanges();
	}

	function clearSelection() {
		setQuoteStart(undefined);
		setQuoteEnd(undefined);
	}

	async function handleSubmit() {
		if (!title.trim() || !body.trim() || submitting) return;
		setSubmitting(true);
		try {
			const created = await discussionsService.createForBook(book.abbrev, {
				commentId: sourceComment.id,
				title: title.trim(),
				body,
				quoteStart,
				quoteEnd,
			});
			handleNotification("success", "Discussão criada.");
			router.push(`/discussion/${book.abbrev}/${created._id}`);
		} catch {
			handleNotification("error", "Erro ao criar discussão.");
			setSubmitting(false);
		}
	}

	const hasHighlight =
		typeof quoteStart === "number" && typeof quoteEnd === "number";

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-slate-950">
			<AppHeader user={user} />

			<div className="max-w-3xl mx-auto px-4 pt-4">
				<Link
					href={`/discussion/${book.abbrev}`}
					className="text-brand hover:underline text-sm"
				>
					← Discussões
				</Link>
			</div>

			<main id="main-content" className="max-w-3xl mx-auto px-4 py-6 space-y-5">
				<h1 className="font-semibold text-xl text-slate-800 dark:text-slate-100">
					Nova discussão
				</h1>

				{/* The comment being discussed — read-only snapshot. */}
				<section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
					<div className="flex items-center justify-between gap-2 mb-2">
						<p className="text-xs font-medium text-brand">
							{sourceComment.reference}
						</p>
						<Link
							href={`/c/${sourceComment.id}`}
							className="text-xs text-slate-400 dark:text-slate-500 hover:text-brand transition"
						>
							ver comentário →
						</Link>
					</div>
					<p
						ref={commentRef}
						data-testid="create-discussion-comment"
						className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap select-text"
					>
						{renderWithHighlight(sourceComment.text, quoteStart, quoteEnd)}
					</p>
					<div className="mt-3 flex flex-wrap items-center gap-2">
						<button
							type="button"
							onClick={captureSelection}
							data-testid="highlight-btn"
							className="text-xs font-medium text-brand border border-brand/40 rounded-md px-2.5 py-1 hover:bg-brand-soft transition"
						>
							Destacar trecho selecionado
						</button>
						{hasHighlight && (
							<button
								type="button"
								onClick={clearSelection}
								data-testid="clear-highlight-btn"
								className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
							>
								Limpar destaque
							</button>
						)}
						<span className="text-[11px] text-slate-400 dark:text-slate-500">
							{hasHighlight
								? "Trecho destacado — não altera o texto original."
								: "Opcional: selecione um trecho para destacar."}
						</span>
					</div>
				</section>

				{/* Title + body. */}
				<section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
					<div>
						<label
							htmlFor="discussion-title"
							className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1"
						>
							Título
						</label>
						<input
							id="discussion-title"
							data-testid="discussion-title-input"
							type="text"
							value={title}
							maxLength={TITLE_MAX}
							onChange={(e) =>
								setTitle(e.target.value.replace(/[\r\n]+/g, " "))
							}
							placeholder="Resuma sua discussão em uma linha"
							className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
						/>
					</div>
					<div>
						<label
							htmlFor="discussion-body"
							className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1"
						>
							Comentário da discussão
						</label>
						<textarea
							id="discussion-body"
							data-testid="discussion-body-input"
							value={body}
							maxLength={BODY_MAX}
							onChange={(e) => setBody(e.target.value)}
							rows={6}
							placeholder="Desenvolva seu ponto. Quebras de linha são preservadas."
							className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 resize-y"
						/>
						<p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 text-right">
							{body.length}/{BODY_MAX}
						</p>
					</div>
					<div className="flex justify-end">
						<button
							type="button"
							onClick={handleSubmit}
							disabled={submitting || !title.trim() || !body.trim()}
							data-testid="submit-discussion"
							className="bg-brand text-white font-semibold text-sm px-4 py-2 rounded-md hover:bg-brand/90 transition disabled:opacity-50"
						>
							{submitting ? "Criando…" : "Criar discussão"}
						</button>
					</div>
				</section>
			</main>
		</div>
	);
}
