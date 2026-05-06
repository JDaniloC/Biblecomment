/**
 * Literary-section mapping for `section-*` badges.
 *
 * Source: scripts/migrate-sqlite-to-mongo.js BOOK_META — the canonical mapping
 * from book abbrev → group used to seed the `Book.group` field. The badge
 * sections collapse Mongo `group` values into the 6 buckets we expose to users.
 *
 * Apocalipse (ap, group="Apocalipse") is intentionally NOT part of any section
 * — it stays as a single-book island. Users still need it for `reader-platinum`
 * (Bíblia inteira), but it doesn't gate any section badge.
 */

import type { BadgeAxis } from "./types";

export interface SectionDefinition {
  /** Used as suffix for the badge id: `section-${id}`. */
  id: string;
  /** PT-BR display name for the badge UI. */
  name: string;
  /** Description used as the badge `description` (auto-templated). */
  shortName: string;
  /** Mongo `Book.group` values that compose this section. */
  groups: string[];
}

export const BADGE_SECTIONS: SectionDefinition[] = [
  {
    id: "pentateuco",
    name: "Pentateuco completo",
    shortName: "do Pentateuco",
    groups: ["Pentateuco"],
  },
  {
    id: "historicos",
    name: "Livros históricos",
    shortName: "dos livros históricos",
    groups: ["Históricos"],
  },
  {
    id: "sabedoria",
    name: "Livros de sabedoria",
    shortName: "dos livros de sabedoria",
    groups: ["Poéticos"],
  },
  {
    id: "profetas",
    name: "Profetas",
    shortName: "dos livros proféticos",
    groups: ["Profetas Maiores", "Profetas Menores"],
  },
  {
    id: "evangelhos",
    name: "Evangelhos e Atos",
    shortName: "dos Evangelhos e Atos",
    groups: ["Evangelhos", "Atos"],
  },
  {
    id: "cartas",
    name: "Cartas apostólicas",
    shortName: "das cartas apostólicas",
    groups: ["Cartas Paulinas", "Hebreus", "Cartas Gerais"],
  },
];

/** Axis identifier used for section badges, exported for catalog wiring. */
export const SECTION_AXIS: BadgeAxis = "reader-section";
