"use client";

import { useCallback } from "react";
import Image from "next/image";
import { getIconPath, dateFormat } from "@/utils/iconFunction";

export interface CommentItem {
  _id: string;
  username: string;
  text: string;
  bookReference: string;
  tags: string[];
  likes: string[];
  createdAt: string;
}

interface Props {
  comments: CommentItem[];
  onNewComment: () => void;
  likeFunction: (id: string) => void;
  closeFunction: () => void;
  reportFunction: (id: string) => void;
  discussionFunction: (id: string, text: string, reference: string) => void;
}

export default function Comments({ comments, onNewComment, likeFunction, closeFunction, reportFunction, discussionFunction }: Props) {
  const handleLike = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const id = e.currentTarget.getAttribute("data-id") ?? "";
    likeFunction(id);
  }, [likeFunction]);

  const handleReport = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const id = e.currentTarget.getAttribute("data-id") ?? "";
    reportFunction(id);
  }, [reportFunction]);

  const handleChat = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const reference = e.currentTarget.getAttribute("data-reference") ?? "";
    const id = e.currentTarget.getAttribute("data-id") ?? "";
    const username = e.currentTarget.getAttribute("data-username") ?? "";
    const text = e.currentTarget.getAttribute("data-text") ?? "";
    discussionFunction(id, text, `${username} ${reference}`);
  }, [discussionFunction]);

  return (
    <div className="sideComments flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="font-semibold text-gray-800">Comentários</h2>
        <button type="button" onClick={closeFunction} className="text-gray-400 hover:text-gray-600">
          <Image src="/assets/x.svg" alt="Fechar" width={20} height={20} />
        </button>
      </div>

      <ul className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
        {comments.length !== 0 ? (
          comments.map((comment) => (
            <li key={comment._id} className="bg-gray-50 rounded-lg p-3 text-sm">
              <h3 className="font-semibold text-gray-800 flex items-center gap-1 flex-wrap mb-1">
                {comment.username}
                {comment.tags.map((tag) => (
                  <Image key={tag} alt={tag} src={getIconPath(tag)} width={14} height={14} />
                ))}
                <sub className="text-xs text-gray-400 ml-auto">{dateFormat(comment.createdAt)}</sub>
              </h3>
              <p className="text-gray-700 leading-relaxed">{comment.text}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-400">
                  Favoritado por <b>{comment.likes.length}</b> pessoas
                </span>
                <span className="flex gap-2">
                  <button type="button" onClick={handleLike} data-id={comment._id}>
                    <Image alt="Like" src={getIconPath("heart")} width={18} height={18} />
                  </button>
                  <button type="button" onClick={handleChat}
                    data-id={comment._id} data-text={comment.text}
                    data-username={comment.username} data-reference={comment.bookReference}>
                    <Image alt="Discussão" src={getIconPath("chat")} width={18} height={18} />
                  </button>
                  <button type="button" onClick={handleReport} data-id={comment._id}>
                    <Image alt="Reportar" src={getIconPath("warning")} width={18} height={18} />
                  </button>
                </span>
              </div>
            </li>
          ))
        ) : (
          <li className="text-center py-6 text-gray-400">
            <p className="font-medium">Nenhum comentário</p>
            <p className="text-sm mt-1">Seja o primeiro a comentar</p>
          </li>
        )}
      </ul>

      <div className="px-4 py-3 border-t border-gray-200">
        <button
          type="button"
          onClick={onNewComment}
          className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition"
        >
          Comentar
        </button>
      </div>
    </div>
  );
}
