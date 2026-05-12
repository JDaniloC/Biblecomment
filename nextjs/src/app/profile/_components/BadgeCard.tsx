"use client";

import type { BadgeDefinition, BadgeTier } from "@/lib/badges/types";
import { BadgeIcon } from "@/components/BadgeIcon";

interface Props {
  badge: BadgeDefinition;
  earned: boolean;
  current: number;
  target: number;
}

/** Tier base colors — also used for the chip text on earned cards. */
const TIER_COLORS: Record<BadgeTier, string> = {
  bronze:   "#b87333",
  silver:   "#94a3b8",
  gold:     "#d4a017",
  platinum: "#a78bfa",
  diamond:  "#06b6d4",
  mythic:   "#be185d",
};

/** Soft background tint used behind the icon for earned badges. */
const TIER_TINTS: Record<BadgeTier, string> = {
  bronze:   "#f5e6d3",
  silver:   "#e2e8f0",
  gold:     "#fbeec5",
  platinum: "#ede9fe",
  diamond:  "#cffafe",
  mythic:   "#fce7f3",
};

const TIER_LABELS: Record<BadgeTier, string> = {
  bronze:   "Bronze",
  silver:   "Prata",
  gold:     "Ouro",
  platinum: "Platina",
  diamond:  "Diamante",
  mythic:   "Lendário",
};

/**
 * One badge in the Conquistas grid.
 *
 * Locked: padlock icon over a muted slate background, full grayscale +
 * opacity ramp so the row clearly reads as "not yet unlocked".
 *
 * Earned: the catalog icon over a tier-tinted disc, in the tier color.
 * Gold + platinum pick up a subtle outer glow so they stand out from
 * bronze/silver. Tiered badges show a colored chip ("Bronze", "Ouro"…);
 * one-shot badges drop the chip — the ✓ on the icon disc is enough.
 *
 * cypress contract preserved: `data-earned` and `data-testid` unchanged.
 */
export function BadgeCard({ badge, earned, current, target }: Props) {
  const tierColor = badge.tier ? TIER_COLORS[badge.tier] : "var(--color-brand)";
  const tierTint = badge.tier
    ? TIER_TINTS[badge.tier]
    : "var(--color-brand-tint, #e0f2fe)";
  const showProgress = !earned && target > 1;
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;

  // Gold/platinum/diamond/mythic get a soft glow so the page reads at a glance
  // which achievements are the high-tier ones. Mythic uses a stronger double-shadow.
  const premiumRing = earned && (
    badge.tier === "gold" ||
    badge.tier === "platinum" ||
    badge.tier === "diamond" ||
    badge.tier === "mythic"
  );
  const isMythic = earned && badge.tier === "mythic";

  return (
    <div
      data-testid={`badge-card-${badge.id}`}
      data-earned={earned ? "true" : "false"}
      className={[
        "relative flex gap-3 items-start p-3 rounded-lg border transition",
        earned
          ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm"
          : "bg-slate-50 dark:bg-slate-900/60 border-dashed border-slate-200 dark:border-slate-800",
      ].join(" ")}
      style={
        isMythic
          ? {
              boxShadow:
                `0 0 0 2px ${tierColor}66, ` +
                `0 6px 20px -4px ${tierColor}aa, ` +
                `0 0 24px -6px ${tierColor}88`,
            }
          : premiumRing
            ? { boxShadow: `0 0 0 1px ${tierColor}55, 0 4px 14px -6px ${tierColor}88` }
            : undefined
      }
    >
      {/* Icon disc */}
      <div
        aria-hidden="true"
        className="flex-none w-10 h-10 rounded-full flex items-center justify-center"
        style={{
          background: earned ? tierTint : undefined,
          color: earned ? tierColor : "#94a3b8",
        }}
      >
        {earned ? (
          <BadgeIcon name={badge.icon} width={22} height={22} />
        ) : (
          // Locked badges replace the catalog icon with a padlock so the
          // user knows the slot exists without spoiling the unlock art.
          <BadgeIcon name="Lock" width={20} height={20} aria-label="Bloqueado" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4
            className={[
              "font-semibold text-[14px] truncate",
              earned
                ? "text-slate-800 dark:text-slate-100"
                : "text-slate-500 dark:text-slate-400",
            ].join(" ")}
          >
            {badge.name}
          </h4>
          {earned && badge.tier && (
            <span
              className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded"
              style={{ background: tierColor, color: "#fff" }}
            >
              {TIER_LABELS[badge.tier]}
            </span>
          )}
          {!earned && (
            <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
              Bloqueado
            </span>
          )}
        </div>
        <p
          className={[
            "text-[12px] mt-0.5 line-clamp-2",
            earned
              ? "text-slate-500 dark:text-slate-400"
              : "text-slate-400 dark:text-slate-500",
          ].join(" ")}
        >
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
