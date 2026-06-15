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
    const a = computeContentVersion(books);
    const b = computeContentVersion([...books]);
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(0);
  });

  it("is order-independent (sorts before hashing)", () => {
    const a = computeContentVersion([book("gn", 50), book("ex", 40)]);
    const b = computeContentVersion([book("ex", 40), book("gn", 50)]);
    expect(a).toBe(b);
  });

  it("changes when a book's chapter count changes", () => {
    const a = computeContentVersion([book("gn", 50)]);
    const b = computeContentVersion([book("gn", 51)]);
    expect(a).not.toBe(b);
  });

  it("changes when the number of books changes", () => {
    const a = computeContentVersion([book("gn", 50)]);
    const b = computeContentVersion([book("gn", 50), book("ex", 40)]);
    expect(a).not.toBe(b);
  });

  it("embeds the salt so verse-only corrections can force a re-sync", () => {
    expect(computeContentVersion([book("gn", 50)])).toContain(CONTENT_VERSION_SALT);
  });
});
