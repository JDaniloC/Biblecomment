"use client";

import type { BadgeDefinition, BadgeTier } from "@/lib/badges/types";

interface Props {
  badge: BadgeDefinition;
  earned: boolean;
  current: number;
  target: number;
}

const TIER_COLORS: Record<BadgeTier, string> = {
  bronze:   "#b87333",
  silver:   "#94a3b8",
  gold:     "#d4a017",
  platinum: "#a78bfa",
};

/**
 * One badge in the Conquistas grid.
 *
 * Earned: shows in tier colour with the tier label chip.
 * Locked: grayscale with progress bar (current/target). The progress numbers
 * are computed server-side by GetUserBadgesUseCase and passed in — keeps the
 * client free of repo dependencies.
 *
 * The icon is rendered as a coloured circle with the first letter of the
 * lucide name. Real icons can be plugged in later without touching consumers.
 */
export function BadgeCard({ badge, earned, current, target }: Props) {
  const tierColor = badge.tier ? TIER_COLORS[badge.tier] : "var(--color-brand)";
  const initial = (badge.icon[0] ?? "?").toUpperCase();
  const showProgress = !earned && target > 1;
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;

  return (
    <div
      data-testid={`badge-card-${badge.id}`}
      data-earned={earned ? "true" : "false"}
      className={[
        "relative flex gap-3 items-start p-3 rounded-lg border transition",
        earned
          ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-70",
      ].join(" ")}
    >
      <div
        aria-hidden="true"
        className={[
          "flex-none w-10 h-10 rounded-full flex items-center justify-center font-bold text-white",
          earned ? "" : "grayscale",
        ].join(" ")}
        style={{ background: earned ? tierColor : "#94a3b8" }}
      >
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-[14px] text-slate-800 dark:text-slate-100 truncate">
            {badge.name}
          </h4>
          {earned && (
            <span
              className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded"
              style={{ background: tierColor, color: "#fff" }}
            >
              {badge.tier ?? "ok"}
            </span>
          )}
        </div>
        <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
          {badge.description}
        </p>
        {showProgress && (
          <div className="mt-2">
            <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
              <span>Progresso</span>
              <span>{current}/{target}</span>
            </div>
            <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-sm overflow-hidden">
              <div
                className="h-full transition-[width] duration-500"
                style={{ width: `${pct}%`, background: "var(--color-brand)" }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
