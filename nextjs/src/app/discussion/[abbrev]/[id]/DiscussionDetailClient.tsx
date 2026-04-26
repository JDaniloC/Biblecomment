"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { Book } from "@/domain/entities/Book";
import { Discussion } from "@/domain/entities/Discussion";

interface SessionUser {
  name: string;
  email: string;
  username: string;
  moderator: boolean;
}

interface Props {
  discussion: Discussion | null;
  discussions: Discussion[];
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
  const [discussion, setDiscussion] = useState(initialDiscussion);
  const [answerText, setAnswerText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [newVerseRef, setNewVerseRef] = useState(initialRef ?? "");
  const [newVerseText, setNewVerseText] = useState(initialText ?? "");
  const [newCommentText, setNewCommentText] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(!!(initialRef || initialText));

  async function handleCreateDiscussion() {
    if (!newVerseRef.trim() || !newQuestion.trim()) return;
    setCreating(true);
    try {
      const res = await axios.post<Discussion>(`/api/discussion/${book.abbrev}`, {
        verseReference: newVerseRef,
        verseText: newVerseText,
        commentText: newCommentText,
        question: newQuestion,
      });
      router.push(`/discussion/${book.abbrev}/${res.data._id}`);
    } catch {
      alert("Erro ao criar discussão.");
    } finally {
      setCreating(false);
    }
  }

  async function handleAddAnswer() {
    if (!discussion || !answerText.trim()) return;
    setSubmitting(true);
    try {
      const res = await axios.patch<Discussion>(
        `/api/discussion/${discussion._id}`,
        { text: answerText }
      );
      setDiscussion(res.data);
      setAnswerText("");
    } catch {
      alert("Erro ao enviar resposta.");
    } finally {
      setSubmitting(false);
    }
  }

  if (mode === "list" || !discussion) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <Link href="/home" className="text-blue-600 hover:underline text-sm">
              ← Livros
            </Link>
            <span className="text-gray-400">|</span>
            <span className="font-semibold text-gray-800">
              Discussões — {book.name}
            </span>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-700">Discussões</h2>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
            >
              Nova Discussão
            </button>
          </div>

          {showForm && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 space-y-3">
              <input
                type="text"
                placeholder="Referência do versículo (ex: Gn 1:1)"
                value={newVerseRef}
                onChange={(e) => setNewVerseRef(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Texto do versículo"
                value={newVerseText}
                onChange={(e) => setNewVerseText(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Texto do comentário relacionado (opcional)"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <textarea
                placeholder="Sua pergunta ou tema de discussão..."
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
              />
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
            <p className="text-gray-400 text-center py-10">
              Nenhuma discussão ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {discussions.map((d) => (
                <Link
                  key={d._id}
                  href={`/discussion/${book.abbrev}/${d._id}`}
                  className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-purple-300 transition"
                >
                  <h3 className="font-semibold text-gray-800">{d.question}</h3>
                  <p className="text-xs text-gray-400 mt-1">{d.verseReference}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>{d.username}</span>
                    <span>·</span>
                    <span>{d.answers.length} resposta(s)</span>
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href={`/discussion/${book.abbrev}`}
            className="text-blue-600 hover:underline text-sm"
          >
            ← Discussões
          </Link>
          <span className="text-gray-400">|</span>
          <span className="font-semibold text-gray-800 truncate">
            {discussion.verseReference}
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <p className="text-xs text-gray-400 mb-1">{discussion.verseReference}</p>
          <blockquote className="italic text-gray-600 border-l-4 border-gray-200 pl-3 mb-3">
            {discussion.verseText}
          </blockquote>
          <p className="text-sm text-gray-500 mb-2">
            Comentário: <span className="italic">{discussion.commentText}</span>
          </p>
          <h1 className="text-xl font-bold text-gray-800">{discussion.question}</h1>
          <p className="text-sm text-gray-500 mt-2">
            por <strong>{discussion.username}</strong>
          </p>
        </div>

        <h2 className="text-md font-semibold text-gray-700 mb-3">
          Respostas ({discussion.answers.length})
        </h2>

        <div className="space-y-3 mb-6">
          {discussion.answers.map((a, i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-xl p-4"
            >
              <p className="text-xs font-semibold text-purple-600 mb-1">{a.name}</p>
              <p className="text-sm text-gray-700">{a.text}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <textarea
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            placeholder="Sua resposta..."
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none mb-3"
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
