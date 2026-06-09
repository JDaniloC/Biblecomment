import type { Book } from "@/domain/entities/Book";

/**
 * Slugify a Portuguese book name into an ASCII, URL-safe slug.
 * "Genesis" -> "genesis", "1 Corintios" -> "1-corintios".
 * Strips combining diacritical marks via NFD decomposition + \p{Mn} so the
 * source stays pure ASCII (no literal combining characters baked in).
 */
export function bookSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "") // strip combining diacritical marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // non-alphanumerics -> hyphen
    .replace(/^-+|-+$/g, ""); // trim leading/trailing hyphens
}

/**
 * Resolve a slug back to a Book by slugifying each book's name and matching.
 * `slug` is re-slugified so a raw name also resolves. Returns null on no match.
 */
export function resolveBookBySlug(slug: string, books: Book[]): Book | null {
  const target = bookSlug(slug);
  return books.find((b) => bookSlug(b.name) === target) ?? null;
}

/**
 * Map the stored testament code ("VT"/"NT") to a human label, matching the
 * "Antigo Testamento" / "Novo Testamento" wording used in BooksIndex. Any
 * already-expanded or unknown value passes through unchanged via the fallback.
 */
export function testamentLabel(testament: string): string {
  const t = testament.trim().toUpperCase();
  if (t === "VT") return "Antigo Testamento";
  if (t === "NT") return "Novo Testamento";
  return testament;
}
