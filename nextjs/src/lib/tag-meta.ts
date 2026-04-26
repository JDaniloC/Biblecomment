export interface TagMeta {
  label: string;
  color: string;
  bg: string;
  border: string;
}

export const TAG_META: Record<string, TagMeta> = {
  devocional: { label: "Devocional", color: "#4f46e5", bg: "rgba(79,70,229,0.08)",  border: "#4f46e5" },
  exegese:    { label: "Exegese",    color: "#0d9488", bg: "rgba(13,148,136,0.08)", border: "#0d9488" },
  exegetico:  { label: "Exegese",    color: "#0d9488", bg: "rgba(13,148,136,0.08)", border: "#0d9488" },
  pessoal:    { label: "Pessoal",    color: "#d97706", bg: "rgba(217,119,6,0.08)",  border: "#d97706" },
  inspirado:  { label: "Inspirado",  color: "#7c3aed", bg: "rgba(124,58,237,0.08)", border: "#8b5cf6" },
};

export const TAG_ORDER = ["devocional", "exegese", "pessoal", "inspirado"] as const;

export function getTagMeta(tags: string[]): TagMeta | null {
  for (const t of TAG_ORDER) {
    if (tags.includes(t)) return TAG_META[t];
  }
  return null;
}

const NEUTRAL: TagMeta = {
  label: "Comentário",
  color: "#64748b",
  bg: "rgba(100,116,139,0.08)",
  border: "#64748b",
};

export function getTagMetaOrNeutral(tags: string[]): TagMeta {
  return getTagMeta(tags) ?? NEUTRAL;
}
