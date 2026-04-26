"use client";

import Image from "next/image";
import { getIconPath, dateFormat } from "@/utils/iconFunction";

export interface CommentData {
  _id: string;
  text: string;
  tags: string[];
  username: string;
  bookReference: string;
  createdAt: string;
  likes: string[];
  verseId?: string;
  onTitle?: boolean;
}

interface CommentCardProps {
  comment: CommentData;
  onLike?: (id: string) => void;
  onReport?: (id: string) => void;
  onDiscussion?: (id: string, text: string, reference: string) => void;
  onEdit?: (comment: CommentData) => void;
  onDelete?: (id: string) => void;
  currentUserId?: string;
  showActions?: boolean;
}

export default function CommentCard({
  comment,
  onLike,
  onReport,
  onDiscussion,
  onEdit,
  onDelete,
  currentUserId,
  showActions = true,
}: CommentCardProps) {
  const isOwner = currentUserId && comment.username === currentUserId;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-semibold text-gray-800 text-sm">{comment.username}</span>
        {comment.tags.map((tag) => (
          <Image
            key={tag}
            src={getIconPath(tag)}
            alt={tag}
            width={16}
            height={16}
            className="inline"
          />
        ))}
        <span className="text-xs text-gray-400 ml-auto">{dateFormat(comment.createdAt)}</span>
      </div>

      <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">{comment.text}</p>

      {showActions && (
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>Favoritado por <strong>{comment.likes.length}</strong> pessoa{comment.likes.length !== 1 ? "s" : ""}</span>

          {onLike && (
            <button
              type="button"
              onClick={() => onLike(comment._id)}
              className="flex items-center gap-1 hover:text-red-500 transition"
            >
              <Image src="/assets/heart.svg" alt="Like" width={16} height={16} />
            </button>
          )}

          {onDiscussion && (
            <button
              type="button"
              onClick={() => onDiscussion(comment._id, comment.text, `${comment.username} ${comment.bookReference}`)}
              className="flex items-center gap-1 hover:text-blue-500 transition"
            >
              <Image src="/assets/chat.svg" alt="Discussão" width={16} height={16} />
            </button>
          )}

          {onReport && (
            <button
              type="button"
              onClick={() => onReport(comment._id)}
              className="flex items-center gap-1 hover:text-yellow-500 transition"
            >
              <Image src="/assets/warning.svg" alt="Reportar" width={16} height={16} />
            </button>
          )}

          {isOwner && onEdit && (
            <button
              type="button"
              onClick={() => onEdit(comment)}
              className="flex items-center gap-1 hover:text-blue-600 transition ml-auto"
            >
              <Image src="/assets/edit.svg" alt="Editar" width={16} height={16} />
            </button>
          )}

          {isOwner && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(comment._id)}
              className="flex items-center gap-1 hover:text-red-600 transition"
            >
              <Image src="/assets/delete.svg" alt="Excluir" width={16} height={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
