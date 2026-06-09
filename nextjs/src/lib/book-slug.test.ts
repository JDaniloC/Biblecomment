import { describe, it, expect } from "vitest";
import { bookSlug, resolveBookBySlug, testamentLabel } from "./book-slug";
import type { Book } from "@/domain/entities/Book";

const mk = (name: string, abbrev: string): Book => ({
  abbrev,
  name,
  author: "x",
  chapters: 1,
  group: "g",
  testament: "VT",
});

describe("bookSlug", () => {
  it("strips accents and lowercases", () => {
    expect(bookSlug("Gênesis")).toBe("genesis");
    expect(bookSlug("Êxodo")).toBe("exodo");
    expect(bookSlug("Levítico")).toBe("levitico");
  });
  it("turns numbers and spaces into hyphenated segments", () => {
    expect(bookSlug("1 Coríntios")).toBe("1-corintios");
    expect(bookSlug("2 Reis")).toBe("2-reis");
  });
  it("handles multi-word names", () => {
    expect(bookSlug("Cantares de Salomão")).toBe("cantares-de-salomao");
  });
});

describe("resolveBookBySlug", () => {
  const books = [mk("Gênesis", "gn"), mk("1 Coríntios", "1co"), mk("João", "jo")];
  it("finds a book by its slug", () => {
    expect(resolveBookBySlug("genesis", books)?.abbrev).toBe("gn");
    expect(resolveBookBySlug("1-corintios", books)?.abbrev).toBe("1co");
  });
  it("returns null for an unknown slug", () => {
    expect(resolveBookBySlug("xyz", books)).toBeNull();
  });
  it("produces distinct slugs for tricky real names (no collisions)", () => {
    const names = [
      "Gênesis", "Êxodo", "Levítico", "João", "1 João", "2 João", "3 João",
      "1 Coríntios", "2 Coríntios", "Cantares de Salomão",
    ];
    const slugs = names.map(bookSlug);
    expect(new Set(slugs).size).toBe(names.length);
  });
});

describe("testamentLabel", () => {
  it("maps stored VT/NT codes to full labels", () => {
    expect(testamentLabel("VT")).toBe("Antigo Testamento");
    expect(testamentLabel("NT")).toBe("Novo Testamento");
  });
  it("passes through already-full labels", () => {
    expect(testamentLabel("Antigo Testamento")).toBe("Antigo Testamento");
    expect(testamentLabel("Novo Testamento")).toBe("Novo Testamento");
  });
});
