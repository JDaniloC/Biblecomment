"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Book } from "@/domain/entities/Book";
import { discussionsService } from "@/services/discussions";
import type { DiscussionWire } from "@/lib/discussion-wire";
import { useNotification } from "@/contexts/NotificationContext";
import { AppHeader } from "@/components/AppHeader";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { LikeButton } from "@/components/LikeButton";

interface SessionUser {
	name: string;
	email: string;
	username: string;
	moderator: boolean;
}

interface Props {
	discussion: DiscussionWire | null;
	discussions: DiscussionWire[];
	book: Book;
	user: SessionUser;
	mode: "list" | "detail";
}

/** Heading text for a discussion — falls back to the body for legacy threads. */
function headingFor(d: { title?: string; question: string }): string {
	return d.title?.trim() ? d.title : d.question;
}

/** Render text with an optional highlighted excerpt (offsets into the text). */
function renderWithHighlight(
	text: string,
	start?: number,
	end?: number,
): ReactNode {
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

/**
 * Text block that collapses to `collapsedClass` lines with a "Ver mais"
 * toggle when it's long. Used for the quoted comment and for long answers so
 * readers can expand/retract parts of a discussion.
 */
function CollapsibleText({
	children,
	collapsedClass,
	canCollapse,
	testId,
}: {
	children: ReactNode;
	collapsedClass: string;
	canCollapse: boolean;
	testId?: string;
}) {
	const [expanded, setExpanded] = useState(false);
	return (
		<div>
			<div
				data-testid={testId}
				className={`whitespace-pre-wrap ${canCollapse && !expanded ? collapsedClass : ""}`}
			>
				{children}
			</div>
			{canCollapse && (
				<button
					type="button"
					onClick={() => setExpanded((v) => !v)}
					className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-brand transition"
				>
					{expanded ? "Ver menos" : "Ver mais"}
				</button>
			)}
		</div>
	);
}

export default function DiscussionDetailClient({
	discussion: initialDiscussion,
	discussions,
	book,
	user,
	mode,
}: Props) {
	const { handleNotification } = useNotification();
	const [discussion, setDiscussion] = useState(initialDiscussion);
	const [answerText, setAnswerText] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
	const [editAnswerText, setEditAnswerText] = useState("");
	const [savingEdit, setSavingEdit] = useState(false);
	const editTextareaRef = useRef<HTMLTextAreaElement>(null);

	// Focus the edit textarea when an answer enters edit mode (replaces autoFocus).
	useEffect(() => {
		if (editingAnswerId) editTextareaRef.current?.focus();
	}, [editingAnswerId]);

	function startEdit(answerId: string, currentText: string) {
		setEditingAnswerId(answerId);
		setEditAnswerText(currentText);
	}

	function cancelEdit() {
		setEditingAnswerId(null);
		setEditAnswerText("");
	}

	async function saveEdit() {
		if (!discussion?._id || !editingAnswerId || !editAnswerText.trim()) return;
		setSavingEdit(true);
		try {
			const updated = await discussionsService.updateAnswer(
				book.abbrev,
				discussion._id,
				editingAnswerId,
				editAnswerText.trim(),
			);
			setDiscussion(updated);
			cancelEdit();
			handleNotification("success", "Resposta atualizada.");
		} catch (err: unknown) {
			const status = (err as { response?: { status?: number } })?.response
				?.status;
			if (status === 403) {
				handleNotification(
					"error",
					"Você não tem permissão para editar esta resposta.",
				);
			} else if (status === 404) {
				handleNotification(
					"error",
					"Resposta não encontrada (legado sem _id).",
				);
			} else {
				handleNotification("error", "Erro ao salvar edição.");
			}
		} finally {
			setSavingEdit(false);
		}
	}

	async function handleAddAnswer() {
		if (!discussion?._id || !answerText.trim()) return;
		setSubmitting(true);
		try {
			const updated = await discussionsService.addAnswer(
				book.abbrev,
				discussion._id,
				answerText,
			);
			setDiscussion(updated);
			setAnswerText("");
		} catch {
			handleNotification("error", "Erro ao enviar resposta.");
		} finally {
			setSubmitting(false);
		}
	}

	async function handleToggleDiscussionLike() {
		if (!discussion?._id) return;
		try {
			const result = await discussionsService.toggleLike(
				"discussion",
				discussion._id,
			);
			setDiscussion((d) =>
				d
					? { ...d, likeCount: result.likeCount, likedByMe: result.likedByMe }
					: d,
			);
		} catch {
			handleNotification("error", "Erro ao curtir.");
		}
	}

	async function handleToggleAnswerLike(answerId: string) {
		try {
			const result = await discussionsService.toggleLike("answer", answerId);
			setDiscussion((d) =>
				d
					? {
							...d,
							answers: d.answers.map((a) =>
								a._id === answerId
									? {
											...a,
											likeCount: result.likeCount,
											likedByMe: result.likedByMe,
										}
									: a,
							),
						}
					: d,
			);
		} catch {
			handleNotification("error", "Erro ao curtir.");
		}
	}

	if (mode === "list" || !discussion) {
		return (
			<div className="min-h-screen bg-gray-50 dark:bg-slate-950">
				<AppHeader user={user} />

				<main id="main-content" className="max-w-3xl mx-auto px-4 py-6">
					<h1 className="font-semibold text-xl text-slate-800 dark:text-slate-100 mb-1">
						Discussões — {book.name}
					</h1>
					<p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
						As discussões começam a partir de um comentário — toque em{" "}
						<strong>Discutir</strong> em qualquer comentário do livro.
					</p>

					{discussions.length === 0 ? (
						<p className="text-slate-400 dark:text-slate-500 text-center py-10">
							Nenhuma discussão ainda.
						</p>
					) : (
						<div className="space-y-3" data-testid="discussion-list">
							{discussions.map((d) => (
								<Link
									key={d._id}
									href={`/discussion/${book.abbrev}/${d._id}`}
									data-testid="discussion-card"
									className="block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-brand transition"
								>
									<p className="text-xs font-medium text-brand mb-1">
										{d.verseReference}
									</p>
									<h2 className="font-semibold text-slate-800 dark:text-slate-100">
										{headingFor(d)}
									</h2>
									<div className="flex items-center gap-3 mt-2 text-xs text-slate-400 dark:text-slate-500">
										<span>por {d.username}</span>
										<span>·</span>
										<span>
											{d.answersCount} resposta{d.answersCount !== 1 ? "s" : ""}
										</span>
									</div>
								</Link>
							))}
						</div>
					)}
				</main>
			</div>
		);
	}

	const quoteText = discussion.commentText || discussion.verseText;
	const hasTitle = Boolean(discussion.title?.trim());

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
				<span className="text-slate-300 dark:text-slate-600 mx-2">|</span>
				<span className="text-sm text-slate-600 dark:text-slate-300">
					{discussion.verseReference}
				</span>
			</div>

			<main id="main-content" className="max-w-3xl mx-auto px-4 py-6">
				<article className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 mb-6">
					{/* 1. Title */}
					<h1
						data-testid="discussion-title"
						className="text-xl font-bold text-slate-800 dark:text-slate-100"
					>
						{headingFor(discussion)}
					</h1>
					<p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">
						por <strong>{discussion.username}</strong>
					</p>

					{/* 2. The comment being discussed (smaller, read-only). */}
					{quoteText && (
						<div className="border-l-4 border-brand/30 bg-brand-wash dark:bg-slate-800/40 rounded-r-md pl-3 pr-2 py-2 mb-4">
							<div className="flex items-center justify-between gap-2 mb-1">
								<span className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
									Comentário
								</span>
								{discussion.commentId && (
									<Link
										href={`/c/${discussion.commentId}`}
										className="text-[11px] text-slate-400 dark:text-slate-500 hover:text-brand transition"
									>
										ver comentário →
									</Link>
								)}
							</div>
							<div className="text-sm text-slate-600 dark:text-slate-300">
								<CollapsibleText
									testId="discussion-quote"
									canCollapse={quoteText.length > 240}
									collapsedClass="line-clamp-4"
								>
									{renderWithHighlight(
										quoteText,
										discussion.quoteStart,
										discussion.quoteEnd,
									)}
								</CollapsibleText>
							</div>
						</div>
					)}

					{/* 3. The discussion body (larger), shown in full. */}
					{hasTitle && (
						<p
							data-testid="discussion-body"
							className="text-[15px] leading-relaxed text-slate-800 dark:text-slate-100 whitespace-pre-wrap"
						>
							{discussion.question}
						</p>
					)}

					{/* 4. Reaction. */}
					<div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
						<LikeButton
							liked={discussion.likedByMe}
							count={discussion.likeCount}
							onToggle={handleToggleDiscussionLike}
							testId="discussion-like"
						/>
					</div>
				</article>

				<h2 className="text-md font-semibold text-slate-700 dark:text-slate-200 mb-3">
					Respostas ({(discussion.answers ?? []).length})
				</h2>

				<div className="space-y-3 mb-6">
					{(discussion.answers ?? []).map((a, i) => {
						const canEdit =
							Boolean(a._id) &&
							(user.moderator ||
								a.name === user.name ||
								a.name === user.username);
						const isEditing = editingAnswerId === a._id;
						return (
							<div
								key={a._id ?? i}
								data-testid="discussion-answer"
								className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4"
							>
								<div className="flex items-center justify-between mb-1">
									<span className="inline-flex items-center gap-1">
										<p className="text-xs font-semibold text-brand">{a.name}</p>
										<VerifiedBadge verified={a.authorEmailVerified} size="xs" />
									</span>
									{canEdit && !isEditing && (
										<button
											type="button"
											onClick={() => a._id && startEdit(a._id, a.text)}
											className="text-[11px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition"
										>
											Editar
										</button>
									)}
								</div>
								{isEditing ? (
									<div className="space-y-2">
										<textarea
											ref={editTextareaRef}
											value={editAnswerText}
											onChange={(e) => setEditAnswerText(e.target.value)}
											rows={3}
											className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"
										/>
										<div className="flex gap-2 justify-end">
											<button
												type="button"
												onClick={cancelEdit}
												disabled={savingEdit}
												className="px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition disabled:opacity-50"
											>
												Cancelar
											</button>
											<button
												type="button"
												onClick={saveEdit}
												disabled={savingEdit || !editAnswerText.trim()}
												className="px-3 py-1.5 text-xs bg-brand text-white font-semibold rounded-md hover:bg-brand/90 disabled:opacity-50 transition"
											>
												{savingEdit ? "Salvando…" : "Salvar"}
											</button>
										</div>
									</div>
								) : (
									<>
										<div className="text-sm text-slate-700 dark:text-slate-200">
											<CollapsibleText
												canCollapse={a.text.length > 360}
												collapsedClass="line-clamp-6"
											>
												{a.text}
											</CollapsibleText>
										</div>
										<div className="mt-2">
											<LikeButton
												liked={a.likedByMe}
												count={a.likeCount}
												onToggle={() => a._id && handleToggleAnswerLike(a._id)}
												disabled={!a._id}
												testId="answer-like"
											/>
										</div>
									</>
								)}
							</div>
						);
					})}
				</div>

				<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
					<textarea
						value={answerText}
						onChange={(e) => setAnswerText(e.target.value)}
						placeholder="Sua resposta..."
						rows={3}
						data-testid="answer-input"
						className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none mb-3"
					/>
					<button
						onClick={handleAddAnswer}
						disabled={submitting || !answerText.trim()}
						data-testid="submit-answer"
						className="bg-brand text-white font-semibold text-sm px-4 py-2 rounded-md hover:bg-brand/90 transition disabled:opacity-50"
					>
						{submitting ? "Enviando..." : "Responder"}
					</button>
				</div>
			</main>
		</div>
	);
}
