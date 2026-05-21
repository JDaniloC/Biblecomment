/**
 * Badge catalog — 34 entries across 7 axes.
 *
 * To add a badge: append to BADGES with a unique `id` and a `meets()` predicate
 * over BadgeCounters. No migration needed; backfill script picks it up too.
 *
 * Tier thresholds were tuned for the BibleComment audience:
 * - Reader: Bronze 10, Silver 50, Gold 100, Platinum 250, Diamond 500,
 *   Mythic 1189 (the whole Bible).
 * - Commenter volume: Bronze 1 (first comment), Silver 10, Gold 50,
 *   Platinum 200, Diamond 500, Mythic 1000.
 * - Diversity: Bronze 3 books, Silver 15 (~half of NT), Gold 30 (~half Bible).
 */

import type { BadgeDefinition, BadgeTier } from "./types";
import { BADGE_SECTIONS, SECTION_AXIS } from "./sections";

const READER_TIERS: Array<{ id: string; tier: BadgeTier; target: number; name: string }> = [
  { id: "reader-bronze",   tier: "bronze",   target: 10,   name: "Leitor iniciante" },
  { id: "reader-silver",   tier: "silver",   target: 50,   name: "Leitor dedicado" },
  { id: "reader-gold",     tier: "gold",     target: 100,  name: "Leitor constante" },
  { id: "reader-platinum", tier: "platinum", target: 250,  name: "Leitor experiente" },
  { id: "reader-diamond",  tier: "diamond",  target: 500,  name: "Leitor incansável" },
  { id: "reader-mythic",   tier: "mythic",   target: 1189, name: "Bíblia inteira lida" },
];

const COMMENTER_TIERS: Array<{ id: string; tier: BadgeTier; target: number; name: string }> = [
  { id: "commenter-bronze",   tier: "bronze",   target: 1,    name: "Primeiro comentário" },
  { id: "commenter-silver",   tier: "silver",   target: 10,   name: "Comentarista atuante" },
  { id: "commenter-gold",     tier: "gold",     target: 50,   name: "Comentarista assíduo" },
  { id: "commenter-platinum", tier: "platinum", target: 200,  name: "Comentarista veterano" },
  { id: "commenter-diamond",  tier: "diamond",  target: 500,  name: "Comentarista mestre" },
  { id: "commenter-mythic",   tier: "mythic",   target: 1000, name: "Comentarista lendário" },
];

const DIVERSITY_TIERS: Array<{ id: string; tier: BadgeTier; target: number; name: string }> = [
  { id: "diverse-bronze", tier: "bronze", target: 3,  name: "Explorador (3 livros)" },
  { id: "diverse-silver", tier: "silver", target: 15, name: "Explorador (15 livros)" },
  { id: "diverse-gold",   tier: "gold",   target: 30, name: "Explorador (30 livros)" },
];

const READER_BADGES: BadgeDefinition[] = READER_TIERS.map((t) => ({
  id: t.id,
  axis: "reader-volume",
  tier: t.tier,
  name: t.name,
  description: `Marque ${t.target} ${t.target === 1 ? "capítulo" : "capítulos"} como lidos.`,
  icon: "BookOpen",
  meets: (c) => c.chaptersRead >= t.target,
  progress: (c) => ({ current: Math.min(c.chaptersRead, t.target), target: t.target }),
}));

// Streak tiers reward the daily reading HABIT (consecutive days), as
// opposed to READER_TIERS which reward cumulative volume.
const STREAK_TIERS: Array<{ id: string; tier: BadgeTier; target: number; name: string }> = [
  { id: "streak-bronze",  tier: "bronze",  target: 7,   name: "Sequência de 7 dias" },
  { id: "streak-silver",  tier: "silver",  target: 30,  name: "Sequência de 30 dias" },
  { id: "streak-gold",    tier: "gold",    target: 100, name: "Sequência de 100 dias" },
  { id: "streak-diamond", tier: "diamond", target: 365, name: "Sequência de 365 dias" },
];

const STREAK_BADGES: BadgeDefinition[] = STREAK_TIERS.map((t) => ({
  id: t.id,
  axis: "reader-streak",
  tier: t.tier,
  name: t.name,
  description: `Leia ao menos um capítulo por ${t.target} dias seguidos.`,
  icon: "Flame",
  meets: (c) => c.readingStreak >= t.target,
  progress: (c) => ({
    current: Math.min(c.readingStreak, t.target),
    target: t.target,
  }),
}));

const SECTION_BADGES: BadgeDefinition[] = BADGE_SECTIONS.map((s) => ({
  id: `section-${s.id}`,
  axis: SECTION_AXIS,
  name: s.name,
  description: `Leia todos os capítulos ${s.shortName}.`,
  icon: "ScrollText",
  meets: (c) => c.completedSections.has(s.id),
  progress: (c) => ({ current: c.completedSections.has(s.id) ? 1 : 0, target: 1 }),
}));

const COMMENTER_ICON: Record<BadgeTier, string> = {
  bronze:   "MessageCircle",
  silver:   "MessageCircle",
  gold:     "MessageCircle",
  platinum: "MessageCircle",
  diamond:  "Gem",
  mythic:   "Crown",
};

const COMMENTER_BADGES: BadgeDefinition[] = COMMENTER_TIERS.map((t) => ({
  id: t.id,
  axis: "commenter-volume",
  tier: t.tier,
  name: t.name,
  description: `Publique ${t.target} ${t.target === 1 ? "comentário" : "comentários"}.`,
  icon: COMMENTER_ICON[t.tier],
  meets: (c) => c.commentsCount >= t.target,
  progress: (c) => ({ current: Math.min(c.commentsCount, t.target), target: t.target }),
}));

const DIVERSITY_BADGES: BadgeDefinition[] = DIVERSITY_TIERS.map((t) => ({
  id: t.id,
  axis: "commenter-diversity",
  tier: t.tier,
  name: t.name,
  description: `Comente em ${t.target} livros diferentes da Bíblia.`,
  icon: "LibraryBig",
  meets: (c) => c.commentBooks >= t.target,
  progress: (c) => ({ current: Math.min(c.commentBooks, t.target), target: t.target }),
}));

const COMMENT_TAG_BADGES: BadgeDefinition[] = (
  [
    { tag: "devocional", name: "Primeiro comentário devocional", icon: "Sparkle" },
    { tag: "exegese",    name: "Primeiro comentário de exegese", icon: "BookOpenCheck" },
    { tag: "pessoal",    name: "Primeiro comentário pessoal",    icon: "Smile" },
    { tag: "inspirado",  name: "Primeiro comentário inspirado",  icon: "Feather" },
  ] as const
).map((t) => ({
  id: `first-comment-${t.tag}`,
  axis: "commenter-tags",
  name: t.name,
  description: `Publique um comentário marcado como "${t.tag.charAt(0).toUpperCase() + t.tag.slice(1)}".`,
  icon: t.icon,
  meets: (c) => c.commentTagsUsed.has(t.tag),
  progress: (c) => ({ current: c.commentTagsUsed.has(t.tag) ? 1 : 0, target: 1 }),
}));

const FIRST_TIME_BADGES: BadgeDefinition[] = [
  {
    id: "first-read",
    axis: "interaction",
    name: "Primeira leitura",
    description: "Marque seu primeiro capítulo como lido.",
    icon: "BookmarkCheck",
    meets: (c) => c.chaptersRead >= 1,
    progress: (c) => ({ current: c.chaptersRead >= 1 ? 1 : 0, target: 1 }),
  },
  {
    id: "first-like",
    axis: "interaction",
    name: "Primeira curtida",
    description: "Curta um comentário pela primeira vez.",
    icon: "Heart",
    meets: (c) => c.hasGivenLike,
    progress: (c) => ({ current: c.hasGivenLike ? 1 : 0, target: 1 }),
  },
  {
    id: "first-discussion",
    axis: "interaction",
    name: "Primeira discussão",
    description: "Abra sua primeira discussão sobre um versículo.",
    icon: "MessagesSquare",
    meets: (c) => c.hasOpenedDiscussion,
    progress: (c) => ({ current: c.hasOpenedDiscussion ? 1 : 0, target: 1 }),
  },
  {
    id: "first-answer",
    axis: "interaction",
    name: "Primeira resposta",
    description: "Responda uma discussão pela primeira vez.",
    icon: "Reply",
    meets: (c) => c.hasAnsweredDiscussion,
    progress: (c) => ({ current: c.hasAnsweredDiscussion ? 1 : 0, target: 1 }),
  },
  {
    id: "first-mention",
    axis: "interaction",
    name: "Primeira menção",
    description: "Mencione outro usuário com @ em um comentário ou resposta.",
    icon: "AtSign",
    meets: (c) => c.hasMentioned,
    progress: (c) => ({ current: c.hasMentioned ? 1 : 0, target: 1 }),
  },
];

export const BADGES: BadgeDefinition[] = [
  ...READER_BADGES,
  ...STREAK_BADGES,
  ...SECTION_BADGES,
  ...COMMENTER_BADGES,
  ...DIVERSITY_BADGES,
  ...COMMENT_TAG_BADGES,
  ...FIRST_TIME_BADGES,
];

const BY_ID = new Map(BADGES.map((b) => [b.id, b] as const));

export function getBadge(id: string): BadgeDefinition | undefined {
  return BY_ID.get(id);
}

export function badgesByAxis(axis: BadgeDefinition["axis"]): BadgeDefinition[] {
  return BADGES.filter((b) => b.axis === axis);
}
