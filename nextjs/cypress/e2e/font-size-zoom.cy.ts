/**
 * Accessibility font-size control now zooms the whole interface.
 *
 * The FontSizeControl writes `--bc-text-scale` to <html> (+ localStorage).
 * A global rule `body { zoom: var(--bc-text-scale, 1) }` makes that scale the
 * entire app, not just the verse text. The verse text itself is a fixed 17px
 * so it is no longer double-scaled.
 */

import users from "../fixtures/users.json";
import bookFixture from "../fixtures/book-gn.json";

describe("Accessibility — global zoom", () => {
  const abbrev = bookFixture.book.abbrev;

  beforeEach(() => {
    cy.resetDb();
    cy.seedDb({
      // chapter-v1 completed so the driver.js tutorial overlay (which sets
      // pointer-events:none on the page shell) doesn't block clicks.
      users: [{ ...users.alice, tutorialsCompleted: ["chapter-v1"] }],
      books: [bookFixture.book],
      verses: bookFixture.verses,
    });
    cy.loginAs(users.alice.email, users.alice.password);
    cy.viewport(1280, 800); // FontSizeControl is desktop-only (md:inline-flex)
  });

  function bodyZoom(): Cypress.Chainable<string> {
    return cy
      .window()
      .then(
        (win) =>
          win.getComputedStyle(win.document.body).zoom as unknown as string,
      );
  }

  it("A+ zooms the whole interface and persists across reload", () => {
    cy.visit(`/verses/${abbrev}/1`);

    bodyZoom().should("eq", "1");

    cy.findByLabelText("Aumentar tamanho do texto").click();

    bodyZoom().should("eq", "1.1");

    cy.reload();
    bodyZoom().should("eq", "1.1");

    // Reset returns the whole UI to 1.
    cy.findByLabelText("Resetar tamanho do texto").click();
    bodyZoom().should("eq", "1");
  });

  it("verse text is a fixed 17px so it is not double-scaled by the zoom", () => {
    cy.visit(`/verses/${abbrev}/1`);

    cy.get('[data-testid="verse-text"]')
      .first()
      .should("have.attr", "style")
      .and("contain", "17px")
      .and("not.contain", "var(--bc-text-scale");
  });
});
