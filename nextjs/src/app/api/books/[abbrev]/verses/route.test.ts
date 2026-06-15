import { describe, it, expect } from "vitest";
import type { Verse } from "@/domain/entities/Verse";
import { buildBookVersesResponse } from "./buildResponse";

function verse(chapter: number, verseNumber: number, text: string): Verse {
  return { abbrev: "gn", chapter, verseNumber, text };
}

describe("buildBookVersesResponse", () => {
  it("groups verses by chapter into the compact { n, t } shape", async () => {
    const res = buildBookVersesResponse("gn", [
      verse(1, 1, "No princípio"),
      verse(1, 2, "A terra era sem forma"),
      verse(2, 1, "Assim foram acabados"),
    ]);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      abbrev: "gn",
      chapters: {
        "1": [
          { n: 1, t: "No princípio" },
          { n: 2, t: "A terra era sem forma" },
        ],
        "2": [{ n: 1, t: "Assim foram acabados" }],
      },
    });
  });

  it("sets immutable long-lived cache headers", () => {
    const res = buildBookVersesResponse("gn", [verse(1, 1, "x")]);
    expect(res.headers.get("Cache-Control")).toBe(
      "public, max-age=86400, immutable",
    );
  });

  it("returns 404 for a book with no verses", async () => {
    const res = buildBookVersesResponse("zz", []);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "Book not found" });
  });
});
