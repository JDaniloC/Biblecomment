/**
 * Home book grid → chapter picker modal.
 *
 * Regression: clicking a book used to jump straight to chapter 1, making
 * any other chapter awkward to reach. Now a modal opens listing every
 * chapter of the selected book, and only after the user picks one does
 * navigation happen.
 */

import users from "../fixtures/users.json";
import bookFixture from "../fixtures/book-gn.json";

describe("Home — chapter picker", () => {
  beforeEach(() => {
    cy.resetDb();
    cy.seedDb({
      users: [users.alice],
      books: [bookFixture.book],
      verses: bookFixture.verses,
    });
    cy.loginAs(users.alice.email, users.alice.password);
  });

  it("opens the picker on book click without navigating", () => {
    cy.visit("/home");

    // No picker on initial load.
    cy.get('[data-testid="chapter-picker-grid"]').should("not.exist");

    cy.get(`[data-testid="book-${bookFixture.book.abbrev}"]`).click();

    cy.get('[data-testid="chapter-picker-grid"]').should("be.visible");

    // Still on /home — the click should NOT have navigated anywhere.
    cy.location("pathname").should("eq", "/home");
  });

  it("lists exactly N chapter buttons for the selected book", () => {
    cy.visit("/home");
    cy.get(`[data-testid="book-${bookFixture.book.abbrev}"]`).click();

    cy.get('[data-testid="chapter-picker-grid"]')
      .find('[data-testid^="chapter-picker-chapter-"]')
      .should("have.length", bookFixture.book.chapters);
  });

  it("navigates to /verses/{abbrev}/{n} when a chapter is picked", () => {
    cy.visit("/home");
    cy.get(`[data-testid="book-${bookFixture.book.abbrev}"]`).click();

    // Pick a non-first chapter — the previous behavior always landed on 1,
    // so asserting on 7 catches the regression directly.
    cy.get('[data-testid="chapter-picker-chapter-7"]').click();

    cy.location("pathname", { timeout: 10000 }).should(
      "eq",
      `/verses/${bookFixture.book.abbrev}/7`,
    );
  });

  it("closes the picker on Escape without navigating", () => {
    cy.visit("/home");
    cy.get(`[data-testid="book-${bookFixture.book.abbrev}"]`).click();
    cy.get('[data-testid="chapter-picker-grid"]').should("be.visible");

    cy.get("body").type("{esc}");

    cy.get('[data-testid="chapter-picker-grid"]').should("not.exist");
    cy.location("pathname").should("eq", "/home");
  });
});
