/**
 * Unified search — API + UI.
 *
 * The /api/search/unified endpoint short-circuits at < 2 chars; otherwise
 * runs case-insensitive regex over verses and comments in parallel.
 * SearchInput (Header, compact) and OmniSearch (chapter, full-width)
 * both consume it via the useUnifiedSearch hook.
 */

import users from "../fixtures/users.json";
import bookFixture from "../fixtures/book-gn.json";

function getVerseId(
  abbrev: string,
  chapter: number,
  verseNumber: number,
): Cypress.Chainable<string> {
  return cy.request("GET", `/api/books/${abbrev}/verses/${chapter}`).then((res) => {
    const verse = (res.body as Array<{ _id: string; verseNumber: number }>).find(
      (v) => v.verseNumber === verseNumber,
    );
    expect(verse, `verse ${abbrev} ${chapter}:${verseNumber} should be seeded`).to.exist;
    return verse!._id;
  });
}

describe("Unified search", () => {
  beforeEach(() => {
    cy.resetDb();
    cy.seedDb({
      users: [users.alice, users.bob],
      books: [bookFixture.book],
      verses: bookFixture.verses,
    });
  });

  describe("API — /api/search/unified", () => {
    it("empty query returns empty arrays", () => {
      cy.request("/api/search/unified?q=").then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.verses).to.deep.eq([]);
        expect(res.body.comments).to.deep.eq([]);
      });
    });

    it("single-char query returns empty (under 2-char threshold)", () => {
      cy.request("/api/search/unified?q=a").then((res) => {
        expect(res.body.verses).to.deep.eq([]);
        expect(res.body.comments).to.deep.eq([]);
      });
    });

    it("matches verses case-insensitively (Deus → 1:1 and 1:3)", () => {
      cy.request("/api/search/unified?q=Deus").then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.verses).to.have.length(2);
        const refs = (res.body.verses as Array<{ verseNumber: number }>)
          .map((v) => v.verseNumber)
          .sort();
        expect(refs).to.deep.eq([1, 3]);
      });

      // Lowercase form of the same query → same matches.
      cy.request("/api/search/unified?q=deus").then((res) => {
        expect(res.body.verses).to.have.length(2);
      });
    });

    it("matches comments alongside verses", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      getVerseId("gn", 1, 1).then((verseId) => {
        cy.request({
          method: "POST",
          url: `/api/comments/${verseId}`,
          body: {
            text: "Reflexão sobre a criação dos céus e da terra",
            tags: ["devocional"],
          },
        });
      });

      cy.request("/api/search/unified?q=criação").then((res) => {
        expect(res.body.comments).to.have.length(1);
        expect(res.body.comments[0]).to.deep.include({
          username: "alice",
          abbrev: "gn",
          chapter: 1,
          verse: 1,
        });
      });
    });

    it("no matches returns empty arrays (200, not 404)", () => {
      cy.request("/api/search/unified?q=zzznonexistent").then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.verses).to.deep.eq([]);
        expect(res.body.comments).to.deep.eq([]);
      });
    });

    it("escapes regex metacharacters (no ReDoS via .* etc.)", () => {
      cy.request("/api/search/unified?q=.%2B%2A").then((res) => {
        // Treats ".+*" as literal text → no matches against the seeded prose.
        expect(res.status).to.eq(200);
        expect(res.body.verses).to.deep.eq([]);
      });
    });
  });

  describe("UI — header search input", () => {
    it("typing < 2 chars does NOT open the dropdown", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      // The shared <Header> with SearchInput lives on / (root). /home has
      // its own page-specific header without the search component.
      cy.visit("/");

      cy.get('input[placeholder*="versículo" i], input[placeholder*="verse" i]')
        .first()
        .type("D");

      cy.contains("Escrituras").should("not.exist");
    });

    it("typing 2+ chars debounces and shows verse results in the dropdown", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      cy.visit("/");

      cy.get('input[placeholder*="versículo" i], input[placeholder*="verse" i]')
        .first()
        .type("Deus");

      // The verse content showing up is the actionable signal — the
      // "Escrituras" section label has tight letter-spacing + 10px font
      // that makes Cypress's be.visible heuristic flaky. The next test
      // proves the dropdown is interactive by clicking through.
      cy.contains("No princípio, Deus criou", { timeout: 5000 }).should("be.visible");
    });

    it("clicking a verse result navigates to /verses/<abbrev>/<chapter>", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      cy.visit("/");

      cy.get('input[placeholder*="versículo" i], input[placeholder*="verse" i]')
        .first()
        .type("Deus");

      cy.contains("No princípio, Deus criou", { timeout: 5000 }).click();
      cy.url({ timeout: 5000 }).should("match", /\/verses\/gn\/1(#1)?$/);
    });
  });
});
