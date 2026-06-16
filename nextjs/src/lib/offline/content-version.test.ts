import { describe, it, expect } from "vitest";
import { computeContentVersion, CONTENT_VERSION_SALT } from "./content-version";
import type { Book } from "@/domain/entities/Book";

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

describe("computeContentVersion", () => {
  it("returns a stable, non-empty string for the same corpus", () => {
    const books = [book("gn", 50), book("ex", 40)];
    const first = computeContentVersion(books);
    const second = computeContentVersion([...books]);
    expect(first).toBe(second);
    expect(first.length).toBeGreaterThan(0);
  });

  it("is order-independent (sorts before hashing)", () => {
    const ascending = computeContentVersion([book("gn", 50), book("ex", 40)]);
    const descending = computeContentVersion([book("ex", 40), book("gn", 50)]);
    expect(ascending).toBe(descending);
  });

  it("changes when a book's chapter count changes", () => {
    const before = computeContentVersion([book("gn", 50)]);
    const after = computeContentVersion([book("gn", 51)]);
    expect(before).not.toBe(after);
  });

  it("changes when the number of books changes", () => {
    const oneBook = computeContentVersion([book("gn", 50)]);
    const twoBooks = computeContentVersion([book("gn", 50), book("ex", 40)]);
    expect(oneBook).not.toBe(twoBooks);
  });

  it("embeds the salt so verse-only corrections can force a re-sync", () => {
    expect(computeContentVersion([book("gn", 50)])).toContain(CONTENT_VERSION_SALT);
  });
});
