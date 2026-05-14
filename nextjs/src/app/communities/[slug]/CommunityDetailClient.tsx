"use client";

import { useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { communityService } from "@/services/communities";
import { useNotification } from "@/contexts/NotificationContext";
import type { Community } from "@/domain/entities/Community";

interface ViewerSession {
  name: string;
  username: string;
  email?: string | null;
  moderator?: boolean;
}

interface Props {
  community: Community;
  isMember: boolean;
  isCreator: boolean;
  creatorUsername?: string;
  viewer: ViewerSession | null;
}

export default function CommunityDetailClient({
  community,
  isMember: initialIsMember,
  isCreator,
  creatorUsername,
  viewer,
}: Props) {
  const { handleNotification } = useNotification();
  const [isMember, setIsMember] = useState(initialIsMember);
  const [memberCount, setMemberCount] = useState(community.memberCount);
  const [busy, setBusy] = useState(false);

  async function toggleMembership() {
    if (!viewer || busy) return;
    setBusy(true);
    const wasMember = isMember;
    // Optimistic UI — flip first, rollback on error.
    setIsMember(!wasMember);
    setMemberCount((prev) => prev + (wasMember ? -1 : 1));
    try {
      if (wasMember) await communityService.leave(community.slug);
      else await communityService.join(community.slug);
    } catch {
      setIsMember(wasMember);
      setMemberCount((prev) => prev + (wasMember ? 1 : -1));
      handleNotification(
        "error",
        wasMember ? "Erro ao sair da comunidade." : "Erro ao entrar na comunidade.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <AppHeader user={viewer} loginCallbackUrl={`/communities/${community.slug}`} />

      <main id="main-content" className="max-w-3xl mx-auto px-4 py-6">
        <Link
          href="/communities"
          className="text-sm text-slate-500 dark:text-slate-400 hover:text-brand inline-flex items-center gap-1 mb-4"
        >
          ← Comunidades
        </Link>

        <header className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 mb-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1
                className="text-2xl font-bold text-slate-800 dark:text-slate-100 truncate"
                data-testid="community-name"
              >
                {community.name}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                /{community.slug}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-3">
                <span data-testid="community-member-count">{memberCount}</span>{" "}
                {memberCount === 1 ? "membro" : "membros"}
                {creatorUsername && (
                  <>
                    {" · criada por "}
                    <Link
                      href={`/u/${creatorUsername}`}
                      className="text-brand hover:underline"
                    >
                      @{creatorUsername}
                    </Link>
                  </>
                )}
              </p>
            </div>
            {viewer && !isCreator && (
              <button
                type="button"
                onClick={toggleMembership}
                disabled={busy}
                data-testid="community-membership-toggle"
                data-member={isMember ? "true" : "false"}
                className={`text-sm font-semibold px-4 py-2 rounded-md transition disabled:opacity-60 ${
                  isMember
                    ? "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-300 hover:border-red-200 dark:hover:border-red-900/60"
                    : "bg-brand text-white hover:bg-brand/90"
                }`}
              >
                {isMember ? "Sair" : "Entrar"}
              </button>
            )}
            {isCreator && (
              <span
                data-testid="community-creator-badge"
                className="text-xs font-semibold px-3 py-1.5 rounded-md bg-brand-tint text-brand"
              >
                Criada por você
              </span>
            )}
          </div>

          {community.description && (
            <p className="text-sm text-slate-700 dark:text-slate-200 mt-4 whitespace-pre-wrap">
              {community.description}
            </p>
          )}
        </header>

        <section
          data-testid="community-comments-placeholder"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 text-sm text-slate-500 dark:text-slate-400"
        >
          Os comentários vinculados a esta comunidade aparecem aqui em breve.
        </section>
      </main>
    </div>
  );
}
