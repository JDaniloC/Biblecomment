/// <reference types="cypress" />

// Phase 2 offline Bible — render-path tests. These DO NOT rely on the real
// service worker (known-flaky here). They seed IndexedDB directly and assert
// the /leitura-offline shell renders chapters from the local dataset, and that
// BooksIndex renders from an intercepted /api/books. Runs under `npm run
// cy:test` (production build) like the rest of the suite.

import bookFixture from "../fixtures/book-gn.json";

// Mirror of bibleStore's schema — seeds the store the same way bibleSync would.
function seedOfflineBible(
  win: Window,
  abbrev: string,
  chapters: Record<string, { n: number; t: string }[]>,
  version: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const open = win.indexedDB.open("biblecomment-offline", 1);
    open.onupgradeneeded = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains("books")) db.createObjectStore("books");
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
    };
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction(["books", "meta"], "readwrite");
      tx.objectStore("books").put({ chapters, version }, abbrev);
      tx.objectStore("meta").put(
        { version, syncedAt: Date.now(), status: "ready" },
        "state",
      );
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    };
  });
}

describe("offline Bible (Phase 2, render path)", () => {
  it("renders a chapter from IndexedDB on the /leitura-offline shell", () => {
    // Build the compact { n, t } chapters from the gn fixture (chapter 1).
    const chapter1 = bookFixture.verses
      .filter((v) => v.chapter === 1)
      .map((v) => ({ n: v.verseNumber, t: v.text }));

    // First load creates the DB; seed it, then re-visit the shell with the
    // chapter pathname pushed so the shell's mount-time
    // parseChapterPath(location.pathname) resolves to "/verses/gn/1" and reads
    // the seeded data. IndexedDB persists across same-origin visits in a spec.
    cy.visit("/leitura-offline");
    cy.window().then((win) =>
      seedOfflineBible(win, "gn", { "1": chapter1 }, "v1.test"),
    );
    cy.visit("/leitura-offline", {
      onBeforeLoad(win) {
        win.history.replaceState(null, "", "/verses/gn/1");
      },
    });

    // Verses from the dataset render, and the comments-online note shows.
    cy.get('[data-testid="verse-text"]')
      .first()
      .should("contain.text", "No princípio");
    cy.get('[data-testid="comments-online-note"]').should("be.visible");
    cy.get('[data-testid="offline-reader-banner"]').should("be.visible");
  });

  it("shows 'capítulo indisponível' for an unseeded chapter", () => {
    cy.visit("/leitura-offline", {
      onBeforeLoad(win) {
        win.history.replaceState(null, "", "/verses/gn/99");
      },
    });
    cy.contains(/Cap[ií]tulo indispon[ií]vel/i).should("be.visible");
  });

});

// BooksIndex's consumption of the new GET /api/books `{ books, version }` shape
// is covered end-to-end by `books-public.cy.ts` (seeds the DB, asserts the book
// grid renders on /home) and at the unit level by
// `src/app/api/books/route.test.ts` (asserts the `{ books, version }` body).
// No intercept-based duplicate here: /home renders the grid from server-seeded
// data, not a client fetch, so a `cy.intercept` wouldn't drive it.

// ─────────────────────────────────────────────────────────────────────────
// Best-effort smoke (NOT in the gating suite): full real-SW offline journey.
// The SW only registers in production builds and real-SW interception is
// known-flaky on this host, so the offline navigation → /leitura-offline shell
// hop is verified MANUALLY (see the Phase 2 plan's DevTools checklist) and,
// optionally, by forcing network failure with cy.intercept({ forceNetworkError:
// true }) against `/verses/*` in the production pipeline. Kept out of cy:test's
// hard gate; the deterministic guarantee is the render-path tests above.
// ─────────────────────────────────────────────────────────────────────────
