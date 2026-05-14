"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { useNotification } from "@/contexts/NotificationContext";
import { createCommunityAction } from "@/app/actions/communities";

interface ViewerSession {
  name: string;
  username: string;
  email?: string | null;
  moderator?: boolean;
}

function slugify(input: string): string {
  // Normalize accents and strip non-slug characters. Mirrors the server-side
  // pattern ^[a-z0-9-]{2,40}$ but doesn't enforce length — the form's submit
  // handler relies on the action's Zod check to surface the friendly error.
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export default function NewCommunityClient({ viewer }: { viewer: ViewerSession }) {
  const router = useRouter();
  const { handleNotification } = useNotification();
  const [name, setName] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const computedSlug = useMemo(
    () => (slugTouched ? slug : slugify(name)),
    [slug, slugTouched, name],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await createCommunityAction({
      slug: computedSlug,
      name: name.trim(),
      description: description.trim(),
    });
    if (!result.ok) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    handleNotification("success", "Comunidade criada!");
    router.push(`/communities/${result.data.slug}`);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <AppHeader user={viewer} loginCallbackUrl="/communities/new" />

      <main id="main-content" className="max-w-xl mx-auto px-4 py-6">
        <Link
          href="/communities"
          className="text-sm text-slate-500 dark:text-slate-400 hover:text-brand mb-4 inline-flex items-center gap-1"
        >
          ← Voltar
        </Link>

        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Criar comunidade
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Cada usuário pode criar até 3 comunidades.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          data-testid="community-create-form"
          className="space-y-4"
        >
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Nome
            </span>
            <input
              type="text"
              required
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="community-name-input"
              className="mt-1 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Identificador
            </span>
            <input
              type="text"
              required
              maxLength={40}
              value={computedSlug}
              onChange={(e) => {
                setSlug(e.target.value.toLowerCase());
                setSlugTouched(true);
              }}
              data-testid="community-slug-input"
              className="mt-1 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
            <span className="block text-xs text-slate-500 dark:text-slate-400 mt-1">
              Letras minúsculas, números ou hífen — 2 a 40 caracteres.
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Descrição
            </span>
            <textarea
              maxLength={500}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-testid="community-description-input"
              className="mt-1 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </label>

          {error && (
            <p
              data-testid="community-create-error"
              className="text-sm text-red-600 dark:text-red-400"
            >
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Link
              href="/communities"
              className="text-sm font-semibold px-4 py-2 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={submitting}
              data-testid="community-submit"
              className="text-sm font-semibold px-4 py-2 rounded-md bg-brand text-white hover:bg-brand/90 transition disabled:opacity-50"
            >
              {submitting ? "Criando…" : "Criar"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
