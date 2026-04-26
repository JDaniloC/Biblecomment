"use client";

import Image from "next/image";
import { getIconPath, dateFormat } from "@/utils/iconFunction";
import type { CommentItem } from "@/components/Comments";

interface Props {
  comments: CommentItem[];
  likeFunction: (id: string) => void;
  reportFunction: (id: string) => void;
  handleNewComment: (onTitle: boolean) => void;
  discussionFunction: (id: string, text: string, reference: string) => void;
}

export default function TitleComments({ comments, likeFunction, reportFunction, handleNewComment, discussionFunction }: Props) {
  function handleLike(e: React.MouseEvent<HTMLButtonElement>) {
    likeFunction(e.currentTarget.getAttribute("data-id") ?? "");
  }

  function handleReport(e: React.MouseEvent<HTMLButtonElement>) {
    reportFunction(e.currentTarget.getAttribute("data-id") ?? "");
  }

  function handleChat(e: React.MouseEvent<HTMLButtonElement>) {
    const id = e.currentTarget.getAttribute("data-id") ?? "";
    const text = e.currentTarget.getAttribute("data-text") ?? "";
    const reference = e.currentTarget.getAttribute("data-reference") ?? "";
    discussionFunction(id, text, reference);
  }

  return (
    <div className="title-comments">
      <ul className="space-y-3 px-4 py-2">
        {comments.map((comment) => (
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
                  data-reference={comment.bookReference}>
                  <Image alt="Discussão" src={getIconPath("chat")} width={18} height={18} />
                </button>
                <button type="button" onClick={handleReport} data-id={comment._id}>
                  <Image alt="Reportar" src={getIconPath("warning")} width={18} height={18} />
                </button>
              </span>
            </div>
          </li>
        ))}
      </ul>
      <div className="px-4 py-3 border-t border-gray-200">
        <button
          type="button"
          onClick={() => handleNewComment(true)}
          className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition"
        >
          Comentar
        </button>
      </div>
    </div>
  );
}
