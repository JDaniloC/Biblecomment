import type { Book } from "@/domain/entities/Book";
import { computeContentVersion } from "@/lib/offline/content-version";

// Pure builder (no Next/next-auth imports) so the shape + version are
// unit-testable in Vitest's node env. Returns a standard Web Response, which
// App Router route handlers accept directly. The offline sync reads `version`
// to decide whether the local dataset is stale; `books` is the same list
// BooksIndex already renders.
export function buildBooksResponse(books: Book[]): Response {
  return new Response(
    JSON.stringify({ books, version: computeContentVersion(books) }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}
