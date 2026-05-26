"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Book } from "@/domain/entities/Book";
import { discussionsService } from "@/services/discussions";
import type { DiscussionWire } from "@/lib/discussion-wire";
import { useNotification } from "@/contexts/NotificationContext";
import { AppHeader } from "@/components/AppHeader";
import { VerifiedBadge } from "@/components/VerifiedBadge";

interface SessionUser {
  name: string;
  email: string;
  username: string;
  moderator: boolean;
}

const COMMENT_EXCERPT_LIMIT = 280;

function excerpt(text: string, limit = COMMENT_EXCERPT_LIMIT): string {
  if (text.length <= limit) return text;
  const slice = text.slice(0, limit).trimEnd();
  return `${slice}…`;
}

interface Props {
  discussion: DiscussionWire | null;
  discussions: DiscussionWire[];
  book: Book;
  user: SessionUser;
  mode: "list" | "detail";
  initialCommentId?: string;
  initialRef?: string;
  initialText?: string;
}

export default function DiscussionDetailClient({
  discussion: initialDiscussion,
  discussions,
  book,
  user,
  mode,
  initialCommentId: _initialCommentId,
  initialRef,
  initialText,
}: Props) {
  const router = useRouter();
  const { handleNotification } = useNotification();
  const [discussion, setDiscussion] = useState(initialDiscussion);
  const [answerText, setAnswerText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [newVerseRef, setNewVerseRef] = useState(initialRef ?? "");
  const [newVerseText, setNewVerseText] = useState(initialText ?? "");
  const [newCommentText, setNewCommentText] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(!!(initialRef || initialText));
  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
  const [editAnswerText, setEditAnswerText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

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
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        handleNotification("error", "Você não tem permissão para editar esta resposta.");
      } else if (status === 404) {
        handleNotification("error", "Resposta não encontrada (legado sem _id).");
      } else {
        handleNotification("error", "Erro ao salvar edição.");
      }
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleCreateDiscussion() {
    if (!newVerseRef.trim() || !newQuestion.trim()) return;
    setCreating(true);
    try {
      const created = await discussionsService.createForBook(book.abbrev, {
        verseReference: newVerseRef,
        verseText: newVerseText,
        commentText: newCommentText,
        question: newQuestion,
      });
      router.push(`/discussion/${book.abbrev}/${created._id}`);
    } catch {
      alert("Erro ao criar discussão.");
    } finally {
      setCreating(false);
    }
  }

  async function handleAddAnswer() {
    if (!discussion?._id || !answerText.trim()) return;
    setSubmitting(true);
    try {
      const updated = await discussionsService.addAnswer(book.abbrev, discussion._id, answerText);
      setDiscussion(updated);
      setAnswerText("");
    } catch {
      alert("Erro ao enviar resposta.");
    } finally {
      setSubmitting(false);
    }
  }

  if (mode === "list" || !discussion) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
        <AppHeader user={user} />

        <main id="main-content" className="max-w-3xl mx-auto px-4 py-6">
          <h1 className="font-semibold text-xl text-gray-800 dark:text-slate-100 mb-4">
            Discussões — {book.name}
          </h1>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-slate-200">Discussões</h2>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
            >
              Nova Discussão
            </button>
          </div>

          {showForm && (
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4 mb-6 space-y-3">
              <label htmlFor="new-disc-verseref" className="sr-only">Referência do versículo</label>
              <input
                id="new-disc-verseref"
                type="text"
                placeholder="Referência do versículo (ex: Gn 1:1)"
                value={newVerseRef}
                onChange={(e) => setNewVerseRef(e.target.value)}
                className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm"
              />
              <label htmlFor="new-disc-versetext" className="sr-only">Texto do versículo</label>
              <input
                id="new-disc-versetext"
                type="text"
                placeholder="Texto do versículo"
                value={newVerseText}
                onChange={(e) => setNewVerseText(e.target.value)}
                className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm"
              />
              <label htmlFor="new-disc-commenttext" className="sr-only">Texto do comentário relacionado (opcional)</label>
              <input
                id="new-disc-commenttext"
                type="text"
                placeholder="Texto do comentário relacionado (opcional)"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm"
              />
              <label htmlFor="new-disc-question" className="sr-only">Pergunta ou tema da discussão</label>
              <textarea
                id="new-disc-question"
                placeholder="Sua pergunta ou tema de discussão..."
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm resize-none"
              />

              {(newQuestion || newVerseRef || newVerseText || newCommentText) && (
                <div className="border border-dashed border-gray-300 dark:border-slate-700 rounded-xl p-4 bg-gray-50 dark:bg-slate-950/40">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-slate-500 mb-2">
                    Pré-visualização
                  </p>
                  {newVerseRef && (
                    <p className="text-xs text-gray-400 dark:text-slate-500 mb-1">{newVerseRef}</p>
                  )}
                  {newVerseText && (
                    <blockquote className="italic text-gray-600 dark:text-slate-300 border-l-4 border-gray-200 dark:border-slate-700 pl-3 mb-3">
                      {excerpt(newVerseText)}
                    </blockquote>
                  )}
                  {newCommentText && (
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-2">
                      Comentário: <span className="italic">{excerpt(newCommentText)}</span>
                    </p>
                  )}
                  <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100">
                    {newQuestion || <span className="text-gray-400 dark:text-slate-500 font-normal italic">sua pergunta aparecerá aqui em destaque</span>}
                  </h3>
                </div>
              )}

              <button
                onClick={handleCreateDiscussion}
                disabled={creating}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
              >
                {creating ? "Criando..." : "Criar Discussão"}
              </button>
            </div>
          )}

          {discussions.length === 0 ? (
            <p className="text-gray-400 dark:text-slate-500 text-center py-10">
              Nenhuma discussão ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {discussions.map((d) => (
                <Link
                  key={d._id}
                  href={`/discussion/${book.abbrev}/${d._id}`}
                  className="block bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4 hover:border-purple-300 dark:hover:border-purple-600 transition"
                >
                  <h3 className="font-semibold text-gray-800 dark:text-slate-100">{d.question}</h3>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{d.verseReference}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-slate-500">
                    <span>{d.username}</span>
                    <span>·</span>
                    <span>{d.answersCount} resposta(s)</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <AppHeader user={user} />
      <div className="max-w-3xl mx-auto px-4 pt-4">
        <Link
          href={`/discussion/${book.abbrev}`}
          className="text-blue-600 dark:text-brand hover:underline text-sm"
        >
          ← Discussões
        </Link>
        <span className="text-gray-400 dark:text-slate-600 mx-2">|</span>
        <span className="text-sm text-gray-600 dark:text-slate-300">
          {discussion.verseReference}
        </span>
      </div>

      <main id="main-content" className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-5 mb-6">
          <p className="text-xs text-gray-400 dark:text-slate-500 mb-1">{discussion.verseReference}</p>
          <blockquote className="italic text-gray-600 dark:text-slate-300 border-l-4 border-gray-200 dark:border-slate-700 pl-3 mb-3">
            {discussion.verseText}
          </blockquote>
          {discussion.commentText && (
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-2">
              Comentário: <span className="italic">{excerpt(discussion.commentText)}</span>
            </p>
          )}
          <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100">{discussion.question}</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
            por <strong>{discussion.username}</strong>
          </p>
        </div>

        <h2 className="text-md font-semibold text-gray-700 dark:text-slate-200 mb-3">
          Respostas ({(discussion.answers ?? []).length})
        </h2>

        <div className="space-y-3 mb-6">
          {(discussion.answers ?? []).map((a, i) => {
            const canEdit = !!a._id && (user.moderator || a.name === user.name || a.name === user.username);
            const isEditing = editingAnswerId === a._id;
            return (
              <div
                key={a._id ?? i}
                className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="inline-flex items-center gap-1">
                    <p className="text-xs font-semibold text-purple-600 dark:text-purple-400">{a.name}</p>
                    <VerifiedBadge verified={a.authorEmailVerified} size="xs" />
                  </span>
                  {canEdit && !isEditing && (
                    <button
                      type="button"
                      onClick={() => startEdit(a._id!, a.text)}
                      className="text-[11px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition"
                    >
                      Editar
                    </button>
                  )}
                </div>
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editAnswerText}
                      onChange={(e) => setEditAnswerText(e.target.value)}
                      rows={3}
                      className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm resize-none"
                      autoFocus
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
                        className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 transition"
                      >
                        {savingEdit ? "Salvando…" : "Salvar"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-700 dark:text-slate-200 whitespace-pre-wrap">{a.text}</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4">
          <textarea
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            placeholder="Sua resposta..."
            rows={3}
            className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm resize-none mb-3"
          />
          <button
            onClick={handleAddAnswer}
            disabled={submitting || !answerText.trim()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
          >
            {submitting ? "Enviando..." : "Responder"}
          </button>
        </div>
      </main>
    </div>
  );
}
