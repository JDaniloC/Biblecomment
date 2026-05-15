/**
 * /home (Livros) is public. Anonymous visitors see the book grid but the
 * social feed is replaced by a create-account call-to-action. Authenticated
 * users still get the full feed.
 */

import users from "../fixtures/users.json";
import bookFixture from "../fixtures/book-gn.json";

describe("Public books page", () => {
  const abbrev = bookFixture.book.abbrev;

  beforeEach(() => {
    cy.resetDb();
    cy.seedDb({
      users: [users.alice],
      books: [bookFixture.book],
      verses: bookFixture.verses,
    });
  });

  it("anonymous sees the book grid + auth CTA, not the feed", () => {
    cy.visit("/home");

    cy.get(`[data-testid="book-${abbrev}"]`).should("be.visible");
    cy.get('[data-testid="feed-auth-cta"]').should("be.visible");
    // The feed tab strip must not render for anonymous visitors.
    cy.get('[role="tablist"][aria-label="Filtros do feed"]').should("not.exist");

    cy.get('[data-testid="feed-auth-cta"]').contains("Criar conta").click();
    cy.location("pathname").should("eq", "/register");
  });

  it("authenticated users still get the feed, no CTA", () => {
    cy.loginAs(users.alice.email, users.alice.password);
    cy.visit("/home");

    cy.get('[role="tablist"][aria-label="Filtros do feed"]').should("be.visible");
    cy.get('[data-testid="feed-auth-cta"]').should("not.exist");
    cy.get(`[data-testid="book-${abbrev}"]`).should("be.visible");
  });
});
