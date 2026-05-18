export type TagIconName = "sunrise" | "book-open" | "user" | "pen" | "comment";

export interface TagMeta {
  label: string;
  color: string;
  bg: string;
  border: string;
  /** Inline SVG icon name; rendered by <TagIcon name=... /> */
  icon: TagIconName;
}

// Each tag needs to be visually distinct at a glance. Devocional moved from
// indigo (#4f46e5) to rose (#e11d48) because it was reading as the same hue
// as Inspirado's violet (#7c3aed) in the chapter sidebar.
export const TAG_META: Record<string, TagMeta> = {
  devocional: { label: "Devocional", color: "#e11d48", bg: "rgba(225,29,72,0.08)",  border: "#e11d48", icon: "sunrise" },
  exegese:    { label: "Exegese",    color: "#0d9488", bg: "rgba(13,148,136,0.08)", border: "#0d9488", icon: "book-open" },
  exegetico:  { label: "Exegese",    color: "#0d9488", bg: "rgba(13,148,136,0.08)", border: "#0d9488", icon: "book-open" },
  pessoal:    { label: "Pessoal",    color: "#d97706", bg: "rgba(217,119,6,0.08)",  border: "#d97706", icon: "user" },
  inspirado:  { label: "Inspirado",  color: "#7c3aed", bg: "rgba(124,58,237,0.08)", border: "#8b5cf6", icon: "pen" },
};

// Ordered most personal → most studied. Drives badge/compose/edit order and,
// via getTagMeta, which tag colors the comment card's left border.
export const TAG_ORDER = ["pessoal", "devocional", "inspirado", "exegese"] as const;

function normalizeTags(tags: string[]): string[] {
  // "exegetico" is a legacy alias for "exegese" (same TAG_META entry, but
  // only "exegese" is in TAG_ORDER) — fold it so it isn't dropped.
  return tags.map((t) => (t === "exegetico" ? "exegese" : t));
}

export function getTagMeta(tags: string[]): TagMeta | null {
  const norm = normalizeTags(tags);
  for (const t of TAG_ORDER) {
    if (norm.includes(t)) return TAG_META[t];
  }
  return null;
}

const NEUTRAL: TagMeta = {
  label: "Comentário",
  color: "#64748b",
  bg: "rgba(100,116,139,0.08)",
  border: "#64748b",
  icon: "comment",
};

export function getTagMetaOrNeutral(tags: string[]): TagMeta {
  return getTagMeta(tags) ?? NEUTRAL;
}

/**
 * All categories of a comment as ordered, deduped metas (most personal →
 * most studied). Empty / no-known-tag input yields `[NEUTRAL]` so callers
 * never special-case the "Comentário" fallback. `getTagMetas(t)[0]` always
 * equals `getTagMetaOrNeutral(t)`.
 */
export function getTagMetas(tags: string[]): TagMeta[] {
  const norm = normalizeTags(tags);
  const metas = TAG_ORDER.filter((t) => norm.includes(t)).map(
    (t) => TAG_META[t],
  );
  return metas.length > 0 ? metas : [NEUTRAL];
}
