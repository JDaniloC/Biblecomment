import { describe, it, expect } from "vitest";
import type { Book } from "@/domain/entities/Book";
import { buildBooksResponse } from "./buildResponse";

function book(abbrev: string, chapters: number): Book {
  return {
    abbrev,
    chapters,
    name: abbrev.toUpperCase(),
    author: "x",
    group: "g",
    testament: "VT",
  };
}

describe("buildBooksResponse", () => {
  it("wraps the books array and a content version", async () => {
    const books = [book("gn", 50), book("ex", 40)];
    const res = buildBooksResponse(books);
    const body = await res.json();
    expect(body.books).toEqual(books);
    expect(typeof body.version).toBe("string");
    expect(body.version.length).toBeGreaterThan(0);
  });

  it("the version matches computeContentVersion for the same corpus", async () => {
    const { computeContentVersion } = await import(
      "@/lib/offline/content-version"
    );
    const books = [book("gn", 50)];
    const body = await buildBooksResponse(books).json();
    expect(body.version).toBe(computeContentVersion(books));
  });
});
