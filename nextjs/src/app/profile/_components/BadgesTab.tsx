"use client";

import { useEffect, useState } from "react";
import { badgesService } from "@/services/badges";
import type { UserBadgesView } from "@/application/use-cases/BadgeUseCases";
import { BADGES, badgesByAxis } from "@/lib/badges/catalog";
import type { BadgeAxis } from "@/lib/badges/types";
import { BadgeCard } from "./BadgeCard";

const AXES: { id: BadgeAxis; label: string }[] = [
  { id: "reader-volume",       label: "Leitura por volume" },
  { id: "reader-streak",       label: "Sequência de leitura" },
  { id: "reader-section",      label: "Leitura por seção" },
  { id: "commenter-volume",    label: "Comentários (volume)" },
  { id: "commenter-diversity", label: "Comentários (diversidade)" },
  { id: "commenter-tags",      label: "Tipos de comentário" },
  { id: "interaction",         label: "Marcos de interação" },
];

export function BadgesTab() {
  const [view, setView] = useState<UserBadgesView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    badgesService
      .getMine()
      .then((v) => { if (!cancelled) setView(v); })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erro ao carregar conquistas.");
      });
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div role="alert" className="p-4 rounded-md bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300">
        {error}
      </div>
    );
  }
  if (!view) {
    return (
      <div data-testid="badges-loading" className="flex flex-col gap-6">
        <div>
          <div className="shimmer-skeleton h-6 w-32" />
          <div className="shimmer-skeleton h-4 w-48 mt-2" />
        </div>
        <div>
          <div className="shimmer-skeleton h-3 w-40 mb-3" />
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex gap-3 items-start p-3 rounded-lg border border-dashed border-amber-200/60 dark:border-slate-700 bg-white/40 dark:bg-slate-900/40"
              >
                <div className="shimmer-skeleton flex-none w-10 h-10 rounded-full" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="shimmer-skeleton h-4 w-2/3" />
                  <div className="shimmer-skeleton h-3 w-full" />
                  <div className="shimmer-skeleton h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const byId = new Map(view.entries.map((e) => [e.id, e] as const));
  const totalEarned = view.earned.length;
  const totalCatalog = BADGES.length;

  return (
    <div className="flex flex-col gap-6" data-testid="badges-tab">
      <div>
        <h2 className="font-bold text-xl text-slate-800 dark:text-slate-100 m-0">
          Conquistas
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1" data-testid="badges-summary">
          {totalEarned} de {totalCatalog} conquistas desbloqueadas.
        </p>
      </div>

      {AXES.map((ax) => {
        const list = badgesByAxis(ax.id);
        if (list.length === 0) return null;
        return (
          <section key={ax.id} aria-labelledby={`axis-${ax.id}`}>
            <h3
              id={`axis-${ax.id}`}
              className="text-[13px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3"
            >
              {ax.label}
            </h3>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((b) => {
                const entry = byId.get(b.id);
                return (
                  <BadgeCard
                    key={b.id}
                    badge={b}
                    earned={entry?.earned ?? false}
                    current={entry?.current ?? 0}
                    target={entry?.target ?? 1}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default BadgesTab;
