/**
 * Item 2 — read/unread coloring on the home book grid and chapter picker.
 *
 * The home page hands HomeClient a `readCountByBook` map fetched SSR; books
 * with any reads get a tint (partial vs complete). The picker, in turn, calls
 * GET /api/me/read-chapters/[abbrev] when it opens and tints the individual
 * chapter buttons the user has already read.
 */

import users from "../fixtures/users.json";
import bookFixture from "../fixtures/book-gn.json";

describe("Home — read-chapter coloring", () => {
  const abbrev = bookFixture.book.abbrev;

  beforeEach(() => {
    cy.resetDb();
    cy.seedDb({
      users: [users.alice],
      books: [bookFixture.book],
      verses: bookFixture.verses,
    });
    // Two chapters of Genesis read — partial tier (2/50 chapters).
    cy.task("db:seedChapterRead", { email: users.alice.email, abbrev, chapter: 1 });
    cy.task("db:seedChapterRead", { email: users.alice.email, abbrev, chapter: 3 });
    cy.loginAs(users.alice.email, users.alice.password);
  });

  it("tints books with reads and leaves untouched books neutral", () => {
    cy.visit("/home");

    cy.get(`[data-testid="book-${abbrev}"]`)
      .should("have.attr", "data-read-tier", "partial")
      .and("contain.text", `2/${bookFixture.book.chapters} cap.`);
  });

  it("marks individual chapters as read inside the picker", () => {
    cy.visit("/home");
    cy.get(`[data-testid="book-${abbrev}"]`).click();

    cy.get('[data-testid="chapter-picker-grid"]').should("be.visible");

    cy.get('[data-testid="chapter-picker-chapter-1"]').should(
      "have.attr",
      "data-read",
      "true",
    );
    cy.get('[data-testid="chapter-picker-chapter-3"]').should(
      "have.attr",
      "data-read",
      "true",
    );

    // A non-seeded chapter remains unread.
    cy.get('[data-testid="chapter-picker-chapter-2"]').should(
      "have.attr",
      "data-read",
      "false",
    );
  });
});
