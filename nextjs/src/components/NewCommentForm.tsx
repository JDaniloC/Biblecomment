"use client";

import Image from "next/image";
import { useState, useCallback } from "react";
import { useNotification } from "@/contexts/NotificationContext";
import { commentsService } from "@/services/comments";
import type { CommentData } from "./CommentCard";

const TAGS = [
  { key: "devocional", icon: "/assets/hand.svg", label: "Devocional" },
  { key: "exegese",    icon: "/assets/book.svg",   label: "Exegese" },
  { key: "inspirado",  icon: "/assets/pen.svg",    label: "Inspirado" },
  { key: "pessoal",    icon: "/assets/person.svg", label: "Pessoal" },
];

const MIN_LEN = 200;
const MAX_LEN = 1000;

interface NewCommentFormProps {
  title: string;
  onClose: () => void;
  onSaved: (comment: CommentData) => void;
  post: true;
  verseId: string;
  onTitle?: boolean;
  initialText?: string;
}

interface EditCommentFormProps {
  title: string;
  onClose: () => void;
  onSaved: (comment: CommentData) => void;
  post: false;
  commentId: string;
  initialText?: string;
}

type Props = NewCommentFormProps | EditCommentFormProps;

export default function NewCommentForm(props: Props) {
  const { handleNotification } = useNotification();
  const [text, setText] = useState(props.initialText ?? "");
  const [tags, setTags] = useState<Record<string, boolean>>({
    devocional: false, exegese: false, inspirado: false, pessoal: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const charValid = text.length >= MIN_LEN && text.length <= MAX_LEN;

  const handleTagToggle = useCallback((key: string) => {
    setTags((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let val = e.target.value;
    if (val.slice(-2) === "  ") val = val.slice(0, -1);
    setText(val);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!charValid) {
      handleNotification("info", `Reescreva o comentário entre ${MIN_LEN}-${MAX_LEN} caracteres!`);
      return;
    }
    const tagList = Object.entries(tags).filter(([, v]) => v).map(([k]) => k);
    setSubmitting(true);
    try {
      const saved = props.post
        ? await commentsService.createForVerse(props.verseId, {
            text,
            tags: tagList,
            onTitle: props.onTitle ?? false,
          })
        : await commentsService.update(props.commentId, { text, tags: tagList });
      handleNotification("success", props.post ? "Comentário enviado!" : "Comentário editado!");
      props.onSaved(saved as unknown as CommentData);
      props.onClose();
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? "Erro ao salvar.";
      handleNotification("error", msg);
    } finally {
      setSubmitting(false);
    }
  }, [charValid, tags, text, props, handleNotification]);

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">{props.title}</h2>
        <button type="button" onClick={props.onClose} className="text-gray-400 hover:text-gray-600">
          <Image src="/assets/x.svg" alt="Fechar" width={20} height={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3">
          {TAGS.map(({ key, icon, label }) => (
            <label key={key} title={label} className="cursor-pointer">
              <input
                type="checkbox"
                className="sr-only"
                checked={tags[key]}
                onChange={() => handleTagToggle(key)}
              />
              <Image
                src={icon}
                alt={label}
                width={24}
                height={24}
                className={`transition ${tags[key] ? "opacity-100 scale-110" : "opacity-40"}`}
              />
            </label>
          ))}
          <span className="ml-auto text-xs text-gray-400">
            {text.length}/{text.length < MIN_LEN ? MIN_LEN : MAX_LEN}
          </span>
        </div>

        <textarea
          value={text}
          onChange={handleTextChange}
          placeholder="Descreva seu comentário"
          rows={6}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <button
          type="submit"
          disabled={!charValid || submitting}
          className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition"
        >
          {submitting ? "Enviando..." : "Enviar"}
        </button>
      </form>
    </div>
  );
}
