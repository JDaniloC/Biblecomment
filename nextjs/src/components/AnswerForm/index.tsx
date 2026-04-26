"use client";

import { useState, useContext, useCallback } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { NotificationContext } from "@/contexts/NotificationContext";
import api from "@/services/api";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

interface Answer {
  name: string;
  text: string;
}

interface Props {
  answers: Answer[];
  selected: string;
  commentText: string;
  commentReference: string;
  onCloseAnswers: () => void;
  appendNewDiscussion: (discussion: unknown) => void;
  setAnswersToDiscussions: (answers: Answer[]) => void;
}

export default function AnswerForm({
  answers,
  selected,
  commentText,
  commentReference,
  onCloseAnswers,
  appendNewDiscussion,
  setAnswersToDiscussions,
}: Props) {
  const [showNewPost, setShowNewPost] = useState(commentText !== "");
  const [replyText, setReplyText] = useState("");
  const { handleNotification } = useContext(NotificationContext);

  const canPost = useCallback(() => {
    if (!replyText.trim()) {
      handleNotification("info", "Você precisa escrever algo");
      return false;
    }
    return true;
  }, [replyText, handleNotification]);

  const handlePostAnswer = useCallback(async () => {
    if (!canPost()) return;
    try {
      const res = await api.patch(`/discussion/${selected}`, { text: replyText });
      if (res.data?.answers) {
        setAnswersToDiscussions(res.data.answers);
        setReplyText("");
        handleNotification("success", "Resposta enviada");
        onCloseAnswers();
      } else {
        handleNotification("warning", "Algo deu errado");
      }
    } catch (err: unknown) {
      handleNotification("error", String(err));
    }
  }, [canPost, replyText, selected, setAnswersToDiscussions, handleNotification, onCloseAnswers]);

  const handlePostQuestion = useCallback(async () => {
    if (!canPost()) return;
    try {
      const [username, abbrev, verseReference] = commentReference.split(" ");
      const res = await api.post(`/discussion/${abbrev}`, {
        verseReference,
        question: replyText,
        comment_id: selected,
        verse_text: commentText,
      });
      if (res.data?.question) {
        res.data.answers = [];
        setReplyText("");
        appendNewDiscussion(res.data);
        handleNotification("success", `Comentário enviado à ${username}!`);
        setShowNewPost(false);
        onCloseAnswers();
      } else {
        handleNotification("warning", res.data?.error ?? "Algo deu errado");
      }
    } catch (err: unknown) {
      handleNotification("error", String(err));
    }
  }, [canPost, replyText, commentReference, selected, commentText, appendNewDiscussion, handleNotification, onCloseAnswers]);

  return (
    <div className="flex flex-col h-full">
      {!showNewPost ? (
        <>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h2 className="font-semibold text-gray-800">Respostas</h2>
            <button type="button" onClick={onCloseAnswers} className="text-gray-400 hover:text-gray-600">
              <Image src="/assets/x.svg" alt="Fechar" width={20} height={20} />
            </button>
          </div>
          <ul className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {answers.length > 0 ? (
              answers.map((answer, i) => (
                <li key={i} className="bg-gray-50 rounded-lg p-3">
                  <h3 className="font-semibold text-sm text-gray-800 mb-1">{answer.name}</h3>
                  <div className="text-sm text-gray-700 prose prose-sm">
                    {answer.text}
                  </div>
                </li>
              ))
            ) : (
              <li className="text-center py-6 text-gray-400">
                <p>Seja o primeiro a responder</p>
              </li>
            )}
          </ul>
          <div className="px-4 py-3 border-t border-gray-200 space-y-2" data-color-mode="light">
            <MDEditor value={replyText} onChange={(v) => setReplyText(v ?? "")} height={120} />
            <button
              type="button"
              onClick={handlePostAnswer}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Responder
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h2 className="font-semibold text-gray-800">Postar novo ponto</h2>
            <button type="button" onClick={() => setShowNewPost(false)} className="text-gray-400 hover:text-gray-600">
              <Image src="/assets/x.svg" alt="Fechar" width={20} height={20} />
            </button>
          </div>
          <div className="px-4 py-3 flex-1 overflow-y-auto">
            <p className="text-sm font-medium text-gray-600 mb-1">{commentReference}</p>
            <p className="text-sm text-gray-700 mb-3 italic">{commentText}</p>
            <div data-color-mode="light" className="space-y-2">
              <MDEditor value={replyText} onChange={(v) => setReplyText(v ?? "")} height={140} />
              <button
                type="button"
                onClick={handlePostQuestion}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Postar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
